const test = require('node:test');
const assert = require('node:assert/strict');
const net = require('node:net');
const { LocalClipboardServer } = require('../src/local-server');

const freePort = () => new Promise((resolve) => {
  const probe = net.createServer();
  probe.listen(0, '127.0.0.1', () => {
    const { port } = probe.address();
    probe.close(() => resolve(port));
  });
});

test('local server requires a token and shares text clips', async (context) => {
  const items = [];
  const server = new LocalClipboardServer({
    list: () => ({ items }),
    addText: (text, source) => { const item = { id: String(items.length + 1), type: 'text', text, content: text, source }; items.unshift(item); return item; },
    remove: (id) => { const index = items.findIndex((item) => item.id === id); if (index < 0) return false; items.splice(index, 1); return true; },
    onChange: () => {},
  });
  context.after(() => server.stop());
  const port = await freePort();
  await server.start(port, 'pair-me');
  const url = `http://127.0.0.1:${port}`;
  assert.equal((await fetch(`${url}/clips`)).status, 401);
  const created = await fetch(`${url}/clips`, { method: 'POST', headers: { Authorization: 'Bearer pair-me', 'Content-Type': 'application/json' }, body: JSON.stringify({ text: 'hello', deviceName: 'Android' }) });
  assert.equal(created.status, 201);
  const clips = await (await fetch(`${url}/clips`, { headers: { Authorization: 'Bearer pair-me' } })).json();
  assert.equal(clips[0].text, 'hello');
  assert.equal((await fetch(`${url}/clips/1`, { method: 'DELETE', headers: { Authorization: 'Bearer pair-me' } })).status, 200);
});
