import {
  DynamicForm,
  Fields,
  FieldPair,
  KeybindingField,
  CommandOptionField,
} from '@/options/form';
import { loadSettings } from '@/options/load-settings';
import { messager } from '@/content-script-tools/message';
import type { KeyboardKey } from '@/util/keyboard-mapper';
import {
  defaultKeySettings,
  READONLY_KEY,
  DEFAULT_HINTS,
} from '@/options/defaults';

const commandsToOptions = (
  obj: Record<string, string[]>,
): [Fields, FieldPair] => {
  const commandsOptions = Object.keys(obj).map((c) => ({
    value: c,
    label: c
      .trim()
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .split(' ')
      .map((v) => v[0].toUpperCase() + v.slice(1))
      .join(' '),
  }));

  const makeKeybindingItem = (
    key: string,
    props?: Omit<Partial<HTMLElementTagNameMap['input']>, 'labels'>,
  ): KeybindingField => ({
    label: 'Keybinding',
    name: 'keybinding',
    value: key,
    props,
  });
  const makeCommandItem = (
    value: string,
    props?: Omit<Partial<HTMLElementTagNameMap['select']>, 'options'>,
  ): CommandOptionField => ({
    label: 'Command',
    name: 'command',
    value,
    options: commandsOptions,
    props,
  });
  const res = Object.entries(obj).flatMap(([cmd, keybindings]) =>
    keybindings.map((k) => {
      const config: Partial<
        Record<
          KeyboardKey,
          Omit<Partial<HTMLElementTagNameMap['input']>, 'labels'>
        >
      > = {
        [READONLY_KEY]: {
          readOnly: true,
          disabled: true,
        },
      };
      const extraProps = config[k as KeyboardKey];
      const keyItem = makeKeybindingItem(k, extraProps);
      const cmdItem = makeCommandItem(cmd, extraProps);

      const pair = [cmdItem, keyItem] as FieldPair;
      return pair;
    }),
  );

  const defaults: FieldPair = [
    makeCommandItem(commandsOptions[0].value),
    makeKeybindingItem(''),
  ];

  return [res, defaults];
};

const pairsToConfig = (fields: Fields) =>
  fields.reduce(
    (acc, [cmdItem, keyItem]) => {
      if (keyItem.value && keyItem.value.length > 0) {
        acc[cmdItem.value] = acc[cmdItem.value] || [];
        acc[cmdItem.value].push(keyItem.value);
      }

      return acc;
    },
    {} as Record<string, string[]>,
  );

const initOptions = async () => {
  const keybindingsConfig = await loadSettings();
  const [initialFields, defaultPair] = commandsToOptions(
    keybindingsConfig.keybindings || defaultKeySettings,
  );
  new DynamicForm({
    fields: initialFields,
    hints: keybindingsConfig.hints,
    defaultPair,
    onReset: () => {
      const [defFields, defPair] = commandsToOptions(defaultKeySettings);
      return {
        fields: defFields,
        defaultPair: defPair,
        hints: DEFAULT_HINTS,
      };
    },
    onSave: async (fields, newhints?: string) => {
      const config = pairsToConfig(fields);
      console.log('CONFIG', config);
      try {
        await chrome.storage.local.set({
          keybindings: config,
          hints: newhints || keybindingsConfig.hints || DEFAULT_HINTS,
        });

        messager.success('Configuration saved.', {
          title: 'Chrome Emacs: ',
          delay: 1000,
        });
      } catch (err) {
        messager.error('Error occured.', { title: 'Chrome Emacs: ' });
      }
    },
  });
};

if (document && document.readyState === 'complete') {
  initOptions();
} else {
  document.addEventListener('DOMContentLoaded', function () {
    initOptions();
  });
}
