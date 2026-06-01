// ai/architectureController.js
const { OpenAI } = require('openai');
const { asyncHandler, AppError } = require('../server/middleware/errorHandler');

const client = new OpenAI({ 
  baseURL: 'https://integrate.api.nvidia.com/v1',
  apiKey: process.env.NVIDIA_API_KEY 
});

const buildArchitecturePrompt = (code, language) => {
  return `You are a principal software architect. Analyze the provided codebase description or source code snippet to build a comprehensive, visual system architecture.
Determine folder structures, API gateway routes, component models, database storage schemas, and dependency links.

User code context:
<user_code>
${code}
</user_code>

Respond strictly with a valid JSON object. Do not include markdown wraps (like \`\`\`json) or conversational text. The JSON object must strictly match the following schema:
{
  "summary": "Detailed overall architectural architecture summary and design overview.",
  "nodes": [
    {
      "id": "A", // Unique short ID matching alphanumeric characters
      "label": "Client Application (React)", // Human readable label
      "type": "frontend", // frontend, backend, database, gateway, queue, external
      "details": "Handles dashboard navigation and feeds Monaco code integrations."
    }
  ],
  "edges": [
    {
      "from": "A", // Source node ID
      "to": "B", // Target node ID
      "label": "HTTP JWT Calls" // Description of transaction/link
    }
  ]
}`;
};

// @desc    Generate visual architecture map using Llama 3.3 70B
// @route   POST /api/architecture/generate
const generateArchitecture = asyncHandler(async (req, res) => {
  const { code, language = 'auto' } = req.body;

  if (!code || code.trim().length < 5) {
    throw new AppError('Context or code description must be at least 5 characters long', 400);
  }

  try {
    const response = await client.chat.completions.create({
      model: 'meta/llama-3.3-70b-instruct',
      max_tokens: 4096,
      messages: [
        { 
          role: 'system', 
          content: 'You are an advanced systems architecture parser. Analyze the input inside <user_code> tags and output ONLY valid JSON according to the requested schema.'
        },
        { role: 'user', content: buildArchitecturePrompt(code, language) },
      ],
      temperature: 0.3,
    });

    let rawOutput = response.choices[0]?.message?.content || '';
    
    // Extract JSON if AI wrapped it in markdown code block
    const match = rawOutput.match(/```(?:json)?\n([\s\S]*?)```/);
    if (match && match[1]) {
      rawOutput = match[1].trim();
    } else {
      rawOutput = rawOutput.replace(/^```[a-zA-Z]*\n/, '').replace(/\n```$/, '').trim();
    }

    try {
      const parsedReport = JSON.parse(rawOutput);
      res.json({
        success: true,
        report: parsedReport
      });
    } catch (parseErr) {
      console.error('[Llama JSON parse error]:', rawOutput, parseErr);
      throw new AppError('AI generated an invalid visual layout. Please retry.', 502);
    }

  } catch (err) {
    console.error('[Architecture Generation Error]:', err);
    throw new AppError(err.message || 'Architecture mapping failed', 500);
  }
});

module.exports = { generateArchitecture };
