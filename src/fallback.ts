export type FallbackReason = 'no-webgl2' | 'no-context' | 'startup-error';

const MESSAGES: Record<FallbackReason, { why: string; tips: string[] }> = {
  'no-webgl2': {
    why: 'This browser does not support WebGL 2, which the 3D view needs to draw millions of stars and satellites.',
    tips: ['Update your browser to a current version of Chrome, Edge, Firefox or Safari.'],
  },
  'no-context': {
    why: 'Your browser supports WebGL 2 but would not start it, usually because graphics acceleration is turned off or blocked.',
    tips: [
      'Turn on hardware (graphics) acceleration in your browser settings, then reload.',
      'Update your graphics drivers, or try another browser.',
      'In a remote desktop, virtual machine or locked-down browser, 3D is often unavailable.',
    ],
  },
  'startup-error': {
    why: 'The 3D view failed to start.',
    tips: ['Reload the page. If it keeps happening, try another browser or device.'],
  },
};

/** The simplified, WebGL-free version of the atlas shipped alongside the app. */
export const LITE_URL = () => `${import.meta.env.BASE_URL}atlas2d.html`;

/** Replace the page with a plain explanation. Built with the DOM (no HTML strings), so nothing here can inject markup. */
export function showFallback(root: HTMLElement, reason: FallbackReason, detail?: unknown) {
  const { why, tips } = MESSAGES[reason];
  const el = (tag: string, text?: string, cls?: string) => {
    const n = document.createElement(tag);
    if (text) n.textContent = text;
    if (cls) n.className = cls;
    return n;
  };
  const card = el('main', undefined, 'fatal panel');
  card.setAttribute('role', 'alert');
  card.append(el('h1', 'Cosmos Atlas can’t show the 3D view here'), el('p', why));
  const list = el('ul');
  for (const t of tips) list.append(el('li', t));
  card.append(list);
  const lite = el('a', 'Open the simplified 2D version', 'fatal-btn') as HTMLAnchorElement;
  lite.href = LITE_URL();
  const src = el('a', 'About this project', 'fatal-link') as HTMLAnchorElement;
  src.href = 'https://github.com/joogiebear/space';
  src.rel = 'noopener';
  card.append(el('p', 'The 2D version works in any browser and needs no graphics acceleration.'), lite, src);
  if (detail) {
    const d = el('details');
    d.append(el('summary', 'Technical details'), el('pre', String(detail instanceof Error ? detail.message : detail)));
    card.append(d);
  }
  root.replaceChildren(card);
}
