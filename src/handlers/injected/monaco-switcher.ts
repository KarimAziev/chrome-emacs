import type { editor } from 'monaco-editor';
import { isFunction } from '@/util/guard';
import InjectedMonacoHandler from '@/handlers/injected/monaco';
import InjectedMonacoSimulatorHandler from '@/handlers/injected/monaco-simulator';

/**
 * Class for switching between Monaco editor instances or simulators.
 */
class MonacoSwitcher {
  /**
   * Private constructor to prevent instantiation.
   */
  private constructor() {}

  /**
   * Attempts to find a Monaco editor instance in the global window object.
   * This is useful for sites like coderpad.io, which doesn't expose the Monaco API globally,
   * but provides access to the editor instance under a custom property.
   *
   * @returns The Monaco editor instance found or undefined if none could be found.
   */

  static findEditor() {
    try {
      const propKey = Object.keys(window).find((key) => {
        try {
          const val = window[key as keyof typeof window];
          return (
            val &&
            val?.setValue &&
            val?.getValue &&
            val?.getModel &&
            val?.setPosition &&
            val?.getPosition &&
            val?.focus &&
            isFunction(val?.setValue) &&
            isFunction(val?.getValue) &&
            isFunction(val?.getModel) &&
            isFunction(val?.setPosition) &&
            isFunction(val?.getPosition) &&
            isFunction(val?.focus)
          );
        } catch (error) {
          return false;
        }
      });

      if (propKey) {
        return window[propKey as keyof typeof window] as ReturnType<
          typeof editor.create
        >;
      }
    } catch (_error) {}
  }

  /**
   * Instantiates the correct handler based on the availability of the Monaco API or an instance.
   * It creates a Monaco editor instance if `window.monaco` is available,
   * otherwise tries to obtain a global editor instance or defaults to a simulator.
   *
   * @param elem - The HTML element where the Monaco editor or simulator should be attached.
   * @param uuid - A unique identifier for the instance.
   * @returns An instance of the appropriate handler for Monaco or its simulator.
   */
  static async make(elem: HTMLTextAreaElement, uuid: string) {
    if (window?.monaco) {
      return new InjectedMonacoHandler(elem, uuid);
    }

    const editorInstance = MonacoSwitcher.findEditor();

    if (editorInstance) {
      return new InjectedMonacoHandler(elem, uuid, editorInstance);
    }

    return new InjectedMonacoSimulatorHandler(elem, uuid);
  }
}

export default MonacoSwitcher;
