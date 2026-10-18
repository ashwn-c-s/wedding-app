import { Injectable, signal } from '@angular/core';
@Injectable({providedIn:'root'})
export class AdminAccessState {
  readonly checking = signal(false);
  readonly error = signal('');
  readonly target = signal('/admin/dashboard');
}
export class AdminAccessUnavailable extends Error {
  constructor() { super('Unable to check admin access. Your session has been kept. Check your connection and retry.'); }
}
