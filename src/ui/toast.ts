import { ui } from './store';

let timer: ReturnType<typeof setTimeout>;

/** Centered message with an optional sub-line. `ms` = auto-hide delay (0 = stay). */
export function toast(msg: string, sub = '', ms = 0) {
  ui.toast.msg = msg; ui.toast.sub = sub; ui.toast.visible = true;
  clearTimeout(timer);
  if (ms) timer = setTimeout(() => { ui.toast.visible = false; }, ms);
}

export const hideToast = () => { ui.toast.visible = false; };
/** True while the visible toast is the "data failed to load" one. */
export const toastIsError = () => ui.toast.visible && ui.toast.msg.includes('failed');
