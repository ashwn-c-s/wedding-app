import { Component, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map, catchError, EMPTY } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { CountdownTimer } from '../../../shared/countdown-timer/countdown-timer';

@Component({
  selector: 'app-landing',
  imports: [CountdownTimer],
  templateUrl: './landing.html',
  styleUrl: './landing.scss',
})
export class Landing {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private api = inject(ApiService);

  private token = this.route.snapshot.params['token'];
  invite = toSignal(
    this.api.getInvite(this.token).pipe(
      catchError(() => {
        this.router.navigate(['/invalid-invite']);
        return EMPTY;
      })
    )
  );
}
