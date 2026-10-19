import { isVaultFreeRoute } from '../publicRoutes';

describe('isVaultFreeRoute', () => {
  it.each([
    '/share',
    '/shared',
    '/shared/legacy-token',
    '/s/A7K2',
    '/privacy',
    '/delete-account',
  ])('allows %s without unlocking the private vault', (pathname) => {
    expect(isVaultFreeRoute(pathname)).toBe(true);
  });

  it.each(['/', '/account', '/login', '/sharedLinks'])('still protects %s', (pathname) => {
    expect(isVaultFreeRoute(pathname)).toBe(false);
  });
});
