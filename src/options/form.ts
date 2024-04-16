import { KeyRecorder } from '@/options/key-recorder';
import { createElem } from '@/options/util';
import { splitKeySequence } from '@/util/keyboard-util';
import './options.scss';
import { groupByCommonPrefix } from '@/util/string';

export interface Option {
  label: string;
  value: string;
}

export interface KeybindingField<
  K extends keyof HTMLElementTagNameMap = 'input',
> {
  name: string;
  value: string;
  label: string;
  props?: {
    [P in keyof HTMLElementTagNameMap[K] as P]?: HTMLElementTagNameMap[K][P];
  };
}

export interface CommandOptionField extends KeybindingField<'select'> {
  options: Option[];
  value: Option['value'];
}

export type Field = CommandOptionField | KeybindingField;

export type FieldPair = [CommandOptionField, KeybindingField];
export type Fields = FieldPair[];

export interface RecorderProps {
  validate?: (keytext: string) => string | undefined | boolean;
  onSubmit?: (keytext: string) => void;
}

export interface DynamicFormParams {
  fields: Fields;
  defaultPair: FieldPair;
  onSave?: (fields: Fields, hints: string) => void;
  onReset?: () => { defaultPair: FieldPair; fields: Fields; hints: string };
  hints: string;
}

export class DynamicForm {
  private fields: Fields = [];
  private submitButton: HTMLButtonElement;
  private resetButton: HTMLButtonElement;
  private defaultPair: FieldPair;
  private form: HTMLFormElement;
  private onReset: DynamicFormParams['onReset'];
  private onSave: DynamicFormParams['onSave'];
  private dynamicFields: HTMLElement;
  private hintInput: HTMLInputElement;
  private hintErrorsBox: HTMLDivElement;

  constructor({
    hints,
    fields,
    defaultPair,
    onSave,
    onReset,
  }: DynamicFormParams) {
    const dynamicFields = createElem('div', { className: 'rows' });
    const dynamicFieldsSet = createElem(
      'fieldset',
      { className: 'dynamic-fields', name: 'keybindings' },
      [createElem('legend', { innerText: 'Keybindings' }), dynamicFields],
    );

    const hintsWrapper = this.configureHintInput(hints);

    this.dynamicFields = dynamicFields;
    this.fields = fields;

    this.form = document.querySelector('#optionsForm') as HTMLFormElement;

    this.form.append(hintsWrapper, dynamicFieldsSet, this.makeFooter());
    this.validateAll = this.validateAll.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);

    this.onSave = onSave;
    this.defaultPair = defaultPair.map((item) => ({ ...item })) as FieldPair;
    this.onReset = onReset;

    this.form.onsubmit = this.handleSubmit;
    this.form.onreset = this.handleReset.bind(this);

