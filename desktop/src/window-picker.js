const grid = document.querySelector('#windows');
const template = document.querySelector('#window-card');
const status = document.querySelector('#status');

window.windowPicker.onSources((sources) => {
  grid.replaceChildren();
  for (const source of sources) {
    const item = template.content.firstElementChild.cloneNode(true);
    const card = item.querySelector('.window-card');
    card.dataset.id = source.id;
    card.querySelector('.preview').src = source.thumbnail;
    card.querySelector('.preview').alt = `Preview of ${source.name}`;
    card.querySelector('strong').textContent = source.name;
    card.setAttribute('aria-label', `Capture ${source.name}`);
    if (source.icon) card.querySelector('.app-icon').src = source.icon;
    grid.append(item);
  }
  status.textContent = `${sources.length} open ${sources.length === 1 ? 'window' : 'windows'} available`;
  grid.querySelector('button')?.focus();
});

grid.addEventListener('click', (event) => {
  const card = event.target.closest('.window-card');
  if (card) window.windowPicker.select(card.dataset.id);
});
document.querySelector('#cancel').addEventListener('click', () => window.windowPicker.cancel());
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') window.windowPicker.cancel();
});
