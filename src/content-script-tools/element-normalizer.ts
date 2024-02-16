import { capitalize } from '../util/string';

interface ElementWithTagName {
  tagName?: string;
  contentDocument?: {
    activeElement: Element;
  };
}

class ElementNormalizer {
  normalize(elem: Element) {
    const tagName = this._tagName(elem);
    const method = `normalize${capitalize(tagName)}`;
    if ((this as any)[method]) {
      return (this as any)[method](elem) as Element;
    }
    return elem;
  }

  normalizeFrame(elem: ElementWithTagName): any {
    try {
      return elem.contentDocument!.activeElement;
    } catch (e) {
      console.warn(
        `Could not get ${this._tagName(
          elem,
        )} activeElement. Is it cross domain?`,
      );
      return elem;
    }
  }

  normalizeIframe(elem: ElementWithTagName): any {
    return this.normalizeFrame(elem);
  }

  _tagName(elem: ElementWithTagName): string | undefined {
    return elem.tagName?.toLowerCase();
  }
}

export default new ElementNormalizer();
