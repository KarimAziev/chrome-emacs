import { getTextChangeChunks } from '@/util/diff-util';

describe('getTextChangeChunks', () => {
  it('returns null when texts are equal', () => {
    expect(getTextChangeChunks('same', 'same')).toBeNull();
  });

  it('returns a minimal insertion change for small edits', () => {
    expect(getTextChangeChunks('hello world', 'hello brave world')).toEqual([
      {
        from: 6,
        to: 6,
        insert: 'brave ',
      },
    ]);
  });

  it('falls back to a single full replacement when one side is empty', () => {
    expect(getTextChangeChunks('', 'abc')).toEqual([
      {
        from: 0,
        to: 0,
        insert: 'abc',
      },
    ]);
  });
});
