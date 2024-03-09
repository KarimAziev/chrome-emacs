export function getCssSelector(el: Element): string | undefined {
  let path: string[] = [];
  while (el.nodeType === Node.ELEMENT_NODE) {
    let selector: string = el.nodeName.toLowerCase();
    if (el.id) {
      selector += '#' + el.id;
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

export const findAncestorWithClass = <Elem extends HTMLElement>(
  elem: Elem,
  className: string,
): Elem | null => {
  let el: HTMLElement | null = elem;
  while (el && !el.classList.contains(className)) {
    el = el.parentElement;
  }
  return el as Elem | null;
};

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

export const findTheBiggestVisibleTextArea = () => {
  const textareas = document.getElementsByTagName('textarea');
  let biggestTextArea: HTMLTextAreaElement | null = null;
  let maxArea = 0;

  for (let i = 0; i < textareas.length; i++) {
    const textarea = textareas[i];

    const visible = isElementVisible(textarea);
    const rect = textarea.getBoundingClientRect();
    const area = rect.width * rect.height;

    if (visible && area > maxArea) {
      biggestTextArea = textarea;
      maxArea = area;
    }
  }

  return biggestTextArea;
};

export const scrollToElemeIfNotVisible = (elem: Element) => {
  if (!isElementVisible(elem)) {
    elem.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
};

export const findAndFocusBiggestTextArea = () => {
  const elem = findTheBiggestVisibleTextArea();

  if (elem) {
    elem.focus();
  }

  return elem;
};

export const isContentEditableElement = (
  el: any,
): el is ElementContentEditable => {
  return el?.isContentEditable;
};

export const isElementTag = (tagName: string, element: Element) => {
  return element?.tagName?.toLowerCase() === tagName;
};

function getCssSelectorsOfEditable() {
  return 'textarea, *[contenteditable=true], *[role=textbox], div.ace_cursor';
}
function isEditable(element: HTMLElement) {
  return (
    (element &&
      element.localName === 'textarea' &&
      !(element as HTMLTextAreaElement).disabled) ||
    element.isContentEditable
  );
}

export function filterInvisibleElements(nodes: HTMLElement[]) {
  return nodes.filter(function (n) {
    return (
      n.offsetHeight &&
      n.offsetWidth &&
      !n.getAttribute('disabled') &&
      isElementPartiallyInViewport(n) &&
      getComputedStyle(n).visibility !== 'hidden'
    );
  });
}

function isElementDrawn(e: Element, rect?: DOMRectReadOnly): boolean {
  const min: number = isEditable(e as HTMLElement) ? 1 : 4;
  const r: DOMRect = rect || e.getBoundingClientRect();
  return r.width > min && r.height > min;
}

function isElementPartiallyInViewport(
  el: Element,
  ignoreSize: boolean = false,
): boolean {
  const rect: DOMRect = el.getBoundingClientRect();
  const windowHeight: number =
    window.innerHeight || document.documentElement.clientHeight;
  const windowWidth: number =
    window.innerWidth || document.documentElement.clientWidth;

  return (
    (ignoreSize || isElementDrawn(el, rect)) &&
    rect.top < windowHeight &&
    rect.bottom > 0 &&
    rect.left < windowWidth &&
    rect.right > 0
  );
}

function getVisibleElements(
  filter: (e: Element, visibleElements: Element[]) => void,
): Element[] {
  const all: Element[] = Array.from(
    document.documentElement.getElementsByTagName('*'),
  );
  const visibleElements: Element[] = [];
  for (let i = 0; i < all.length; i++) {
    const e: Element = all[i];
    if (e.shadowRoot) {
      const cc: NodeList = e.shadowRoot.querySelectorAll('*');
      for (let j = 0; j < cc.length; j++) {
        all.push(cc[j] as Element);
      }
    }
    const rect: DOMRect = e.getBoundingClientRect();
    if (
      rect.top <= window.innerHeight &&
      rect.bottom >= 0 &&
      rect.left <= window.innerWidth &&
      rect.right >= 0 &&
      rect.height > 0 &&
      getComputedStyle(e).visibility !== 'hidden'
    ) {
      filter(e, visibleElements);
    }
  }
  return visibleElements;
}

export const getEditableElements = () => {
  const selector = getCssSelectorsOfEditable();
  const activeElem = document.activeElement;
  let elements = getVisibleElements(function (e, v) {
    if (
      activeElem !== e &&
      e.matches(selector) &&
      !(e as HTMLInputElement).disabled &&
      !(e as HTMLInputElement).readOnly
    ) {
      v.push(e);
    }
  });

  return elements;
};

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
  return keys.reduce((acc, key) => {
    acc[key] = Math.trunc(rect[key]);
    return acc;
  }, {} as Record<keyof DOMRect, number>);
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

export const estimateParent = (elem: Element) => {
  const editableElemsSelector = getCssSelectorsOfEditable();
  const parent = elem.parentElement;
  if (parent?.querySelectorAll(editableElemsSelector).length === 1) {
    return parent;
  }
  return elem;
};
