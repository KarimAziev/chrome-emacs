import type { editor } from 'monaco-editor';
import { isFunction } from '@/util/guard';

export const findEditor = () => {
  const propKey = Object.keys(window).find((key) => {
    try {
      const val = window[key as keyof typeof window];
      return [val?.getModel, val?.getValue, val?.setValue].every(isFunction);
    } catch (error) {
      return false;
    }
  });

  if (propKey) {
    return window[propKey as keyof typeof window] as ReturnType<
      typeof editor.create
    >;
  }
};
