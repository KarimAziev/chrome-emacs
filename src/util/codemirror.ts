import { isString } from '@/util/guard';
import { isValueMatches } from '@/util/string';
import 'codemirror/mode/meta';
import DummyCodeMirror from 'dummy-codemirror';

/**
 * Searches for a CodeMirror language mode matching the specified language, and returns its primary file extension.
 * If no exact match is found, it tries to find a partial or fuzzy match based on the mode's name and extensions.
 *
 * @param language - The name of the programming language to search for.
 * @returns The primary file extension associated with the language mode if found; otherwise, null.
 */
export const codeMirrorSearchLanguage = (language: string) => {
  if (!DummyCodeMirror?.modeInfo) {
    return;
  }
  const languageNormalized = language?.toLowerCase();

  const partialMatches = [];
  const fuzzyMatches = [];

  for (const mode of DummyCodeMirror.modeInfo) {
    const name = mode?.name?.toLowerCase() || mode?.mode.toLowerCase();
    if (name === languageNormalized && mode.ext) {
      const extension = mode.ext[0];
      return extension;
    } else if (mode.ext && mode.ext[0]) {
      const vals = Object.values(mode);

      if (
        vals.find((v) => isString(v) && languageNormalized === v.toLowerCase())
      ) {
        partialMatches.push(mode);
      } else if (
        vals.find((v) => isString(v) && isValueMatches(languageNormalized, v))
      ) {
        fuzzyMatches.push(mode);
      }
    }
  }

  const fallbackResult =
    partialMatches.find((m) => m.ext && m.ext[0]) ||
    fuzzyMatches.find((m) => m.ext && m.ext[0]);

  const fallbackExt = fallbackResult?.ext && fallbackResult?.ext[0];

  return fallbackExt || null;
};
