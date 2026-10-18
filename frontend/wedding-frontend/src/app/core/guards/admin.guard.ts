import { AdminAccessState, AdminAccessUnavailable } from '../services/admin-access-state';
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AdminAuthService } from '../services/admin-auth.service';
export const adminGuard: CanActivateFn = async (_route, state) => {
  const auth = inject(AdminAuthService);
  const router = inject(Router);
  const access = inject(AdminAccessState);
  access.target.set(state.url);
  try { return await auth.authorize() || router.createUrlTree(['/admin/login'], {queryParams: {returnUrl: state.url}}); }
  catch (error) { if(error instanceof AdminAccessUnavailable) return false; throw error; }
};
export const fullAdminGuard: CanActivateFn = async () => {
  const auth = inject(AdminAuthService);
  const router = inject(Router);
  if (!auth.role()) await auth.authorize();
  return auth.role() === 'full' || router.createUrlTree(['/admin/dashboard']);
};
