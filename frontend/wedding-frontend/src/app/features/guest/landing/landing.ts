import { Component, DestroyRef, inject, signal } from '@angular/core';
import { DatePipe, NgOptimizedImage } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, map, throwError } from 'rxjs';
import { Subscription } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { CountdownTimer } from '../../../shared/countdown-timer/countdown-timer';
import { Footer } from '../../../shared/footer/footer';
import { Nav } from '../../../shared/nav/nav';
import { Event, GuestInvite } from '../../../core/models';
import { directionsUrl, isValidInviteToken } from '../event-links';
import { eventImage } from '../event-images';

@Component({
  selector: 'app-landing',
  imports: [CountdownTimer, DatePipe, Nav, Footer, NgOptimizedImage, RouterLink],
  templateUrl: './landing.html',
  styleUrl: './landing.scss',
})
export class Landing {
  private route = inject(ActivatedRoute);
  private api = inject(ApiService);
  private destroyRef = inject(DestroyRef);
  token: string | null = this.route.snapshot.params['token'] || null;
  invite = signal<GuestInvite | null>(null);
  events = signal<Event[]>([]);
  loading = signal(true);
  error = signal('');

  private request?: Subscription;

  constructor() {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(params => {
      this.token = params.get('token');
      this.load();
    });
  }

  load(): void {
    this.request?.unsubscribe();
    this.loading.set(true);
    this.error.set('');
    this.invite.set(null);
    this.events.set([]);
    const publicEvents = () => this.api.getDefaultEvents().pipe(map(result => ({ invite: null, events: result.venues })));
    const request = isValidInviteToken(this.token)
      ? this.api.getInvite(this.token).pipe(
          map(invite => ({ invite, events: invite.events })),
          catchError(error => [400, 401, 403, 404, 410].includes(error.status) ? publicEvents() : throwError(() => error)))
      : publicEvents();
    this.request = request.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: result => { this.invite.set(result.invite); this.events.set(result.events); this.loading.set(false); },
      error: () => { this.error.set('We could not load the event details. Please try again.'); this.loading.set(false); }
    });
  }

  getDirectionsUrl = directionsUrl;
  getEventImage = eventImage;

  getCalendarUrl(event: Event): string {
    const start = new Date(event.date);
    if (Number.isNaN(start.getTime())) return '';
    const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(event.date);
    // A display label does not define an exact end time. Date-only events are
    // all-day reminders with the supplied schedule retained in the description.
    const format = (date: Date) => date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    const nextDay = new Date(start.getTime() + 24 * 60 * 60 * 1000);
    const dates = dateOnly
      ? `${format(start).slice(0, 8)}/${format(nextDay).slice(0, 8)}`
      : `${format(start)}/${format(start)}`;
    const params = new URLSearchParams({
      action: 'TEMPLATE', text: event.name, dates,
      ctz: 'Asia/Kolkata',
      location: [event.venue_name, event.venue_address].filter(Boolean).join(', '),
      details: `Join us for ${event.name}. ${event.time_label || ''}`.trim()
    });
    return `https://calendar.google.com/calendar/render?${params}`;
  }
}
