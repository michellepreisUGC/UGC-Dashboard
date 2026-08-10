export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

export const eur = (n) => (Number(n) || 0).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });

export const todayISO = () => new Date().toISOString().slice(0, 10);

export const fmtDate = (iso) => {
  if (!iso) return '';
  const d = new Date(iso + 'T00:00:00');
  if (isNaN(d)) return iso;
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

export const addDays = (iso, days) => {
  const d = new Date(iso + 'T00:00:00');
  d.setDate(d.getDate() + Number(days || 0));
  return d.toISOString().slice(0, 10);
};

export function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') node.className = v;
    else if (k === 'html') node.innerHTML = v;
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
    else node.setAttribute(k, v);
  }
  for (const c of [].concat(children)) {
    if (c == null) continue;
    node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
  }
  return node;
}

export function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.remove('hidden');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => t.classList.add('hidden'), 2400);
}

export function openModal(contentNode) {
  const backdrop = document.getElementById('modalBackdrop');
  const box = document.getElementById('modalBox');
  box.innerHTML = '';
  box.appendChild(contentNode);
  backdrop.classList.remove('hidden');
  const closeOnBackdrop = (e) => { if (e.target === backdrop) closeModal(); };
  backdrop.addEventListener('click', closeOnBackdrop, { once: true });
}

export function closeModal() {
  document.getElementById('modalBackdrop').classList.add('hidden');
}
