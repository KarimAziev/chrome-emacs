import { getPostMessageTargetOrigin } from '@/util/post-message';

const makeWindowWithOrigin = (origin: string) =>
  ({
    location: {
      origin,
    },
  }) as Window;

describe('getPostMessageTargetOrigin', () => {
  it('uses the page origin for normal web pages', () => {
    expect(
      getPostMessageTargetOrigin(makeWindowWithOrigin('https://example.com')),
    ).toBe('https://example.com');
  });

  it('uses a wildcard target for opaque file origins', () => {
    expect(getPostMessageTargetOrigin(makeWindowWithOrigin('file://'))).toBe(
      '*',
    );
  });

  it('uses a wildcard target for null origins', () => {
    expect(getPostMessageTargetOrigin(makeWindowWithOrigin('null'))).toBe('*');
  });
});
