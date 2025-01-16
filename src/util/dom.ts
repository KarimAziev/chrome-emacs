export function getCssSelector(el: Element): string | undefined {
  let path: string[] = [];
  while (el.nodeType === Node.ELEMENT_NODE) {
    let selector: string = el.nodeName.toLowerCase();
    if (el.id) {
      const escapedId = el.id.replace(/^(\d)/, '\\3$1 ').replace(/:/g, '\\:');
      selector += '#' + escapedId;
      path.unshift(selector);
      break;
    } else {
      let sib: Element | null = el;
      let nth: number = 1;
      while ((sib = sib.previousElementSibling)) {
        if (sib.nodeName.toLowerCase() === selector) nth++;
      }
      if (nth !== 1) selector += `:nth-of-type(${nth})`;
    }
    path.unshift(selector);
    el = el.parentNode as Element;
  }
  return path.length ? path.join(' > ') : undefined;
}

export const isElementVisible = (elem: Element) => {
  const rect = elem.getBoundingClientRect();
  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <=
      (window.innerHeight || document.documentElement.clientHeight) &&
    rect.right <= (window.innerWidth || document.documentElement.clientWidth)
  );
};

export const isContentEditableElement = (
  el: any,
): el is ElementContentEditable => el?.isContentEditable;

export const isElementTag = (tagName: string, element: Element) =>
  element?.tagName?.toLowerCase() === tagName;

function getCssSelectorsOfEditable() {
  return 'textarea, [contenteditable], *[contenteditable=true], *[role=textbox], div.ace_cursor';
}

export const scrollToElementIfNotVisible = (elem: Element) => {
  if (!isElementVisible(elem)) {
    elem.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
};

export const scrollAndFocus = (element: Element) => {
  scrollToElementIfNotVisible(element);

  if ((element as HTMLTextAreaElement).focus) {
    (element as HTMLTextAreaElement).focus();
  }
};

export function animate({
  timing,
  draw,
  duration,
}: {
  duration: number;
  draw: (v: number) => void;
  timing: (v: number) => number;
}) {
  const start = performance.now();

  requestAnimationFrame(function worker(time) {
    const timeFraction = Math.max((time - start) / duration, 1);
    const progress = timing(timeFraction);

    draw(progress);

    if (timeFraction < 1) {
      requestAnimationFrame(worker);
    }
  });
}

export const addStyle = <Elem extends HTMLElement>(
  elem: Elem,
  style: Partial<{
    [K in keyof CSSStyleDeclaration as CSSStyleDeclaration[K] extends string
      ? K
      : never]: CSSStyleDeclaration[K];
  }>,
) => {
  (Object.keys(style) as (keyof typeof style)[]).forEach((key) => {
    const value = style[key];
    if (value) {
      elem.style[key] = value;
    }
  });
  return elem;
};

export const normalizeRect = (rect?: DOMRect) => {
  if (!rect) {
    return;
  }
  const keys = [
    'x',
    'y',
    'width',
    'height',
    'top',
    'right',
    'bottom',
    'left',
  ] as const;
  return keys.reduce(
    (acc, key) => {
      acc[key] = Math.trunc(rect[key]);
      return acc;
    },
    {} as Record<keyof DOMRect, number>,
  );
};

export function setSelectionRange(
  textarea: HTMLTextAreaElement,
  selectionStart: number,
  selectionEnd: number,
) {
  const fullText = textarea.value;
  textarea.value = fullText.substring(0, selectionEnd);

  const scrollHeight = textarea.scrollHeight;
  textarea.value = fullText;
  let scrollTop = scrollHeight;
  const textareaHeight = textarea.clientHeight;
  if (scrollTop > textareaHeight) {
    scrollTop -= textareaHeight / 2;
  } else {
    scrollTop = 0;
  }
  textarea.scrollTop = scrollTop;

  textarea.setSelectionRange(selectionStart, selectionEnd);
}

export const estimateParent = <El extends Element>(elem: El) => {
  const editableElemsSelector = getCssSelectorsOfEditable();
  const parent = elem.parentElement;
  if (parent?.querySelectorAll(editableElemsSelector).length === 1) {
    return parent;
  }
  return elem;
};

export function hasClassWithPrefix(element: HTMLElement, prefix: string) {
  return Array.from(element.classList).some((className) =>
    className.startsWith(prefix),
  );
}

export function isValidHTML(htmlString: string): boolean {
  const parser = new DOMParser();
  const parsedDocument = parser.parseFromString(htmlString, 'text/html');

  const htmlContent = parsedDocument.body.innerHTML.trim();
  return htmlContent.length > 0 && htmlContent !== htmlString;
}
