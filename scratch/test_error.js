const { BadRequestError } = require('openai/error');

try {
  throw new BadRequestError(400, { error: { message: "Invalid payload" } }, "Invalid payload", {});
} catch (err) {
  console.log("Original name:", err.name);
  console.log("Original statusCode:", err.status || err.statusCode);
  err.name = 'OpenAIError';
  console.log("New name:", err.name);
}
