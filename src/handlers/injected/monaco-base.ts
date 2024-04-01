import BaseInjectedHandler from '@/handlers/injected/base';
import { isString } from '@/util/guard';
import { VISUAL_ELEMENT_SELECTOR } from '@/handlers/config/const';

class MonacoBase extends BaseInjectedHandler<HTMLTextAreaElement> {
  constructor(elem: HTMLTextAreaElement, uuid: string) {
    super(elem, uuid);
    this.silenced = false;
  }

  /**
   * Retrieves the closest parent element that matches the Monaco editor's container.
   * This is useful for operations requiring reference to the editor's DOM structure, such as
   * finding the cursor or line elements.
   *
   * @returns The found Monaco editor container element, or undefined if not found.
   */
  getVisualElement() {
    return this.elem?.closest<HTMLDivElement>(VISUAL_ELEMENT_SELECTOR.monaco);
  }

  /**
   * Retrieves the URI of the currently targeted Monaco editor element.
   * @returns The URI as string of the current editor, or `undefined` if the URI cannot be determined.
   */
  getUri() {
    const editorEl = this.getVisualElement();
    return editorEl?.dataset?.uri;
  }

  /**
   * Determines the appropriate file extension for the code interpreted by the editor, based on editor metadata.
   */
  getExtension(): string | string[] | null | undefined {
    const uri = this.getVisualElement()?.dataset?.uri;

    const match = isString(uri) ? uri.match(/(\.[a-z]+$)/) : null;
    return match && match[1];
  }
}

export default MonacoBase;
