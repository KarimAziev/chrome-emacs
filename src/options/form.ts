import { KeyRecorder } from '@/options/key-recorder';
import { createElem } from '@/options/util';
import { splitKeySequence } from '@/util/string';
import './options.scss';

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

    const dubs = Array.from(dubSet).map((c) => `Dublicated char '${c}'`);

    const invalidMessages =
      chars.length <= 1
        ? ['Minimal length is 2 chars']
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
                      : `${c} is used in command ${keybindingCmd} keybinding ${keybinding}`,
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

  getAllFieldsKeys() {
    return this.fields.reduce(
      (acc, [, keybindingField]) => {
        if (keybindingField.value && keybindingField.value.length > 0) {
          acc[keybindingField.value] = true;
        }

        return acc;
      },
      {} as Record<string, boolean>,
    );
  }

  validateKey(key: string) {
    const hintInput = this.hintInput;

    const chars = hintInput?.value.split('');

    if (key.length === 0) {
      return 'Required';
    }
    if (chars && chars.includes(key)) {
      return `The '${key}' is already used in hints!`;
    }

    const firstChar = splitKeySequence(key)[0];
    if (firstChar && firstChar.length === 1 && chars.includes(firstChar)) {
      return `'${firstChar}' is already used in hints!`;
    }
    const allKeys = this.getAllFieldsKeys();
    return allKeys[key] && `'${key}' is already used!`;
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

    const errors: string[] = [];

    inputs.forEach((input) => {
      const msg = input.value.length === 0 && 'Required';

      if (msg) {
        input.classList.add('invalid');
        errors.push(msg);
      } else {
        input.classList.remove('invalid');
      }
    });

    this.updateSubmitButton();
  }

  validateInput(input: HTMLInputElement) {
    if (input.value.length === 0) {
      input.classList.add('invalid');
    } else {
      input.classList.remove('invalid');
    }
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
        validate: (value) => this.validateKey(value),
        onSubmit: (value) => {
          keybindingField.value = value;
          input.value = value;
          this.validateInput(input);
          this.updateSubmitButton();
        },
        onCancel: () => {
          this.validateInput(input);
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
