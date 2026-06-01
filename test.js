async function testWandbox() {
  const response = await fetch('https://wandbox.org/api/compile.json', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ compiler: 'nodejs-18.20.4', code: 'console.log("Hello")' })
  });
  console.log(response.status);
  console.log(await response.text());
}
testWandbox();
