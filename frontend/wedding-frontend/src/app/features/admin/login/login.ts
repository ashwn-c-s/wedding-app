import { AdminAccessState } from '../../../core/services/admin-access-state';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AdminAuthService } from '../../../core/services/admin-auth.service';
@Component({selector: 'app-login', imports: [FormsModule], templateUrl: './login.html', styleUrl: '../admin.scss'})
export class Login {
  private access = inject(AdminAccessState);
  private auth = inject(AdminAuthService); private router = inject(Router); private route = inject(ActivatedRoute);
  email = ''; password = ''; busy = signal(false); error = signal('');
  async submit() {
    if (this.busy()) return;
    this.error.set('');
    if (!this.email.trim() || !this.password) { this.error.set('Enter your email and password.'); return; }
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
    this.access.target.set(returnUrl && /^\/admin(?:\/|$)/.test(returnUrl) && !returnUrl.startsWith('/admin/login') ? returnUrl : '/admin/dashboard');
    this.busy.set(true);
    try {
      await this.auth.login(this.email, this.password);
      this.password = '';
      const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
      await this.router.navigateByUrl(returnUrl && /^\/admin(?:\/|$)/.test(returnUrl) && !returnUrl.startsWith('/admin/login') ? returnUrl : '/admin/dashboard');
    } catch (error) { this.error.set(error instanceof Error ? error.message : 'Unable to sign in. Please try again.'); }
    finally { this.busy.set(false); }
  }
}
