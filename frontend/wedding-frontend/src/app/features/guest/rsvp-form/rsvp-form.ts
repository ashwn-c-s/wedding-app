import { Component, DestroyRef, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin } from 'rxjs';
import { Subscription } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { GuestInvite, RsvpResponse } from '../../../core/models';
import { Nav } from '../../../shared/nav/nav';
import { Footer } from '../../../shared/footer/footer';
import { isValidInviteToken } from '../event-links';

@Component({ selector: 'app-rsvp-form', imports: [Nav, Footer, DatePipe], templateUrl: './rsvp-form.html', styleUrl: './rsvp-form.scss' })
export class RsvpForm {
  private api = inject(ApiService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);
  token: string = this.route.snapshot.params['token'] || '';
  invite = signal<GuestInvite | null>(null);
  loading = signal(true);
  submitting = signal(false);
  reviewing = signal(false);
  error = signal('');
  validationAttempted = signal(false);
  selections = signal<Record<string, boolean>>({});

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
    this.loading.set(true);
    this.error.set('');
    this.invite.set(null); this.selections.set({}); this.reviewing.set(false); this.submitting.set(false); this.validationAttempted.set(false);
    this.request = forkJoin({ invite: this.api.getInvite(this.token), status: this.api.getRsvpStatus(this.token) })
      .pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: ({invite, status}) => {
          if (status.submitted) { void this.router.navigate(['/invite', this.token, 'rsvp', 'confirmed']); return; }
          this.invite.set(invite); this.loading.set(false);
        },
        error: error => {
          this.loading.set(false);
          if ([400, 401, 403, 404, 410].includes(error.status)) { void this.router.navigate(['/invite', this.token]); return; }
          this.error.set('We could not load your RSVP. Please try again.');
        }
      });
  }

  choose(eventId: string, attending: boolean): void {
    if (this.submitting() || this.reviewing()) return;
    this.selections.update(current => ({ ...current, [eventId]: attending }));
  }

  review(): void {
    this.validationAttempted.set(true);
    const events = this.invite()?.events || [];
    if (events.length && events.every(event => typeof this.selections()[event.id] === 'boolean')) {
      this.error.set(''); this.reviewing.set(true);
    }
  }

  submit(): void {
    if (!this.reviewing() || this.submitting()) return;
    const events = this.invite()?.events || [];
    if (!events.length || !events.every(event => typeof this.selections()[event.id] === 'boolean')) return;
    const responses: RsvpResponse[] = events.map(event => ({ event_id: event.id, attending: this.selections()[event.id] }));
    this.submitting.set(true); this.error.set('');
    this.request = this.api.submitRsvp(this.token, responses).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: result => {
        if (result.success) void this.router.navigate(['/invite', this.token, 'rsvp', 'confirmed']);
        else { this.submitting.set(false); this.error.set('Your RSVP was not saved. Please try again.'); }
      },
      error: error => {
        this.submitting.set(false);
        if (error.status === 409) { void this.router.navigate(['/invite', this.token, 'rsvp', 'confirmed']); return; }
        if ([401, 403, 404, 410].includes(error.status)) { void this.router.navigate(['/invite', this.token]); return; }
        this.error.set('Your RSVP could not be saved. Please try again.');
      }
    });
  }
}
