import { Component, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map, catchError, EMPTY } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { CountdownTimer } from '../../../shared/countdown-timer/countdown-timer';
import { RouterLink } from '@angular/router';
import { Nav } from '../../../shared/nav/nav';

import { NgOptimizedImage } from '@angular/common';
@Component({
  selector: 'app-landing',
  imports: [CountdownTimer, RouterLink, DatePipe, Nav, NgOptimizedImage],
  templateUrl: './landing.html',
  styleUrl: './landing.scss',
})
export class Landing {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private api = inject(ApiService);

  public token = this.route.snapshot.params['token'];
  invite = toSignal(
    this.api.getInvite(this.token).pipe(
      catchError(() => {
        this.router.navigate(['/invalid-invite']);
        return EMPTY;
      })
    )
  );
}
