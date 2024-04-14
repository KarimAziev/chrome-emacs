import { KeyboardMapper } from '@/util/keyboard-mapper';
import { KeySequenceReader } from '@/util/key-reader';
import { isString } from '@/util/guard';
import { createElem } from '@/options/util';

export interface RecorderProps {
  validate?: (keytext: string) => string | undefined | boolean;
  onSubmit?: (keytext: string) => void;
  onCancel?: () => void;
}

export class KeyRecorder {
  private header: HTMLElement;
  private title: HTMLElement;
  private titleCaption: HTMLElement;
  private dialog: HTMLDialogElement;
  private keyInput: HTMLInputElement;
  private errorSpan: HTMLElement;
  private label: HTMLElement;
  private resetButton: HTMLButtonElement;
  private submitButton: HTMLButtonElement;
  private cancelButton: HTMLButtonElement;
  private wrapper: HTMLElement;
  private keyEvents: KeyboardEvent[] = [];
  private recording: boolean = false;
  private validate: RecorderProps['validate'];
  private onSubmit: RecorderProps['onSubmit'];
  private onCancel: RecorderProps['onCancel'] | null;

  constructor(props: RecorderProps) {
    this.validate = props.validate;
    this.onSubmit = props.onSubmit;
    this.onCancel = props.onCancel;
    this.listener = this.listener.bind(this);
    this.toggleRecording = this.toggleRecording.bind(this);
    this.closeDialog = this.closeDialog.bind(this);

    this.buildUI = this.buildUI.bind(this);
    this.submit = this.submit.bind(this);
    this.attachEventListeners = this.attachEventListeners.bind(this);

    this.buildUI();
    this.attachEventListeners();
  }

  private buildUI() {
    this.title = createElem('h5');
    this.titleCaption = createElem('div');
    this.header = createElem('header', null, [this.title, this.titleCaption]);

    this.dialog = createElem('dialog');
    this.keyInput = createElem('input', {
      type: 'text',
      name: 'keybinding',
      onclick: () => {
        if (!this.recording) {
          this.toggleRecording();
        }
      },
      readOnly: true,
    }) as HTMLInputElement;
    this.errorSpan = createElem('div', { className: 'error' });
    this.label = createElem('label', {
      htmlFor: 'keybinding',
    });
    this.resetButton = createElem('button', {
      disabled: true,
      innerText: 'Reset',
      className: 'primary',
      onclick: () => {
        this.resetRecording();
      },
    }) as HTMLButtonElement;
    this.submitButton = createElem('button', {
      disabled: true,
      className: 'secondary',
      innerText: 'Submit',
    }) as HTMLButtonElement;
    this.cancelButton = createElem('button', {
      innerText: 'Cancel',
      className: 'primary',
    });
    this.wrapper = createElem('section', { className: 'modal' });
    this.wrapper.appendChild(this.label);

    const footer = createElem('footer', null, [
      this.resetButton,
      this.submitButton,
      this.cancelButton,
    ]);

    const body = createElem('div', { className: 'content' }, [
      this.label,
      createElem('div', null, this.keyInput),
      this.errorSpan,
    ]);
    this.wrapper.append(this.header, body, footer);
    this.dialog.appendChild(this.wrapper);
    document.body.appendChild(this.dialog);
    this.keyInput.focus();
  }

  private attachEventListeners() {
    this.cancelButton.addEventListener('click', this.closeDialog);
    this.submitButton.addEventListener('click', this.submit);
    this.dialog.showModal();
    this.toggleRecording();
  }

  private toggleRecording() {
    if (this.recording) {
      this.title.textContent = '';
      this.label.textContent = '';
      document.removeEventListener('keydown', this.listener);
      this.recording = false;
    } else {
      this.resetRecording();
      this.title.textContent = 'Recording';
      this.titleCaption.innerHTML =
        'Press desired key sequence and then<br /> <b>Enter</b> to confirm or <b>Escape</b> to reset';
      document.addEventListener('keydown', this.listener);
      this.recording = true;
    }
  }

  private listener(ev: KeyboardEvent) {
    const key = ev.key;
    ev.preventDefault();

    const modifier = KeyboardMapper.isModifier(key);
    if (modifier) {
      return;
    }

    if (['Enter'].includes(key) && this.keyEvents.length > 0) {
      this.toggleRecording();
      this.submit();
      return;
    }

    if (['Escape'].includes(key)) {
      if (this.keyEvents.length > 0) {
        this.resetRecording();
        return;
      } else {
        this.resetRecording();
        return this.closeDialog();
      }
    }

    if (['Backspace'].includes(key)) {
      if (this.keyEvents.length > 0) {
        this.keyEvents.pop();
        this.keyInput.value = KeySequenceReader.formatKeyboardEvents(
          this.keyEvents,
        );
        this.resetButton.disabled = this.keyEvents.length === 0;
        this.submitButton.disabled = this.keyEvents.length === 0;
        if (!this.isValidKey(this.keyInput.value)) {
          this.resetRecording();
        }
        return;
      }
    }

    this.keyEvents.push(ev);
    this.keyInput.value = KeySequenceReader.formatKeyboardEvents(
      this.keyEvents,
    );
    if (!this.isValidKey(this.keyInput.value)) {
      this.resetRecording();
    }
  }

  private isValidKey(value: string) {
    const isInvalid: string | boolean | undefined =
      (!KeySequenceReader.validateKeyString(value) && 'Invalid key') ||
      (this.validate && this.validate(value));

    if (isInvalid) {
      this.errorSpan.innerText = isString(isInvalid)
        ? isInvalid
        : 'Invalid key';
      this.submitButton.disabled = true;
      this.resetButton.disabled = this.keyEvents.length === 0;
      return false;
    }

    this.errorSpan.innerText = '';
    this.submitButton.disabled = this.keyEvents.length === 0;
    this.resetButton.disabled = this.keyEvents.length === 0;
    return this.keyEvents.length > 0;
  }

  private resetRecording(clickInitiated = false) {
    this.keyEvents = [];
    this.keyInput.value = '';
    this.resetButton.disabled = true;
    this.submitButton.disabled = true;
    if (clickInitiated && this.recording) {
      this.toggleRecording();
    }
  }

  private submit() {
    const val = KeySequenceReader.formatKeyboardEvents(this.keyEvents);
    const valid = this.isValidKey(val);

    if (valid) {
      if (this.onSubmit) {
        this.onSubmit(val);
      }
      this.onCancel = null;
      this.closeDialog();
    } else {
      this.resetRecording();
    }
  }

  private closeDialog() {
    document.removeEventListener('keydown', this.listener);
    this.keyInput.removeEventListener('click', this.toggleRecording);
    this.cancelButton.removeEventListener('click', this.closeDialog);
    this.submitButton.removeEventListener('click', this.submit);
    this.dialog.close();
    this.dialog.remove();
    if (this.onCancel) {
      this.onCancel();
    }
  }
}
