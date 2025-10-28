import InputHandler from '@/handlers/input';
import { RuntimeSettings } from '@/options/runtime-settings';
import { defaultSettings } from '@/options/defaults';
import { VISUAL_ELEMENT_SELECTOR } from '@/handlers/config/const';

const createInput = (type?: string) => {
  const input = document.createElement('input');
  if (type) {
    input.type = type;
  }
  document.body.appendChild(input);
  return input;
};

describe('InputHandler.canHandle', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    RuntimeSettings.merge({
      allowVisibleInputs: defaultSettings.allowVisibleInputs,
    });
  });

  it('returns false when visible inputs are disabled', () => {
    const input = createInput('text');
    RuntimeSettings.merge({ allowVisibleInputs: false });

    expect(InputHandler.canHandle(input)).toBe(false);
  });

  it('allows plain text inputs when enabled', () => {
    const input = createInput('text');
    RuntimeSettings.merge({ allowVisibleInputs: true });

    expect(InputHandler.canHandle(input)).toBe(true);
  });

  it('allows inputs without explicit type attribute when enabled', () => {
    const input = createInput();
    RuntimeSettings.merge({ allowVisibleInputs: true });

    expect(InputHandler.canHandle(input)).toBe(true);
  });

  it('allows password inputs when enabled', () => {
    const input = createInput('password');
    RuntimeSettings.merge({ allowVisibleInputs: true });

    expect(InputHandler.canHandle(input)).toBe(true);
  });

  it('rejects unsupported input types', () => {
    const input = createInput('date');
    RuntimeSettings.merge({ allowVisibleInputs: true });

    expect(InputHandler.canHandle(input)).toBe(true);
  });

  it('rejects inputs inside managed visual editors', () => {
    const wrapper = document.createElement('div');
    const selectorClass = VISUAL_ELEMENT_SELECTOR.monaco.replace('.', '');
    wrapper.classList.add(selectorClass);

    const input = createInput('text');
    wrapper.appendChild(input);
    document.body.appendChild(wrapper);

    RuntimeSettings.merge({ allowVisibleInputs: true });

    expect(InputHandler.canHandle(input)).toBe(false);
  });

  it('rejects disabled inputs even when enabled in settings', () => {
    const input = createInput('text');
    input.disabled = true;

    RuntimeSettings.merge({ allowVisibleInputs: true });

    expect(InputHandler.canHandle(input)).toBe(false);
  });
});
