import { Component, DestroyRef, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, throwError } from 'rxjs';
import { Subscription } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { Event } from '../../../core/models';
import { Nav } from '../../../shared/nav/nav';
import { Footer } from '../../../shared/footer/footer';
import { directionsUrl, isValidInviteToken } from '../event-links';

@Component({ selector: 'app-venue', imports: [Nav, Footer, DatePipe], templateUrl: './venue.html', styleUrl: './venue.scss' })
export class Venue {
  private route = inject(ActivatedRoute);
  private api = inject(ApiService);
  private destroyRef = inject(DestroyRef);
  token: string | null = this.route.snapshot.params['token'] || null;

  events = signal<Event[]>([]);
  loading = signal(true);
  error = signal('');
  getDirectionsUrl = directionsUrl;

  private request?: Subscription;

  constructor() {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(params => {
      this.token = params.get('token');
      this.load();
    });
  }

  load(): void {
    this.request?.unsubscribe();
    this.loading.set(true); this.error.set(''); this.events.set([]);
    if (!isValidInviteToken(this.token)) this.token = null;
    const request = this.token ? this.api.getVenues(this.token).pipe(catchError(error => {
      if ([400, 401, 403, 404, 410].includes(error.status)) { this.token = null; return this.api.getDefaultEvents(); }
      return throwError(() => error);
    })) : this.api.getDefaultEvents();
    this.request = request.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: result => { this.events.set(result.venues); this.loading.set(false); },
      error: () => { this.error.set('We could not load the venue details. Please try again.'); this.loading.set(false); }
    });
  }
}
