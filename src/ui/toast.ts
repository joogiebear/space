import { $ } from './dom';

let timer: ReturnType<typeof setTimeout>;

/** Centered message with an optional sub-line. `ms` = auto-hide delay (0 = stay). */
export function toast(msg: string, sub = '', ms = 0) {
  const t = $('#toast');
  t.textContent = '';
  t.append(msg);
  if (sub) { const s = document.createElement('small'); s.textContent = sub; t.append(s); }
  t.style.display = 'block';
  clearTimeout(timer);
  if (ms) timer = setTimeout(() => { t.style.display = 'none'; }, ms);
}

export const hideToast = () => { $('#toast').style.display = 'none'; };
