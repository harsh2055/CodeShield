// ai/refactorController.js
const { OpenAI } = require('openai');
const { asyncHandler, AppError } = require('../server/middleware/errorHandler');

const client = new OpenAI({ 
  baseURL: 'https://integrate.api.nvidia.com/v1',
  apiKey: process.env.NVIDIA_API_KEY 
});

const buildRefactorPrompt = (code, language, mode) => {
  const modeDescriptions = {
    clean: 'Clean Code: Focus on industry standard best practices, SOLID principles, clean architecture, elimination of dead code, and modularity.',
    performance: 'Performance Optimization: Focus on algorithmic efficiency, execution speed, reducing memory consumption, caching, and loop optimization.',
    security: 'Security Optimization: Focus on sanitizing inputs, escaping parameters, removing potential security exploits (like XSS, SQLi, shell execution), and hardening endpoints.',
    readability: 'Readability Enhancement: Focus on meaningful variable naming, expressive structures, simplifying complex nested logic or conditionals, and adding concise, high-value documentation comments.',
    modern: 'Modern Syntax Conversion: Convert deprecated patterns or legacy constructs into modern, expressive syntax (e.g., callbacks to async/await, var to const/let, ES6 modern utilities).'
  };

  const selectedMode = modeDescriptions[mode] || modeDescriptions.clean;

  return `You are a principal software engineer and expert code refactoring tool. Refactor the provided code snippet to match the target criteria.
Refactoring Mode: ${selectedMode}

User code language: ${language}

<user_code>
${code}
</user_code>

Respond strictly with a valid JSON object. Do not include markdown wraps (like \`\`\`json) or conversational text. The JSON object must strictly match the following schema:
{
  "refactoredCode": "The complete rewritten, valid refactored source code block. Do not truncate this code block under any circumstances.",
  "improvements": [
    "Improved variable naming inside loop for better clarity.",
    "Refactored nested loops to $O(N)$ lookup using an object map."
  ],
  "complexityBefore": "O(N^2)",
  "complexityAfter": "O(N)",
  "performanceGain": "Estimated 85% execution speed improvement by avoiding nested loop lookup."
}`;
};

// @desc    Refactor code using DeepSeek Coder NIM
// @route   POST /api/refactor
const refactorCode = asyncHandler(async (req, res) => {
  const { code, language = 'auto', mode = 'clean' } = req.body;

  if (!code || code.trim().length < 5) {
    throw new AppError('Code must be at least 5 characters long', 400);
  }

  try {
    const response = await client.chat.completions.create({
      model: 'deepseek-ai/deepseek-coder-33b-instruct',
      max_tokens: 4096,
      messages: [
        { 
          role: 'system', 
          content: 'You are a precise code refactoring engine. Analyze the code inside <user_code> tags and output ONLY valid JSON according to the requested schema. Preserve the original functionality perfectly and never truncate the output code.'
        },
        { role: 'user', content: buildRefactorPrompt(code, language, mode) },
      ],
      temperature: 0.2,
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
      console.error('[DeepSeek JSON parse error]:', rawOutput, parseErr);
      throw new AppError('AI generated an invalid refactoring report. Please retry.', 502);
    }

  } catch (err) {
    console.error('[Refactoring Scan Error]:', err);
    throw new AppError(err.message || 'Refactoring failed', 500);
  }
});

module.exports = { refactorCode };
