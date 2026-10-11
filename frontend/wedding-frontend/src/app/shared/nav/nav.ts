import { Component, inject, signal, Input } from '@angular/core';
import { ActivatedRoute, RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-nav',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './nav.html',
  styleUrl: './nav.scss',
})
export class Nav {
  private route = inject(ActivatedRoute);

  @Input() token: string | null = this.route.snapshot.params['token'] || null;
  mobileMenuOpen = signal(false);

  toggleMenu() {
    this.mobileMenuOpen.update(open => !open);
  }

  closeMenu() {
    this.mobileMenuOpen.set(false);
  }
}
