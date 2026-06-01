// client/src/utils/sandboxApi.js
import axios from 'axios';

/**
 * Execute code via our internal backend proxy to Wandbox
 * @param {string} code - The source code to execute
 * @param {string} language - The programming language
 * @returns {Promise<{ stdout: string, stderr: string, code: number }>}
 */
export const executeCode = async (code, language) => {
  try {
    const response = await axios.post('/api/sandbox/execute', {
      language: language,
      code: code,
    });

    const runResult = response.data;
    
    return {
      stdout: runResult.program_message || runResult.compiler_message || '',
      stderr: runResult.program_error || runResult.compiler_error || '',
      code: runResult.status,
    };
  } catch (error) {
    console.error('Sandbox Execution Error:', error);
    const msg = error.response?.data?.error || error.message || 'Unknown error';
    throw new Error(msg);
  }
};
