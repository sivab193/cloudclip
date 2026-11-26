const list = document.querySelector('#history-list');
const empty = document.querySelector('#empty');
const search = document.querySelector('#search');
const status = document.querySelector('#status');
let state = { items: [], settings: {} };

const announce = (message) => { status.textContent = ''; requestAnimationFrame(() => { status.textContent = message; }); };
const timeLabel = (iso) => new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso));
const fileUrl = (filePath) => `file://${filePath.split('/').map(encodeURIComponent).join('/')}`;

function render() {
  const query = search.value.trim().toLocaleLowerCase();
  const items = state.items.filter((item) => !query || item.type === 'text' && item.text.toLocaleLowerCase().includes(query));
  list.replaceChildren();
  for (const item of items) {
    const template = document.querySelector(item.type === 'text' ? '#text-item' : '#image-item');
    const element = template.content.firstElementChild.cloneNode(true);
    element.dataset.id = item.id;
    const recentIndex = state.items.findIndex((candidate) => candidate.id === item.id);
    const shortcut = element.querySelector('.shortcut-number');
    if (recentIndex >= 0 && recentIndex < 5) shortcut.textContent = `⌥⌘${recentIndex + 1}`;
    if (item.type === 'text') element.querySelector('.item-content strong').textContent = item.text.replace(/\s+/g, ' ');
    else element.querySelector('img').src = fileUrl(item.path);
    const copyButton = element.querySelector('[data-action=copy]');
    const itemLabel = item.type === 'text' ? item.text.replace(/\s+/g, ' ').slice(0, 80) : 'screen capture';
    copyButton.setAttribute('aria-label', `Copy ${itemLabel}${recentIndex < 5 ? `, shortcut Command Option ${recentIndex + 1}` : ''}`);
    element.querySelector('.item-content small').textContent = `${item.pinned ? 'Pinned · ' : ''}${item.source} · ${timeLabel(item.createdAt)}${item.syncedAt ? ' · sent' : ''}`;
    const pin = element.querySelector('[data-action=pin]');
    if (pin) { pin.textContent = item.pinned ? 'Unpin' : 'Pin'; pin.setAttribute('aria-label', `${item.pinned ? 'Unpin' : 'Pin'} ${item.type === 'text' ? 'clip' : 'capture'}`); }
    list.append(element);
  }
  empty.hidden = state.items.length !== 0 || Boolean(query);
  document.querySelector('#clear-all').disabled = state.items.length === 0;
  document.querySelector('#monitor').checked = Boolean(state.settings.monitorClipboard);
  document.querySelector('#launch').checked = Boolean(state.settings.launchAtLogin);
  document.querySelector('#retention').value = String(state.settings.retentionDays || 30);
  document.querySelector('#max-items').value = String(state.settings.maxItems || 500);
}

async function refresh() { state = await window.cloudclip.getState(); render(); }
window.cloudclip.onChanged((next) => { state = next; render(); });
window.cloudclip.onWindowShown(({ quickPick }) => {
  showView('history');
  if (quickPick) {
    search.focus();
    search.select();
  }
});
search.addEventListener('input', render);
document.querySelector('#capture-region').addEventListener('click', () => window.cloudclip.captureRegion());
document.querySelector('#empty-capture').addEventListener('click', () => window.cloudclip.captureRegion());
document.querySelector('#capture-screen').addEventListener('click', async () => announce(await window.cloudclip.captureScreen() ? 'Screen captured locally.' : 'Capture failed. Check Screen Recording permission in System Settings.'));
document.querySelector('#clear-all').addEventListener('click', async () => { if (confirm('Delete all local clipboard history? Pinned items will also be removed.')) { await window.cloudclip.clear(); announce('Local history cleared.'); } });
list.addEventListener('click', async (event) => {
  const button = event.target.closest('button'); const item = event.target.closest('.history-item');
  if (!button || !item) return;
  const id = item.dataset.id; const action = button.dataset.action;
  if (action === 'copy') { await window.cloudclip.copy(id); announce('Copied to the Mac clipboard.'); }
  if (action === 'pin') await window.cloudclip.togglePin(id);
  if (action === 'delete') await window.cloudclip.remove(id);
  if (action === 'reveal') await window.cloudclip.revealFile(id);
  if (action === 'sync') { const result = await window.cloudclip.sendToCloudClip(id); announce(result.message); }
});

function showView(target) {
  for (const candidate of document.querySelectorAll('.nav-item')) candidate.classList.toggle('active', candidate.dataset.view === target);
  document.querySelector('#history-view').hidden = target !== 'history';
  document.querySelector('#settings-view').hidden = target !== 'settings';
}

for (const button of document.querySelectorAll('.nav-item')) button.addEventListener('click', () => {
  showView(button.dataset.view);
  document.querySelector(`#${button.dataset.view}-view h1`).focus();
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    event.preventDefault();
    void window.cloudclip.hideWindow();
    return;
  }
  if ((event.metaKey || event.ctrlKey) && event.key.toLocaleLowerCase() === 'k') {
    event.preventDefault();
    showView('history');
    search.focus();
    search.select();
  }
});

document.querySelector('#settings-form').addEventListener('change', async () => {
  await window.cloudclip.updateSettings({
    monitorClipboard: document.querySelector('#monitor').checked,
    launchAtLogin: document.querySelector('#launch').checked,
    retentionDays: document.querySelector('#retention').value,
    maxItems: document.querySelector('#max-items').value,
  });
  announce('Settings saved.');
});

refresh();
