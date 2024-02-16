import events from './custom-events';

export default {
  bind: (target: any, window: Window) => {
    const origin = window.location.origin;
    for (const event of events) {
      if (origin.match(event.url)) {
        event.bind.call(target, window);
      }
    }
  },
};
