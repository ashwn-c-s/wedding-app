import { Component, DestroyRef, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin } from 'rxjs';
import { Subscription } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { GuestInvite, RsvpStatus } from '../../../core/models';
import { Nav } from '../../../shared/nav/nav';
import { Footer } from '../../../shared/footer/footer';
import { isValidInviteToken } from '../event-links';

@Component({ selector: 'app-rsvp-confirmed', imports: [Nav, Footer, RouterLink], templateUrl: './rsvp-confirmed.html', styleUrl: './rsvp-confirmed.scss' })
export class RsvpConfirmed {
  private api = inject(ApiService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);
  token: string = this.route.snapshot.params['token'] || '';
  invite = signal<GuestInvite | null>(null);
  status = signal<RsvpStatus | null>(null);
  loading = signal(true);
  error = signal('');

  private request?: Subscription;

  constructor() {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(params => {
      this.token = params.get('token') || '';
      this.load();
    });
  }

  load(): void {
    this.request?.unsubscribe();
    if (!isValidInviteToken(this.token)) { void this.router.navigate(this.token ? ['/invite', this.token] : ['/']); return; }
    this.loading.set(true); this.error.set(''); this.invite.set(null); this.status.set(null);
    this.request = forkJoin({invite: this.api.getInvite(this.token), status: this.api.getRsvpStatus(this.token)})
      .pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: ({invite, status}) => {
          if (!status.submitted) { void this.router.navigate(['/invite', this.token, 'rsvp']); return; }
          this.invite.set(invite); this.status.set(status); this.loading.set(false);
        },
        error: error => {
          this.loading.set(false);
          if ([400, 401, 403, 404, 410].includes(error.status)) { void this.router.navigate(['/invite', this.token]); return; }
          this.error.set('We could not load your saved RSVP. Please try again.');
        }
      });
  }

  eventName(eventId: string): string {
    return this.invite()?.events.find(event => event.id === eventId)?.name || 'Wedding event';
  }
}