    this.renderFields();
  }

  addField(pair: FieldPair): void {
    this.fields.push(pair);
    const row = this.createRow(pair, this.fields.length - 1);
    const inputRow = row.querySelector(
      `input[type='text']`,
    ) as HTMLInputElement;
    this.dynamicFields.appendChild(row);
    inputRow.scrollIntoView();
    inputRow.focus();
    this.updateSubmitButton();
  }

  removeField(index: number): void {
    this.fields.splice(index, 1);
    this.renderFields(Math.max(1, index - 1));
    this.updateSubmitButton();
  }

  getHintsErrors() {
    const value = this.hintInput.value;
    const chars = value.split('');
    const dubSet = new Set();
    const seen = new Set();
    for (let i = 0; i < chars.length; i++) {
      const el = chars[i];
      if (seen.has(el)) {
        dubSet.add(el);
      }
      seen.add(el);
    }

    const dubs = Array.from(dubSet).map((c) => `Duplicated char '${c}'`);

    const invalidMessages =
      chars.length <= 1
        ? ['Minimum length is 2 characters']
        : dubs.concat(
            chars.flatMap((c) => {
              const pair = this.fields?.find(
                ([, { value }]) => splitKeySequence(value)[0] === c,
              );
              const keybinding = pair && pair[1].value;

              const keybindingCmd = pair && pair[0].value;
              return keybinding
                ? [
                    c === keybinding
                      ? `${c} is used in command ${keybindingCmd}`
                      : `${c} is used in the '${keybindingCmd}' command's keybinding '${keybinding}'`,
                  ]
                : [];
            }),
          );

    const isInvalid = invalidMessages.length > 0;

    this.hintErrorsBox.innerHTML = '';
    if (isInvalid) {
      invalidMessages.forEach((m) =>
        this.hintErrorsBox.appendChild(createElem('div', { innerText: m })),
      );
      this.hintInput.classList.add('invalid');
    } else {
      this.hintInput.classList.remove('invalid');
    }

    this.updateSubmitButton();

    return isInvalid && invalidMessages;
  }

  configureHintInput(hints: DynamicFormParams['hints']) {
    this.hintInput = createElem('input', {
      type: 'text',
      value: hints,
      minLength: 2,
      required: true,
      name: 'hints',
    });

    this.hintErrorsBox = createElem('div', { className: 'error' });

    const hintLabel = createElem('label', {
      htmlFor: 'hints',
    });

    this.hintInput.oninput = () => {
      this.getHintsErrors();
    };

    this.hintInput.onblur = () => {
      this.getHintsErrors();
    };

    return createElem('fieldset', null, [
      createElem('legend', { innerText: 'Hints' }),
      hintLabel,
      this.hintInput,
      this.hintErrorsBox,
    ]);
  }

  validateKey(key: string, idx: number) {
    const hintInput = this.hintInput;

    const chars = hintInput?.value.split('');

    if (key.length === 0) {
      return 'Required';
    }
    if (chars && chars.includes(key)) {
      return `'${key}' is already used in hints!`;
    }

    const firstChar = splitKeySequence(key)[0];
    if (firstChar && firstChar.length === 1 && chars.includes(firstChar)) {
      return `'${firstChar}' is already used in hints!`;
    }
    const allKeys = this.fields.reduce(
      (acc, [, keybindingField], index) => {
        if (
          idx !== index &&
          keybindingField.value &&
          keybindingField.value.length > 0
        ) {
          acc[keybindingField.value] = true;
        }

        return acc;
      },
      {} as Record<string, boolean>,
    );

    if (allKeys[key]) {
      return `'${key}' is already used!`;
    }

    const commonPrefix = Object.keys(allKeys).find((v) => key.startsWith(v));

    if (commonPrefix) {
      return `The prefix '${commonPrefix}' conflicts with an existing key and cannot be used.`;
    }
  }

  handleSubmit(event: SubmitEvent) {
    event.preventDefault();

    const errs = this.getHintsErrors();
    const fields = this.fields.filter(
      ([, keyItem]) => keyItem.value.length > 0,
    );

    if (this.onSave && !errs && fields.length > 0) {
      this.onSave(fields, this.hintInput.value);
    }
  }

  validateAll() {
    const inputs =
      this.dynamicFields.querySelectorAll<HTMLInputElement>(
        `input[type='text']`,
      );

    const nonEmptyInputs: HTMLInputElement[] = [];
    const nonEmptyValues: string[] = [];
    const emptyInputs: HTMLInputElement[] = [];

    inputs.forEach((input) => {
      if (input.value.length === 0) {
        emptyInputs.push(input);
      } else {
        nonEmptyInputs.push(input);
        nonEmptyValues.push(input.value);
      }
    });

    const invalidPrefixGroups = groupByCommonPrefix(nonEmptyValues);

    const invalidValues = Object.entries(invalidPrefixGroups).flatMap(
      ([_k, value]) => value,
    );

    nonEmptyInputs.forEach((input) => {
      const isInvalid = invalidValues.includes(input.value);
      if (isInvalid) {
        input.classList.add('invalid');
      } else {
        input.classList.remove('invalid');
      }
    });

    emptyInputs.forEach((input) => {
      input.classList.add('invalid');
    });

    this.updateSubmitButton();
  }

  createRow(pair: FieldPair, index: number) {
    const [optionsField, keybindingField] = pair;
    const { options } = optionsField;
    const select = createElem('select', optionsField.props);

    options.forEach((option) => {
      const optionElement = createElem('option');
      optionElement.value = option.value;
      optionElement.text = option.label;
      select.appendChild(optionElement);
    });
    select.value = optionsField.value;

    const handleRecording = () =>
      new KeyRecorder({
        validate: (value) => {
          return this.validateKey(value, index);
        },
        onSubmit: (value) => {
          keybindingField.value = value;
          input.value = value;
          this.validateAll();
        },
        onCancel: () => {
          this.validateAll();
          this.updateSubmitButton();
        },
      });

    const input = createElem('input', {
      type: 'text',
      onclick: handleRecording,
      value: keybindingField.value,
      required: true,
      onbeforeinput: (e) => {
        e.preventDefault();
        handleRecording();
      },
      ...keybindingField.props,
    });

    const removeButton = createElem('button', {
      textContent: '\u2716',
      className: 'remove',
      type: 'button',
      disabled: optionsField.props?.disabled && keybindingField.props?.disabled,
      onclick: () => {
        this.removeField(index);
      },
    });

    const row = createElem('div', { className: 'form-row' }, [
      select,
      input,
      removeButton,
    ]);
    return row;
  }

  private renderFields(scrollIdx?: number) {
    const rows = this.fields.map((pair, index) => {
      return this.createRow(pair, index);
    });

    this.dynamicFields.replaceChildren(...rows);
    if (scrollIdx) {
      const el = rows[scrollIdx];
      if (el) {
        el.scrollIntoView();
      }
    }
  }

  handleReset(e: Event) {
    e.preventDefault();
    if (this.onReset) {
      const { fields, defaultPair, hints } = this.onReset();
      this.fields = fields;
      this.defaultPair = defaultPair;
      this.hintInput.value = hints;
      this.renderFields();
      this.submitButton.disabled = false;
    }
  }

  updateSubmitButton() {
    this.submitButton.disabled =
      this.form.querySelectorAll('.invalid').length > 0 ||
      !!Array.from(
        this.form.querySelectorAll<HTMLInputElement>(`input[type='text']`),
      ).find((i) => i.value.length === 0);
  }

  private makeFooter() {
    this.submitButton = createElem('button', {
      textContent: 'Save',
      type: 'submit',
      disabled: true,
      className: 'primary',
    });
    this.resetButton = createElem('button', {
      textContent: 'Reset to defaults',
      type: 'reset',
      className: 'secondary',
    });

    const footer = createElem('div', { className: 'add-save-buttons' }, [
      createElem('button', {
        textContent: 'Add Key',
        type: 'button',
        className: 'primary',
        onclick: () => {
          this.addField(
            this.defaultPair.map((item) => ({ ...item })) as FieldPair,
          );
        },
      }),
      this.submitButton,
      this.resetButton,
    ]);
    return footer;
  }
}
