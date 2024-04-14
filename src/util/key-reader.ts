import { KeyboardMapper } from '@/util/keyboard-mapper';
import { splitKeySequence } from '@/util/string';

export interface KeySequenceItem {
  key: string;
  ctrlKey: boolean;
  shiftKey: boolean;
  metaKey: boolean;
  altKey: boolean;
}

interface KeySequenceNode {
  children: Map<string, KeySequenceNode>;
  sequenceItem?: KeySequenceItem;
  action?: () => void;
}

export interface KeySequenceReaderParams {
  onDone: (value: string) => void;
  onPartialDone?: (value: string) => void;
  onMismatch?: () => void;
  keybindings: string[];
  preventDefaults?: boolean;
}

export class KeySequenceReader {
  private root: KeySequenceNode;
  private currentNode: KeySequenceNode;
  private currentValue: string | null;
  private preventDefaults: boolean = false;
  private onPartialDone: KeySequenceReaderParams['onPartialDone'];
  private onMismatch: KeySequenceReaderParams['onMismatch'];

  constructor({
    keybindings,
    onDone,
    preventDefaults,
    onPartialDone,
    onMismatch,
  }: KeySequenceReaderParams) {
    const keyConfigs = keybindings.map((v) => ({
      action: () => onDone(v),
      sequence: KeySequenceReader.parseKeySequence(v),
    }));

    this.preventDefaults = preventDefaults || false;
    this.onMismatch = onMismatch;
    this.onPartialDone = onPartialDone;
    this.root = this.initializeKeySequences(keyConfigs);
    this.currentNode = this.root;
  }

  private stringifyKeySequence(obj: KeySequenceItem) {
    const data = Object.keys(obj)
      .sort()
      .reduce(
        (result, key: keyof KeySequenceItem) => {
          result[key] = obj[key];
          return result;
        },
        {} as Record<string, any>,
      );
    return JSON.stringify(data);
  }

  static formatKeySequenceItem(curr: KeySequenceItem, separator = '-') {
    const isUpcased = curr.key.length === 1 && /^[A-Z]$/.test(curr.key);

    const labels = {
      ctrlKey: 'Ctrl',
      metaKey: 'Meta',
      altKey: 'Alt',
      shiftKey: isUpcased ? null : 'Shift',
    };

    const metaKeys = Object.entries(labels).flatMap(
      ([prop, val]: [keyof typeof labels, string | null]) =>
        curr[prop] && val ? [val] : [],
    );

    const label = metaKeys
      .concat([curr.key === ' ' ? 'Space' : curr.key])
      .join(separator);
    return label;
  }

  static formatKeyboardEvents(keyEvents: KeySequenceItem[], separator = '-') {
    return keyEvents
      .reduce((acc, curr) => {
        const label = KeySequenceReader.formatKeySequenceItem(curr, separator);
        acc.push(label);
        return acc;
      }, [] as string[])
      .join(' ');
  }

  static validateKeyString(keystr: string) {
    const evs = KeySequenceReader.parseKeySequence(keystr);

    const lastKey = evs.pop();

    return !!lastKey?.key;
  }

  static parseKeySequence(sequence: string): KeySequenceItem[] {
    const chars = splitKeySequence(sequence).reverse();

    const result: KeySequenceItem[] = [];
    let curr: string;
    let lastMods: ('ctrl' | 'shift' | 'meta' | 'alt')[] = [];
    while (chars.length > 0) {
      curr = chars.pop() as string;
      if (KeyboardMapper.isModifier(curr)) {
        const alias = KeyboardMapper.isCtrlKey(curr)
          ? 'ctrl'
          : KeyboardMapper.isShiftKey(curr)
            ? 'shift'
            : KeyboardMapper.isMetaKey(curr)
              ? 'meta'
              : KeyboardMapper.isAltKey(curr)
                ? 'alt'
                : null;
        if (!alias || lastMods.includes(alias)) {
          return [];
        } else {
          lastMods.push(alias);
        }
      } else {
        const evData = {
          key: curr,
          ctrlKey: lastMods.includes('ctrl'),
          metaKey: lastMods.includes('meta'),
          altKey: lastMods.includes('alt'),
          shiftKey:
            lastMods.includes('shift') ||
            (curr.length === 1 && /^[A-Z]$/.test(curr)),
        };

        lastMods = [];
        result.push(evData);
      }
    }

    return result;
  }

  private initializeKeySequences(
    sequences: { sequence: KeySequenceItem[]; action: () => void }[],
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

    const currentKeyData: KeySequenceItem = {
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
        KeySequenceReader.formatKeySequenceItem(currentKeyData),
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
