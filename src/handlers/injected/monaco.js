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
    const model = this.editor.getModels()[0];
    if (model) {
      const value = model.getValue();
      return value;
    }
  }

  bindChange() {}
}

export default InjectedMonacoHandler;
