import BaseInjectedHandler from './base';

class InjectedMonacoHandler extends BaseInjectedHandler {
  constructor(elem, uuid) {
    super(elem, uuid);
    this.silenced = false;
  }

  load() {
    return new Promise((resolve) => {
      this.editor = monaco.editor;

      return resolve();
    });
  }

  setValue(value) {
    const editor = this.editor.getModels()[0];

    editor.setValue(value);
  }
  getValue() {
    return Promise.resolve(this.elem.value);
  }

  bindChange() {}
}

export default InjectedMonacoHandler;
