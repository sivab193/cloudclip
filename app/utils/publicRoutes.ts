/** Routes that must stay usable without unlocking a signed-in user's vault. */
export const isVaultFreeRoute = (pathname: string): boolean =>
  pathname === '/privacy' ||
  pathname === '/delete-account' ||
  pathname === '/share' ||
  pathname === '/shared' ||
  pathname.startsWith('/shared/') ||
  pathname.startsWith('/s/');
