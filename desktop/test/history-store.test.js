const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { HistoryStore } = require('../src/history-store');

const createStore = () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'cloudclip-test-'));
  return { root, store: new HistoryStore(root) };
};

test('stores text locally and deduplicates repeated copies', () => {
  const { root, store } = createStore();
  const first = store.addText('hello');
  const second = store.addText('hello');
  assert.equal(first.id, second.id);
  assert.equal(store.list().items.length, 1);
  assert.equal(store.list().items[0].text, 'hello');
  fs.rmSync(root, { recursive: true, force: true });
});

test('stores image bytes in the local captures directory', () => {
  const { root, store } = createStore();
  const item = store.addImage(Buffer.from('png bytes'), 'region capture');
  assert.equal(item.type, 'image');
  assert.equal(fs.readFileSync(item.path, 'utf8'), 'png bytes');
  store.remove(item.id);
  assert.equal(fs.existsSync(item.path), false);
  fs.rmSync(root, { recursive: true, force: true });
});

test('keeps pinned items while pruning expired history', () => {
  const { root, store } = createStore();
  const old = store.addText('old');
  store.togglePin(old.id);
  store.state.items[0].createdAt = '2020-01-01T00:00:00.000Z';
  store.prune(new Date('2026-01-01T00:00:00.000Z').getTime());
  assert.equal(store.list().items.length, 1);
  fs.rmSync(root, { recursive: true, force: true });
});

test('normalizes retention settings to safe bounds', () => {
  const { root, store } = createStore();
  const settings = store.updateSettings({ monitorClipboard: false, launchAtLogin: true, retentionDays: 0, maxItems: 999999 });
  assert.equal(settings.monitorClipboard, false);
  assert.equal(settings.launchAtLogin, true);
  assert.equal(settings.retentionDays, 30);
  assert.equal(settings.maxItems, 5000);
  fs.rmSync(root, { recursive: true, force: true });
});
