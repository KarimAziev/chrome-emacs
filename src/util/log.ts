export const log = (...args: any[]) => {
  if (process.env.DEBUG === 'true') {
    console.log(...args);
  }
};
