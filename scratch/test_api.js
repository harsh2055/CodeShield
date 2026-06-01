const { OpenAI } = require('openai');
require('dotenv').config({ path: '.env' });

const client = new OpenAI({ 
  baseURL: 'https://integrate.api.nvidia.com/v1',
  apiKey: process.env.NVIDIA_API_KEY 
});

async function test() {
  try {
    const aiResponse = await client.chat.completions.create({
      model: 'meta/llama-3.1-8b-instruct',
      max_tokens: 1024,
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant.',
        },
        {
          role: 'user',
          content: 'Explain this code: console.log("hello");',
        },
      ],
      temperature: 0.7,
      top_p: 0.8
    });
    console.log("Success!");
    console.log(aiResponse.choices[0]?.message?.content);
  } catch (err) {
    console.error("Error Name:", err.name);
    console.error("Error Status:", err.status || err.statusCode);
    console.error("Error Message:", err.message);
    if (err.response) {
      console.error("Response Data:", err.response.data);
    }
  }
}

test();
