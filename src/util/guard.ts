export const isString = (v: any): v is string => typeof v === 'string';
export const isFunction = (v: any): v is Function => typeof v === 'function';
export const isNumber = (v: any): v is number => typeof v === 'number';
export const isHTMLElement = (v: unknown): v is HTMLElement =>
  v instanceof HTMLElement;

export const isError = (v: unknown): v is Error => v instanceof Error;
