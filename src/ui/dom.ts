/** Typed querySelector for the fixed DOM in index.html. */
export const $ = <T extends HTMLElement = HTMLElement>(selector: string) => document.querySelector(selector) as T;
