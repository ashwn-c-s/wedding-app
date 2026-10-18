import { Component, inject, signal } from '@angular/core';
import { NavigationStart, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AdminAccessState } from '../../../core/services/admin-access-state';
@Component({
  selector:'app-admin-access-status',
  template:`@if(active() && (access.checking() || access.error())) {
    <section class="access-status" aria-label="Admin access">
      @if(access.checking()){<p role="status">Checking admin access…</p>}
      @if(access.error()){<p role="alert">{{access.error()}}</p><button type="button" (click)="retry()" [disabled]="access.checking()">Retry access check</button>}
    </section>
  }`,
  styles:[`:host{display:block}.access-status{position:relative;z-index:20;padding:1rem;background:#fffaf0;border-bottom:2px solid #214f38;color:#214f38;font:15px/1.5 Arial,sans-serif}.access-status p{margin:0 0 .5rem}button{min-height:44px;padding:.6rem 1rem;border:1px solid #214f38;background:#214f38;color:#fffaf0;border-radius:.4rem;cursor:pointer}button:focus-visible{outline:3px solid #94412e;outline-offset:3px}`],
})
export class AdminAccessStatus {
  readonly access = inject(AdminAccessState);
  private router = inject(Router);
  readonly active = signal(true);
  constructor() {
    this.router.events.pipe(takeUntilDestroyed()).subscribe(event => {
      if(event instanceof NavigationStart) this.active.set(/^\/admin(?:\/|$)/.test(event.url));
    });
  }
  retry() {
    const target = this.access.target();
    void this.router.navigateByUrl(/^\/admin(?:\/|$)/.test(target) && !target.startsWith('/admin/login') ? target : '/admin/dashboard', {onSameUrlNavigation:'reload'});
  }
}
