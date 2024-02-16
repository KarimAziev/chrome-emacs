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
