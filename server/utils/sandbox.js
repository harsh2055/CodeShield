// server/utils/sandbox.js
const WANDBOX_API_URL = 'https://wandbox.org/api/compile.json';

const LANGUAGE_MAP = {
  javascript: 'nodejs-18.20.4',
  typescript: 'typescript-5.6.2',
  python: 'cpython-3.14.0',
  java: 'openjdk-jdk-21+35',
  cpp: 'clang-14.0.6',
  c: 'clang-14.0.6-c',
  rust: 'rust-1.64.0',
  go: 'go-1.14.15',
  ruby: 'mruby-2.1.2',
  php: 'php-5.6.40',
  swift: 'swift-5.10.1',
  sql: 'sqlite-3.35.5',
};

const executeCodeBackend = async (language, code) => {
  const compiler = LANGUAGE_MAP[language];
  if (!compiler) throw new Error(`Execution for language '${language}' is not currently supported.`);
  
  try {
    const response = await fetch(WANDBOX_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        compiler: compiler,
        code: code,
      })
    });
    
    if (!response.ok) {
      throw new Error(`Wandbox responded with status ${response.status}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Wandbox API Error:', error.message);
    throw new Error('Sandbox execution provider failed to process the request.');
  }
};

module.exports = { executeCodeBackend };
