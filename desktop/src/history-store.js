const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const DEFAULT_SETTINGS = Object.freeze({
  monitorClipboard: true,
  launchAtLogin: false,
  retentionDays: 30,
  maxItems: 500,
});

const hash = (value) => crypto.createHash('sha256').update(value).digest('hex');

class HistoryStore {
  constructor(rootDirectory) {
    this.root = rootDirectory;
    this.file = path.join(rootDirectory, 'history.json');
    this.captureDirectory = path.join(rootDirectory, 'captures');
    fs.mkdirSync(this.captureDirectory, { recursive: true });
    this.state = this.read();
    this.prune();
  }

  read() {
    try {
      const parsed = JSON.parse(fs.readFileSync(this.file, 'utf8'));
      return {
        items: Array.isArray(parsed.items) ? parsed.items : [],
        settings: { ...DEFAULT_SETTINGS, ...(parsed.settings || {}) },
      };
    } catch {
      return { items: [], settings: { ...DEFAULT_SETTINGS } };
    }
  }

  persist() {
    fs.mkdirSync(this.root, { recursive: true });
    const temporary = `${this.file}.tmp`;
    fs.writeFileSync(temporary, JSON.stringify(this.state, null, 2), { mode: 0o600 });
    fs.renameSync(temporary, this.file);
  }

  list() {
    return { items: [...this.state.items], settings: { ...this.state.settings }, storageDirectory: this.root };
  }

  addText(text, source = 'clipboard') {
    if (typeof text !== 'string' || !text.trim()) return null;
    const digest = hash(`text:${text}`);
    const existing = this.state.items.find((item) => item.hash === digest);
    if (existing) {
      existing.createdAt = new Date().toISOString();
      existing.source = source;
      this.sortAndPersist();
      return existing;
    }
    const item = {
      id: crypto.randomUUID(), type: 'text', text, hash: digest, source,
      pinned: false, createdAt: new Date().toISOString(), syncedAt: null,
    };
    this.state.items.unshift(item);
    this.prune();
    this.persist();
    return item;
  }

  addImage(buffer, source = 'clipboard') {
    if (!Buffer.isBuffer(buffer) || buffer.length === 0) return null;
    const digest = hash(buffer);
    const existing = this.state.items.find((item) => item.hash === digest);
    if (existing) {
      existing.createdAt = new Date().toISOString();
      existing.source = source;
      this.sortAndPersist();
      return existing;
    }
    const id = crypto.randomUUID();
    const filePath = path.join(this.captureDirectory, `${id}.png`);
    fs.writeFileSync(filePath, buffer, { mode: 0o600 });
    const item = {
      id, type: 'image', path: filePath, hash: digest, source,
      pinned: false, createdAt: new Date().toISOString(), syncedAt: null,
    };
    this.state.items.unshift(item);
    this.prune();
    this.persist();
    return item;
  }

  updateSettings(next) {
    const retentionDays = Math.min(365, Math.max(1, Number(next.retentionDays) || DEFAULT_SETTINGS.retentionDays));
    const maxItems = Math.min(5000, Math.max(25, Number(next.maxItems) || DEFAULT_SETTINGS.maxItems));
    this.state.settings = {
      ...this.state.settings,
      monitorClipboard: Boolean(next.monitorClipboard),
      launchAtLogin: Boolean(next.launchAtLogin),
      retentionDays,
      maxItems,
    };
    this.prune();
    this.persist();
    return { ...this.state.settings };
  }

  togglePin(id) {
    const item = this.state.items.find((candidate) => candidate.id === id);
    if (!item) return null;
    item.pinned = !item.pinned;
    this.sortAndPersist();
    return item;
  }

  markSynced(id) {
    const item = this.state.items.find((candidate) => candidate.id === id);
    if (!item) return null;
    item.syncedAt = new Date().toISOString();
    this.persist();
    return item;
  }

  remove(id) {
    const item = this.state.items.find((candidate) => candidate.id === id);
    if (!item) return false;
    if (item.path) {
      try { fs.unlinkSync(item.path); } catch { /* already removed */ }
    }
    this.state.items = this.state.items.filter((candidate) => candidate.id !== id);
    this.persist();
    return true;
  }

  clear() {
    for (const item of this.state.items) {
      if (item.path) {
        try { fs.unlinkSync(item.path); } catch { /* already removed */ }
      }
    }
    this.state.items = [];
    this.persist();
  }

  prune(now = Date.now()) {
    const threshold = now - this.state.settings.retentionDays * 86_400_000;
    const keep = [];
    for (const item of this.state.items) {
      const expired = !item.pinned && new Date(item.createdAt).getTime() < threshold;
      const overLimit = !item.pinned && keep.filter((candidate) => !candidate.pinned).length >= this.state.settings.maxItems;
      if (expired || overLimit) {
        if (item.path) {
          try { fs.unlinkSync(item.path); } catch { /* already removed */ }
        }
      } else keep.push(item);
    }
    this.state.items = keep;
  }

  sortAndPersist() {
    this.state.items.sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.createdAt.localeCompare(a.createdAt));
    this.persist();
  }
}

module.exports = { HistoryStore, DEFAULT_SETTINGS, hash };
