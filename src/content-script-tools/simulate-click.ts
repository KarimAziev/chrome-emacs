import type { MessageClickPayload } from '@/handlers/types';

export function simulateClick(payload: MessageClickPayload) {
  const selectors = payload.selector
    ? Array.isArray(payload.selector)
      ? payload.selector
      : [payload.selector]
    : [];

  const candidates: HTMLElement[] = [];
  selectors.forEach((sel) => {
    document.querySelectorAll(sel).forEach((node) => {
      if (node instanceof HTMLElement && !candidates.includes(node)) {
        candidates.push(node);
      }
    });
  });

  let target;

  if (payload.innerText) {
    const texts = Array.isArray(payload.innerText)
      ? payload.innerText
      : [payload.innerText];
    let bestScore = 0;

    candidates.forEach((el) => {
      const elText = el.innerText || '';
      let score = 0;
      texts.forEach((searchText) => {
        if (elText.includes(searchText)) score++;
      });
      if (score > bestScore) {
        bestScore = score;
        target = el;
      }
    });

    if (!target) {
      console.error('No element matching innerText found');
      return;
    }
  } else {
    target = candidates[0];
  }

  if (target) {
    target.dispatchEvent(
      new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        view: window,
      }),
    );
    return true;
  } else {
    console.error('No candidate element found');
    return false;
  }
}
