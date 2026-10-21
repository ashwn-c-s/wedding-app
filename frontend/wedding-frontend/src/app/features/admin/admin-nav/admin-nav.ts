import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AdminAuthService } from '../../../core/services/admin-auth.service';
@Component({
  selector: 'app-admin-nav',
  imports: [RouterLink, RouterLinkActive],
  template: ` <nav aria-label="Administration">
      <a routerLink="/admin/dashboard" routerLinkActive="active" ariaCurrentWhenActive="page"
        >Overview</a
      >
      @if (auth.role() === 'full') {
        <a routerLink="/admin/guests" routerLinkActive="active" ariaCurrentWhenActive="page"
          >Guests</a
        ><a routerLink="/admin/events" routerLinkActive="active" ariaCurrentWhenActive="page"
          >Events</a
        >
        <a routerLink="/admin/gallery" routerLinkActive="active" ariaCurrentWhenActive="page"
          >Photos</a
        >
      }
      <button type="button" (click)="logout()" [disabled]="busy()">
        {{ busy() ? 'Signing out…' : 'Sign out' }}
      </button>
    </nav>
    @if (error()) {
      <p role="alert">{{ error() }}</p>
    }`,
  styleUrl: './admin-nav.scss',
})
export class AdminNav {
  readonly auth = inject(AdminAuthService);
  private router = inject(Router);
  busy = signal(false);
  error = signal('');
  async logout() {
    this.busy.set(true);
    this.error.set('');
    try {
      await this.auth.logout();
      await this.router.navigate(['/admin/login']);
    } catch {
      this.error.set('Unable to sign out. Please try again.');
    } finally {
      this.busy.set(false);
    }
  }
}
