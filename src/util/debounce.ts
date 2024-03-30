export function debounce<T extends (...args: any[]) => void>(
  func: T,
  waitFor: number,
): (...args: Parameters<T>) => void {
  let timeout: number | undefined;

  return (...args: Parameters<T>): void => {
    let later = () => {
      clearTimeout(timeout);
      func(...args);
    };

    clearTimeout(timeout);
    timeout = window.setTimeout(later, waitFor);
  };
}
