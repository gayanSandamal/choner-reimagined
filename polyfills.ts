

if (typeof globalThis.WeakRef === 'undefined') {
  class WeakRefPolyfill<T extends object> {
    private target: T | undefined;

    constructor(target: T) {
      this.target = target;
    }

    deref(): T | undefined {
      return this.target;
    }
  }

  globalThis.WeakRef = WeakRefPolyfill as unknown as typeof globalThis.WeakRef;
}

export {};
