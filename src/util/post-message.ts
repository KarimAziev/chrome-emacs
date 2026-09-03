export const getPostMessageTargetOrigin = (win: Window): string => {
  const origin = win.location.origin;

  return origin === 'null' || origin === 'file://' ? '*' : origin;
};
