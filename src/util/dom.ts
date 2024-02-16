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
