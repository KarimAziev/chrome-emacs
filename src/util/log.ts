const IS_DEBUG = process.env.DEBUG;
export const log = (...args: any[]) => {
  if (IS_DEBUG) {
    console.log(
      '%cchrome-emacs',
      'background-color: #9932cc; color: #f0ffff;padding: 3px;border-radius: 1px;box-shadow: rgba(0, 0, 0, 0.1) 0px 4px 12px;%o',
      ...args,
    );
  }
};
