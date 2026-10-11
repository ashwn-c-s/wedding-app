import { inject } from '@angular/core';
import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { catchError, from, switchMap, throwError } from 'rxjs';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { AdminAuthService } from '../services/admin-auth.service';
export function isAdminApiRequest(url: string): boolean {
  try {
    const backend = new URL(environment.apiBaseUrl);
    const request = new URL(url);
    return request.origin === backend.origin && (request.pathname === '/api/admin' || request.pathname.startsWith('/api/admin/'));
  } catch { return false; }
}
export const adminAuthInterceptor: HttpInterceptorFn = (request, next) => {
  if (!isAdminApiRequest(request.url)) return next(request);
  const auth = inject(AdminAuthService);
  const router = inject(Router);
  return from(auth.accessToken()).pipe(switchMap(token => next(token ? request.clone({setHeaders: {Authorization: `Bearer ${token}`}}) : request)), catchError(error => {
    if (error instanceof HttpErrorResponse && error.status === 401) {
      auth.role.set(null);
      if (!request.url.endsWith('/session') && router.url.startsWith('/admin') && !router.url.startsWith('/admin/login')) void router.navigate(['/admin/login'], {queryParams: {returnUrl: router.url}});
    }
    return throwError(() => error);
  }));
};
