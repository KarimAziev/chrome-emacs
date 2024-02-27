import { contentEvents, textSyncer } from '@/content-script-tools';
import { IHandlerConstructor } from '@/handlers/types';
import { scrollAndFocus } from '@/util/dom';

export const loadHandler = (
  item?: [IHandlerConstructor, HTMLTextAreaElement],
) => {
  if (!item) {
    return;
  }

  const [Handler, elem] = item;
  scrollAndFocus(elem);
  const handler = new Handler(elem, contentEvents);

  return handler
    .load()
    .then((options) =>
      textSyncer.linkElem(document.URL, document.title, handler, options),
    );
};
