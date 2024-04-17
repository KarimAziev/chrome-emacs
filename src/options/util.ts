export type Children = null | HTMLElement | HTMLElement[] | Children[];

export const mapChildren = <El extends HTMLElement>(
  el: El,
  children: Children,
) => {
  if (children instanceof Node) {
    el.appendChild(children);
  } else if (Array.isArray(children)) {
    children.forEach((child) => {
      mapChildren(el, child);
    });
  }
};

export const createElem = <
  K extends keyof HTMLElementTagNameMap,
  Props extends {
    [P in keyof HTMLElementTagNameMap[K] as P]?: HTMLElementTagNameMap[K][P];
  },
>(
  tag: K,
  attrs?: Props | null,
  children?: Children,
) => {
  const el = document.createElement(tag);
  if (attrs) {
    Object.entries(attrs).forEach(([k, value]) => {
      el[k as keyof HTMLElementTagNameMap[K]] = value;
    });
  }

  if (children) {
    mapChildren(el, children);
  }

  return el;
};
