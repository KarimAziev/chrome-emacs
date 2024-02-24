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

function filterAncestors(elements: Element[]): Element[] {
  if (elements.length === 0) {
    return elements;
  }

  const result: Element[] = [];
  elements.forEach(function (e: Element, _i: number) {
    if (isExplicitlyRequested(e)) {
      result.push(e);
    } else {
      for (let j = 0; j < result.length; j++) {
        if (result[j].contains(e)) {
          if (
            result[j].tagName !== 'A' ||
            !(result[j] as HTMLAnchorElement).href
          ) {
            result[j] = e;
          }
          return;
        } else if (result[j].shadowRoot && result[j].shadowRoot?.contains(e)) {
          return;
        } else if (e.contains(result[j])) {
          console.log('skip: ', e, result[j]);
          return;
        }
      }
      result.push(e);
    }
  });

  return result;
}

function getRealRect(elm: Element): DOMRectReadOnly {
  if (elm.childElementCount === 0) {
    const r: DOMRectList = elm.getClientRects();
    if (r.length === 3) {
      return r[1];
    } else if (r.length === 2) {
      return r[0];
    } else {
      return elm.getBoundingClientRect();
    }
  } else if (
    elm.childElementCount === 1 &&
    elm.firstElementChild!.textContent
  ) {
    let r: DOMRect = elm.firstElementChild!.getBoundingClientRect();
    if (r.width < 4 || r.height < 4) {
      r = elm.getBoundingClientRect();
    }
    return r;
  } else {
    return elm.getBoundingClientRect();
  }
}

function isExplicitlyRequested(_element: Element): boolean {
  return false;
}

export function filterOverlapElements(elements: Element[]): Element[] {
  elements = elements.filter(function (e: Element) {
    const be: DOMRectReadOnly = getRealRect(e);
    if (
      (e as HTMLInputElement).disabled ||
      (e as HTMLInputElement).readOnly ||
      !isElementDrawn(e, be)
    ) {
      return false;
    } else if (
      e.matches('input, textarea, select, form') ||
      (e as unknown as ElementContentEditable).contentEditable === 'true' ||
      isExplicitlyRequested(e)
    ) {
      return true;
    } else {
      const el: Element | null = (
        e.getRootNode() as unknown as DocumentOrShadowRoot
      ).elementFromPoint(be.left + be.width / 2, be.top + be.height / 2);
      return (
        !el ||
        (el.shadowRoot &&
          (el.childElementCount === 0 || el.shadowRoot.contains(e))) ||
        el.contains(e) ||
        e.contains(el)
      );
    }
  });

  return filterAncestors(elements);
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
