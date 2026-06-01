// server/controllers/repoController.js
const { OpenAI } = require('openai');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const { buildRepoPrompt } = require('../../ai/prompts');

const client = new OpenAI({ 
  baseURL: 'https://integrate.api.nvidia.com/v1',
  apiKey: process.env.NVIDIA_API_KEY 
});

/**
 * Build GitHub API headers.
 * Uses GITHUB_TOKEN if set (5000 req/hr), otherwise unauthenticated (60 req/hr).
 */
const githubHeaders = () => {
  const headers = {
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'CodeLens-App',
  };
  if (process.env.GITHUB_TOKEN) {
    headers['Authorization'] = `Bearer ${process.env.GITHUB_TOKEN}`;
  }
  return headers;
};

const analyzeRepo = asyncHandler(async (req, res) => {
  const { url, modelId = 'meta/llama-3.1-8b-instruct' } = req.body;
  
  if (!url) {
    throw new AppError('GitHub URL is required', 400);
  }

  // Parse GitHub URL — e.g. https://github.com/expressjs/express
  const match = url.match(/github\.com\/([^/]+)\/([^/?#]+)/);
  if (!match) {
    throw new AppError('Invalid GitHub URL. Must be in format https://github.com/owner/repo', 400);
  }

  const owner = match[1];
  let repo = match[2].replace(/\.git$/, '');

  console.log(`[Repo Analysis] Fetching: ${owner}/${repo}`);

  // 1. Fetch repo info (default branch)
  let defaultBranch = 'main';
  try {
    const repoInfoRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}`,
      { headers: githubHeaders() }
    );
    if (repoInfoRes.ok) {
      const repoInfo = await repoInfoRes.json();
      defaultBranch = repoInfo.default_branch || 'main';
      console.log(`[Repo Analysis] Default branch: ${defaultBranch}`);
    } else {
      const errBody = await repoInfoRes.json().catch(() => ({}));
      console.error(`[Repo Analysis] Repo info error ${repoInfoRes.status}:`, errBody.message);
      
      if (repoInfoRes.status === 404) {
        throw new AppError(`Repository "${owner}/${repo}" not found. Check the URL and ensure the repo is public.`, 404);
      }
      if (repoInfoRes.status === 403 || repoInfoRes.status === 429) {
        throw new AppError('GitHub API rate limit exceeded. Please try again in a few minutes.', 429);
      }
    }
  } catch (err) {
    if (err.statusCode) throw err; // Re-throw AppErrors
    console.error('[Repo Analysis] Failed to fetch repo info:', err.message);
  }

  // 2. Fetch file tree
  let treeText = '';
  const treeRes = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/git/trees/${defaultBranch}?recursive=1`,
    { headers: githubHeaders() }
  );

  if (!treeRes.ok) {
    const errBody = await treeRes.json().catch(() => ({}));
    console.error(`[Repo Analysis] Tree fetch error ${treeRes.status}:`, errBody.message);

    if (treeRes.status === 404) {
      throw new AppError(`Could not find the repository tree. The repo "${owner}/${repo}" may be empty or the branch "${defaultBranch}" doesn't exist.`, 404);
    }
    if (treeRes.status === 403 || treeRes.status === 429) {
      throw new AppError('GitHub API rate limit exceeded. Please try again in a few minutes, or add a GITHUB_TOKEN env variable.', 429);
    }
    throw new AppError(`GitHub API error (${treeRes.status}): ${errBody.message || 'Could not fetch repository structure.'}`, 502);
  }

  const treeData = await treeRes.json();
  const files = (treeData.tree || [])
    .filter(t => t.type === 'blob')
    .map(t => t.path)
    .slice(0, 1000);

  treeText = files.join('\n');
  console.log(`[Repo Analysis] Found ${files.length} files`);

  // 3. Fetch README (optional)
  let readmeText = '';
  try {
    const readmeRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/readme`,
      { headers: { ...githubHeaders(), 'Accept': 'application/vnd.github.v3.raw' } }
    );
    if (readmeRes.ok) {
      readmeText = (await readmeRes.text()).substring(0, 3000);
    }
  } catch (err) {
    // README is optional — ignore
  }

  // 4. Stream AI response via SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  try {
    const prompt = buildRepoPrompt({ owner, repo, treeText, readmeText });

    const stream = await client.chat.completions.create({
      model: modelId,
      max_tokens: 4096,
      messages: [
        { role: 'system', content: 'You are an expert Principal Software Architect.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      if (content) {
        res.write(`data: ${JSON.stringify({ content })}\n\n`);
      }
    }

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err) {
    console.error('[Repo Analysis] AI error:', err.message);
    res.write(`data: ${JSON.stringify({ error: 'AI processing failed: ' + err.message })}\n\n`);
    res.end();
  }
});

module.exports = { analyzeRepo };
