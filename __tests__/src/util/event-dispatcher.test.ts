import { CustomEventDispatcher } from '@/util/event-dispatcher';

describe('CustomEventDispatcher', () => {
  let element: HTMLDivElement;
  let dispatcher: CustomEventDispatcher<HTMLDivElement>;

  beforeEach(() => {
    element = document.createElement('div');
    document.body.appendChild(element);
    dispatcher = new CustomEventDispatcher(element);
  });

  afterEach(() => {
    document.body.removeChild(element);
  });

  it('should dispatch a "change" event', () => {
    const mockFn = jest.fn();
    element.addEventListener('change', mockFn);
    dispatcher.change();
    expect(mockFn).toHaveBeenCalled();
  });

  it('should dispatch a "input" event', () => {
    const mockFn = jest.fn();
    element.addEventListener('input', mockFn);
    dispatcher.input();
    expect(mockFn).toHaveBeenCalled();
  });

  it('should dispatch a "keyup" event with correct properties', () => {
    const mockFn = jest.fn();
    element.addEventListener('keyup', mockFn);
    dispatcher.keyup({ key: 'Enter' });
    expect(mockFn).toHaveBeenCalled();
    const event = mockFn.mock.calls[0][0];
    expect(event.detail.atomicChromeSyntheticEvent).toBe(true);
  });

  it('should dispatch a "keypress" event with correct properties', () => {
    const mockFn = jest.fn();
    element.addEventListener('keypress', mockFn);
    dispatcher.keypress();
    expect(mockFn).toHaveBeenCalled();
    const event = mockFn.mock.calls[0][0];
    expect(event.detail.atomicChromeSyntheticEvent).toBe(true);
  });

  it('should dispatch a "keydown" event with correct properties', () => {
    const mockFn = jest.fn();
    element.addEventListener('keydown', mockFn);
    dispatcher.keydown();
    expect(mockFn).toHaveBeenCalled();
    const event = mockFn.mock.calls[0][0];
    expect(event.detail.atomicChromeSyntheticEvent).toBe(true);
  });

  it('should identify if an event is an Atomic Chrome Custom Event', () => {
    const event = new CustomEvent('test', {
      detail: { atomicChromeSyntheticEvent: true },
    });
    expect(CustomEventDispatcher.isAtomicChromeCustomEvent(event)).toBeTruthy();
  });

  it('should dispatch a custom "click" event and simulate element interaction', () => {
    const clickMockFn = jest.fn();
    const mousedownMockFn = jest.fn();
    const mouseupMockFn = jest.fn();

    element.addEventListener('click', clickMockFn);
    element.addEventListener('mousedown', mousedownMockFn);
    element.addEventListener('mouseup', mouseupMockFn);

    dispatcher.click();

    expect(mousedownMockFn).toHaveBeenCalled();
    expect(mouseupMockFn).toHaveBeenCalled();
    expect(clickMockFn).toHaveBeenCalled();
  });
});
