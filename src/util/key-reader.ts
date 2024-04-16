import { KeyboardMapper } from '@/util/keyboard-mapper';
import {
  parseKeySequence,
  formatKeyEventItem,
  KeyEventItem,
} from '@/util/keyboard-util';

interface KeySequenceNode {
  children: Map<string, KeySequenceNode>;
  sequenceItem?: KeyEventItem;
  action?: () => void;
}

export interface KeyReaderParams {
  onDone: (value: string) => void;
  onPartialDone?: (value: string) => void;
  onMismatch?: () => void;
  keybindings: string[];
  preventDefaults?: boolean;
}

export class KeyReader {
  private root: KeySequenceNode;
  private currentNode: KeySequenceNode;
  private currentValue: string | null;
  private preventDefaults: boolean = false;
  private onPartialDone: KeyReaderParams['onPartialDone'];
  private onMismatch: KeyReaderParams['onMismatch'];

  constructor({
    keybindings,
    onDone,
    preventDefaults,
    onPartialDone,
    onMismatch,
  }: KeyReaderParams) {
    const keyConfigs = keybindings.map((v) => ({
      action: () => onDone(v),
      sequence: parseKeySequence(v),
    }));

    this.preventDefaults = preventDefaults || false;
    this.onMismatch = onMismatch;
    this.onPartialDone = onPartialDone;
    this.root = this.initializeKeySequences(keyConfigs);
    this.currentNode = this.root;
  }

  private stringifyKeySequence(obj: KeyEventItem) {
    const data = Object.keys(obj)
      .sort()
      .reduce(
        (result, key: keyof KeyEventItem) => {
          result[key] = obj[key];
          return result;
        },
        {} as Record<string, any>,
      );
    return JSON.stringify(data);
  }

  private initializeKeySequences(
    sequences: { sequence: KeyEventItem[]; action: () => void }[],
  ): KeySequenceNode {
    const root: KeySequenceNode = { children: new Map() };
    sequences.forEach(({ sequence, action }) => {
      let currentNode = root;
      sequence.forEach((item, index) => {
        const key = this.stringifyKeySequence(item);

        if (!currentNode.children.has(key)) {
          currentNode.children.set(key, { children: new Map() });
        }
        currentNode = currentNode.children.get(key)!;

        if (index === sequence.length - 1) {
          currentNode.action = action;
        }
      });
    });
    return root;
  }

  public listen(): void {
    document.addEventListener('keydown', this.handleKeydown);
  }

  public cleanup(): void {
    document.removeEventListener('keydown', this.handleKeydown);
  }

  private handleKeydown = (event: KeyboardEvent): void => {
    if (this.preventDefaults) {
      event.preventDefault();
    }

    if (KeyboardMapper.isModifier(event.key)) {
      return;
    }

    const currentKeyData: KeyEventItem = {
      ctrlKey: event.ctrlKey,
      key: event.key,
      shiftKey: event.shiftKey,
      metaKey: event.metaKey,
      altKey: event.altKey,
    };
    const key = this.stringifyKeySequence(currentKeyData);

    const nextNode = this.currentNode.children.get(key);

    if (nextNode) {
      this.currentValue = [
        this.currentValue,
        formatKeyEventItem(currentKeyData),
      ]
        .filter((v) => !!v)
        .join(' ');

      event.preventDefault();

      if (this.onPartialDone) {
        this.onPartialDone(this.currentValue);
      }

      this.currentNode = nextNode;
      if (this.currentNode.action) {
        this.currentNode.action();
        this.currentNode = this.root;
        this.cleanup();
      }
    } else {
      this.currentNode = this.root;
      this.currentValue = null;
      if (this.onMismatch) {
        this.onMismatch();
      }
    }
  };
}
