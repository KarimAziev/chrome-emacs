import { handlerFactory } from '@/handlers';
import { IHandlerConstructor } from '@/handlers/types';
import { getEditableElements } from '@/util/dom';

export const getElemsWithHandlers = () => {
  const editableElems = getEditableElements();
  const result: [IHandlerConstructor, HTMLTextAreaElement][] = [];

  for (let i = 0; i < editableElems.length; i++) {
    const el = editableElems[i];
    const handler = handlerFactory.handlerFor(el);
    if (handler) {
      result.push([handler, el as HTMLTextAreaElement]);
    }
  }

  return result;
};
