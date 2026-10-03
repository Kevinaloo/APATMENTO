/* One observable state object for the whole shell. Widgets subscribe once,
   get the full state plus the set of keys that changed, and touch the DOM
   only for those keys. */
export type Store<S> = {
  get(): S;
  set(patch: Partial<S>): void;
  /** Calls fn now with every key marked changed, then on each change. */
  on(fn: (state: S, changed: ReadonlySet<keyof S>) => void): void;
};

export function createStore<S extends object>(initial: S): Store<S> {
  let state = initial;
  const subs: ((s: S, c: ReadonlySet<keyof S>) => void)[] = [];
  return {
    get: () => state,
    set(patch) {
      const changed = new Set<keyof S>();
      for (const k of Object.keys(patch) as (keyof S)[]) if (!Object.is(state[k], patch[k])) changed.add(k);
      if (!changed.size) return;
      state = { ...state, ...patch };
      for (const fn of subs) fn(state, changed);
    },
    on(fn) {
      subs.push(fn);
      fn(state, new Set(Object.keys(state) as (keyof S)[]));
    },
  };
}
