const http = require('node:http');
const os = require('node:os');

const json = (response, status, body) => {
  response.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
  response.end(JSON.stringify(body));
};

const localAddress = () => {
  const candidates = [];
  for (const interfaces of Object.values(os.networkInterfaces())) {
    candidates.push(...(interfaces || []).filter((entry) => entry.family === 'IPv4' && !entry.internal).map((entry) => entry.address));
  }
  return candidates.find((address) => /^192\.168\./.test(address) || /^10\./.test(address) || /^172\.(1[6-9]|2\d|3[01])\./.test(address))
    || candidates[0] || '127.0.0.1';
};

class LocalClipboardServer {
  constructor({ list, addText, remove, onChange }) {
    this.list = list;
    this.addText = addText;
    this.remove = remove;
    this.onChange = onChange;
    this.server = null;
    this.port = null;
    this.token = null;
  }

  status() {
    return {
      running: Boolean(this.server),
      url: this.server ? `http://${localAddress()}:${this.port}` : null,
      port: this.port,
      token: this.server ? this.token : null,
    };
  }

  async start(port, token) {
    await this.stop();
    this.port = Math.min(65535, Math.max(1024, Number(port) || 8765));
    this.token = token;
    this.server = http.createServer((request, response) => void this.handle(request, response));
    await new Promise((resolve, reject) => {
      this.server.once('error', reject);
      this.server.listen(this.port, '0.0.0.0', resolve);
    });
    return this.status();
  }

  async stop() {
    if (!this.server) return this.status();
    const current = this.server;
    this.server = null;
    await new Promise((resolve) => current.close(resolve));
    return this.status();
  }

  authorized(request) {
    return request.headers.authorization === `Bearer ${this.token}`;
  }

  async handle(request, response) {
    if (request.method === 'GET' && request.url === '/health') return json(response, 200, { ok: true, name: 'CloudClip' });
    if (!this.authorized(request)) return json(response, 401, { error: 'Pairing token required' });
    if (request.method === 'GET' && request.url === '/clips') {
      const items = this.list().items.filter((item) => item.type === 'text').slice(0, 100).map((item) => ({ ...item, content: item.text }));
      return json(response, 200, items);
    }
    if (request.method === 'POST' && request.url === '/clips') {
      let raw = '';
      for await (const chunk of request) {
        raw += chunk;
        if (raw.length > 1_000_000) return json(response, 413, { error: 'Clip is too large' });
      }
      try {
        const body = JSON.parse(raw || '{}');
        if (typeof body.text !== 'string' || !body.text.trim()) return json(response, 400, { error: 'Text is required' });
        const item = this.addText(body.text, body.deviceName ? `LAN · ${String(body.deviceName).slice(0, 80)}` : 'LAN');
        this.onChange();
        return json(response, 201, { ...item, content: item.text });
      } catch { return json(response, 400, { error: 'Invalid JSON' }); }
    }
    if (request.method === 'DELETE' && request.url === '/clips') {
      this.list().items.filter((item) => item.type === 'text').forEach((item) => this.remove(item.id));
      this.onChange();
      return json(response, 200, { ok: true });
    }
    const match = request.method === 'DELETE' && request.url?.match(/^\/clips\/([^/]+)$/);
    if (match) {
      const removed = this.remove(decodeURIComponent(match[1]));
      this.onChange();
      return json(response, removed ? 200 : 404, { ok: Boolean(removed) });
    }
    return json(response, 404, { error: 'Not found' });
  }
}

module.exports = { LocalClipboardServer, localAddress };
