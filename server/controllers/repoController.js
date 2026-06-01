// server/controllers/repoController.js
const { OpenAI } = require('openai');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const { buildRepoPrompt } = require('../../ai/prompts');

const client = new OpenAI({ 
  baseURL: 'https://integrate.api.nvidia.com/v1',
  apiKey: process.env.NVIDIA_API_KEY 
});

const analyzeRepo = asyncHandler(async (req, res) => {
  const { url, modelId = 'meta/llama-3.1-8b-instruct' } = req.body;
  
  if (!url) {
    throw new AppError('GitHub URL is required', 400);
  }

  // Parse GitHub URL
  // e.g. https://github.com/expressjs/express
  const match = url.match(/github\.com\/([^/]+)\/([^/]+)/);
  if (!match) {
    throw new AppError('Invalid GitHub URL. Must be in format https://github.com/owner/repo', 400);
  }

  const owner = match[1];
  let repo = match[2];
  if (repo.endsWith('.git')) {
    repo = repo.replace('.git', '');
  }

  // Fetch default branch
  let defaultBranch = 'main';
  try {
    const repoInfoRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`);
    if (repoInfoRes.ok) {
      const repoInfo = await repoInfoRes.json();
      defaultBranch = repoInfo.default_branch;
    }
  } catch (err) {
    console.error('Failed to fetch repo info:', err.message);
  }

  // Fetch Tree
  let treeText = '';
  try {
    const treeRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees/${defaultBranch}?recursive=1`);
    if (!treeRes.ok) throw new Error('Failed to fetch tree');
    const treeData = await treeRes.json();
    
    // Convert tree array to a simplified text structure (limit to 1000 files to save tokens)
    const files = treeData.tree
      .filter(t => t.type === 'blob')
      .map(t => t.path)
      .slice(0, 1000);
      
    treeText = files.join('\n');
  } catch (err) {
    throw new AppError('Could not fetch repository structure. Ensure it is public.', 404);
  }

  // Fetch README
  let readmeText = '';
  try {
    const readmeRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/readme`, {
      headers: { 'Accept': 'application/vnd.github.v3.raw' }
    });
    if (readmeRes.ok) {
      readmeText = await readmeRes.text();
      // truncate readme to ~3000 chars to save tokens
      readmeText = readmeText.substring(0, 3000);
    }
  } catch (err) {
    // README is optional
  }

  // Setup SSE
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
    console.error('[Repo Analysis Error]', err);
    res.write(`data: ${JSON.stringify({ error: 'AI processing failed.' })}\n\n`);
    res.end();
  }
});

module.exports = { analyzeRepo };
