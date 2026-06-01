// ai/explainController.js
const { OpenAI } = require('openai');
const Explanation = require('../database/models/Explanation');
const { asyncHandler, AppError } = require('../server/middleware/errorHandler');
const { systemPrompt, buildExplainPrompt, buildDebugPrompt } = require('./prompts');

const client = new OpenAI({ 
  baseURL: 'https://integrate.api.nvidia.com/v1',
  apiKey: process.env.NVIDIA_API_KEY 
});

// @desc    Explain code using Nvidia/OpenAI API
// @route   POST /api/explain
const explainCode = asyncHandler(async (req, res) => {
  const { code, language = 'auto', level = 'beginner', modelId = 'meta/llama-3.1-8b-instruct', action = 'explain', errorMessage = '', teamId } = req.body;
  const user = req.user;



  const startTime = Date.now();

  // 2. Setup SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  // 3. Call OpenAI API with stream: true
  try {
    const userPromptContent = action === 'debug' 
      ? buildDebugPrompt({ code, language, level, errorMessage })
      : buildExplainPrompt({ code, language, level });

    const stream = await client.chat.completions.create({
      model: modelId,
      max_tokens: 4096,
      messages: [
        { role: 'system', content: systemPrompt(level) },
        { role: 'user', content: userPromptContent },
      ],
      temperature: 0.7,
      top_p: 0.8,
      stream: true,
    });

    let fullResponse = '';

    // 4. Stream chunks to client
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      if (content) {
        fullResponse += content;
        res.write(`data: ${JSON.stringify({ content })}\n\n`);
      }
    }

    const processingMs = Date.now() - startTime;

    // 5. Save to DB
    const explanation = await Explanation.create({
      user: user._id,
      teamId: teamId || undefined,
      code,
      language,
      level,
      messages: [
        { role: 'user', content: userPromptContent },
        { role: 'assistant', content: fullResponse }
      ],
      processingMs,
    });

    res.write(`data: ${JSON.stringify({ 
      done: true, 
      explanationId: explanation._id
    })}\n\n`);
    res.end();

  } catch (err) {
    console.error('[AI Stream Error]', err);
    res.write(`data: ${JSON.stringify({ error: 'AI processing failed.' })}\n\n`);
    res.end();
  }
});

// @desc    Follow-up chat on an existing explanation
// @route   POST /api/explain/:id/chat
const chatFollowUp = asyncHandler(async (req, res) => {
  const { message } = req.body;
  const user = req.user;
  const { id } = req.params;



  const explanation = await Explanation.findOne({ _id: id, user: user._id });
  if (!explanation) {
    throw new AppError('Explanation not found', 404);
  }

  // Add the new user message to the DB thread immediately
  explanation.messages.push({ role: 'user', content: message });
  await explanation.save();

  // Setup SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  try {
    // Prepare the message thread for OpenAI
    // We send the system prompt, then the entire message history
    const apiMessages = [
      { role: 'system', content: systemPrompt(explanation.level) },
      ...explanation.messages.map(m => ({ role: m.role, content: m.content }))
    ];

    const modelId = req.body.modelId || 'meta/llama-3.1-8b-instruct';

    const stream = await client.chat.completions.create({
      model: modelId,
      max_tokens: 2048,
      messages: apiMessages,
      temperature: 0.7,
      stream: true,
    });

    let fullResponse = '';
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      if (content) {
        fullResponse += content;
        res.write(`data: ${JSON.stringify({ content })}\n\n`);
      }
    }

    // Save assistant response to thread
    explanation.messages.push({ role: 'assistant', content: fullResponse });
    await explanation.save();

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err) {
    console.error('[AI Stream Error]', err);
    res.write(`data: ${JSON.stringify({ error: 'AI processing failed.' })}\n\n`);
    res.end();
  }
});

const { executeCodeBackend } = require('../server/utils/sandbox');
const { buildAgentPrompt } = require('./prompts');

// @desc    Autonomous AI Agent to fix code iteratively
// @route   POST /api/explain/agent
const autonomousFix = asyncHandler(async (req, res) => {
  let { code, language = 'auto', errorMessage = '', modelId = 'meta/llama-3.1-8b-instruct' } = req.body;
  const user = req.user;

  if (!user.canExplain()) {
    throw new AppError('Daily limit reached', 429);
  }

  // Setup SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const MAX_ITERATIONS = 3;
  let currentCode = code;
  let currentError = errorMessage;
  let success = false;
  
  try {
    for (let i = 1; i <= MAX_ITERATIONS; i++) {
      res.write(`data: ${JSON.stringify({ status: `Attempt ${i}/${MAX_ITERATIONS}: Analyzing error...` })}\n\n`);
      
      const prompt = buildAgentPrompt({ code: currentCode, language, errorMessage: currentError });
      
      const response = await client.chat.completions.create({
        model: modelId,
        max_tokens: 2048,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2,
      });

      let fixedCode = response.choices[0]?.message?.content || '';
      // Clean up markdown block if present
      fixedCode = fixedCode.replace(/^```[a-z]*\n/, '').replace(/\n```$/, '').trim();

      res.write(`data: ${JSON.stringify({ status: `Attempt ${i}/${MAX_ITERATIONS}: Testing generated fix...`, code: fixedCode })}\n\n`);
      
      // Test the code
      const runResult = await executeCodeBackend(language, fixedCode);
      const stderr = runResult.program_error || runResult.compiler_error;
      
      if (runResult.status === "0" && !stderr) {
        // Success
        success = true;
        currentCode = fixedCode;
        res.write(`data: ${JSON.stringify({ 
          status: 'Success! Code fixed.', 
          code: currentCode, 
          output: runResult.program_message || runResult.compiler_message || 'Successfully executed with no output.'
        })}\n\n`);
        break;
      } else {
        // Failed
        currentError = stderr || 'Program failed or exited with non-zero status.';
        currentCode = fixedCode;
      }
    }

    if (!success) {
      res.write(`data: ${JSON.stringify({ 
        status: 'Agent failed to fix the code after maximum iterations.',
        code: currentCode,
        error: currentError
      })}\n\n`);
    }

    await user.incrementUsage();
    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();

  } catch (err) {
    console.error('[Agent Stream Error]', err);
    res.write(`data: ${JSON.stringify({ error: 'AI Agent failed: ' + err.message })}\n\n`);
    res.end();
  }
});

module.exports = { explainCode, chatFollowUp, autonomousFix };
