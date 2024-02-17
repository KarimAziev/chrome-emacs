import events from '@/content-script-tools/custom-events';
import { IContentEventsBinder } from '@/handlers/types';

const contentEventsBinder: IContentEventsBinder = {
  bind: (target, window) => {
    const origin = window.location.origin;
    for (const event of events) {
      if (origin.match(event.url)) {
        event.bind.call(target, window);
      }
    }
  },
};
export default contentEventsBinder;
