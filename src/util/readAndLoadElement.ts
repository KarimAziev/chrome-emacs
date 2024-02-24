import HintReader from '@/util/hint';
import { loadHandler } from '@/util/loadHandler';
import { getElemsWithHandlers } from '@/util/getElemsWithHandlers';

export const readAndLoadElement = async () => {
  const isHintReading = HintReader.getIsReading();

  if (isHintReading) {
    return;
  }

  const handlersOptions = getElemsWithHandlers();
  const elems = handlersOptions.map(([_handler, element]) => element);
  if (elems.length > 0) {
    try {
      const elem = await HintReader.readEditableContent(
        elems as HTMLTextAreaElement[],
      );

      const found = handlersOptions.find(
        ([_item, element]) => element === elem,
      );
      if (found) {
        await loadHandler(found);
      }
    } catch (error) {
      return;
    }
  }
};
