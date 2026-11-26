const selection = document.querySelector('#selection');
let start = null;
const point = (event) => ({ x: event.clientX, y: event.clientY });
window.addEventListener('pointerdown', (event) => {
  start = point(event); selection.hidden = false; selection.style.left = `${start.x}px`; selection.style.top = `${start.y}px`; selection.style.width = '0'; selection.style.height = '0';
});
window.addEventListener('pointermove', (event) => {
  if (!start) return;
  const current = point(event); const x = Math.min(start.x,current.x); const y = Math.min(start.y,current.y);
  selection.style.left=`${x}px`; selection.style.top=`${y}px`; selection.style.width=`${Math.abs(current.x-start.x)}px`; selection.style.height=`${Math.abs(current.y-start.y)}px`;
});
window.addEventListener('pointerup', (event) => {
  if (!start) return;
  const current=point(event); window.captureOverlay.complete({x:Math.min(start.x,current.x),y:Math.min(start.y,current.y),width:Math.abs(current.x-start.x),height:Math.abs(current.y-start.y)}); start=null;
});
window.addEventListener('keydown', (event) => { if (event.key === 'Escape') window.captureOverlay.cancel(); });
