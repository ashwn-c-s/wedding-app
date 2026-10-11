import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { Nav } from '../../../shared/nav/nav';
import { Footer } from '../../../shared/footer/footer';
import { isValidInviteToken } from '../event-links';

@Component({
  selector: 'app-about',
  imports: [Nav, Footer],
  templateUrl: './about.html',
})
export class About {
  private route = inject(ActivatedRoute);
  readonly token = toSignal(this.route.paramMap.pipe(map(params => {
    const token = params.get('token');
    return isValidInviteToken(token) ? token : null;
  })), { initialValue: null });
}
