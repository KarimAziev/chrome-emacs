import type { MessageClickPayload } from '@/handlers/types';

export function clickSimulator(payload: MessageClickPayload, exec: boolean) {
  const selectors = payload.selector
    ? Array.isArray(payload.selector)
      ? payload.selector
      : [payload.selector]
    : [];

  const elements = selectors.reduce((acc, selector) => {
    const nodes = Array.from(document.querySelectorAll(selector));
    acc = acc.concat(nodes);

    return acc;
  }, [] as Element[]);

  const isHTMLElement = (v: unknown): v is HTMLElement =>
    v instanceof HTMLElement;

  const candidates: HTMLElement[] = Array.from(new Set(elements)).filter(
    isHTMLElement,
  );

  let bestScore = 0;

  let target: HTMLElement | undefined;

  if (payload.innerText) {
    const texts = Array.isArray(payload.innerText)
      ? payload.innerText
      : [payload.innerText];

    candidates.forEach((el) => {
      const elText = el.innerText || '';

      let score = 0;

      texts.forEach((searchText) => {
        if (elText.includes(searchText)) {
          score++;
        }
        if (elText === searchText) {
          score++;
        }
      });

      if (score > bestScore) {
        bestScore = score;
        target = el;
      }
    });
  } else {
    target = candidates[0];
    bestScore = target ? 1 : 0;
  }

  if (exec) {
    if (target) {
      target.dispatchEvent(
        new MouseEvent('click', {
          bubbles: true,
          cancelable: true,
          view: window,
        }),
      );
    } else {
      console.error('Chrome Emacs: Element is not found');
    }
  }
  return bestScore;
}
