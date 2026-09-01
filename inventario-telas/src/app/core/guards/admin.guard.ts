import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { waitUntilAuthResolved } from './wait-auth';

export const adminGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  await waitUntilAuthResolved(auth);

  if (!auth.session()) {
    return router.parseUrl('/login');
  }
  if (auth.isAdmin()) {
    return true;
  }
  return router.parseUrl('/');
};
