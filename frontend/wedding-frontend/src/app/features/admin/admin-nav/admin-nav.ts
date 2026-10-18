import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AdminAuthService } from '../../../core/services/admin-auth.service';
@Component({selector: 'app-admin-nav', imports: [RouterLink, RouterLinkActive], template: `
<nav aria-label="Administration"><a routerLink="/admin/dashboard" routerLinkActive="active">RSVP dashboard</a>
@if (auth.role() === 'full') {<a routerLink="/admin/guests" routerLinkActive="active">Guests</a><a routerLink="/admin/events" routerLinkActive="active">Events</a><a routerLink="/admin/gallery" routerLinkActive="active">Photos</a>}
<button type="button" (click)="logout()" [disabled]="busy()">{{ busy() ? 'Signing out…' : 'Sign out' }}</button></nav>
@if (error()) {<p role="alert">{{error()}}</p>}`, styles: [`nav {display:flex; flex-wrap:wrap; gap:1rem; align-items:center; border-bottom:1px solid #cdbb94; padding-bottom:1rem; margin-bottom:2rem} a {color:#214f38; text-decoration:none} a.active {text-decoration:underline; font-weight:bold} button {margin-left:auto; cursor:pointer; border:1px solid #214f38; padding:.6rem 1rem; border-radius:.4rem; color:#214f38; background:transparent} p {color:#94412e}`]})
export class AdminNav {
  readonly auth = inject(AdminAuthService);
  private router = inject(Router);
  busy = signal(false); error = signal('');
  async logout() { this.busy.set(true); this.error.set(''); try { await this.auth.logout(); await this.router.navigate(['/admin/login']); } catch { this.error.set('Unable to sign out. Please try again.'); } finally { this.busy.set(false); } }
}
