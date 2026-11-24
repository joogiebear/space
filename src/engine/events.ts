/** Tiny typed event emitter. Keeps the engine free of UI imports: the UI subscribes instead. */
export interface Emitter<A extends unknown[]> {
  on(fn: (...args: A) => void): void;
  emit(...args: A): void;
}

export function emitter<A extends unknown[] = []>(): Emitter<A> {
  const subs: ((...args: A) => void)[] = [];
  return {
    on: fn => { subs.push(fn) },
    emit: (...args) => { for (const fn of subs) fn(...args) },
  };
}
