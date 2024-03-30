export class DebouncedWindowEventListener<Name extends keyof WindowEventMap> {
  private listener: ((ev: WindowEventMap[Name]) => void) | null = null;
  name: Name;

  constructor(name: Name) {
    this.name = name;
  }

  private debounce<T extends (...args: any[]) => void>(
    func: T,
    waitFor: number,
  ): (...args: Parameters<T>) => void {
    let timeout: number | undefined;

    return (...args: Parameters<T>): void => {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };

      clearTimeout(timeout);
      timeout = window.setTimeout(later, waitFor);
    };
  }

  waitOnce(
    ms: number,
    options?: boolean | AddEventListenerOptions,
  ): Promise<WindowEventMap[Name]> {
    return new Promise((resolve) => {
      this.clear();

      const fn = (ev: WindowEventMap[Name]) => {
        this.clear();
        resolve(ev);
      };

      this.listener = this.debounce(fn, ms);

      window.addEventListener(this.name, this.listener, options);
    });
  }

  clear() {
    if (this.listener) {
      window.removeEventListener(this.name, this.listener);
      this.listener = null;
    }
  }
}
