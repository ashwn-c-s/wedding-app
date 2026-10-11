import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import type { SupabaseClient } from '@supabase/supabase-js';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AdminRole } from '../models/admin';

@Injectable({ providedIn: 'root' })
export class AdminAuthService {
  private http = inject(HttpClient);
  private browser = isPlatformBrowser(inject(PLATFORM_ID));
  private client: Promise<SupabaseClient> | null = null;
  readonly role = signal<AdminRole | null>(null);

  private supabase(): Promise<SupabaseClient> {
    if (!this.browser) throw new Error('Administrator login requires a browser.');
    if (!this.client) {
      this.client = import('@supabase/supabase-js').then(({createClient}) => {
        const client = createClient(environment.supabaseUrl, environment.supabaseAnonKey);
        client.auth.onAuthStateChange((_event, session) => { if (!session) this.role.set(null); });
        return client;
      }).catch(error => { this.client = null; throw error; });
    }
    return this.client;
  }
  async accessToken(): Promise<string | null> {
    if (!this.browser) return null;
    const { data, error } = await (await this.supabase()).auth.getSession();
    if (error) return null;
    return data.session?.access_token ?? null;
  }
  async authorize(): Promise<boolean> {
    this.role.set(null);
    if (!await this.accessToken()) return false;
    try {
      const session = await firstValueFrom(this.http.get<{role: AdminRole}>(`${environment.apiBaseUrl}/api/admin/session`));
      if (session.role !== 'full' && session.role !== 'restricted') return false;
      this.role.set(session.role);
      return true;
    } catch { return false; }
  }
  async login(email: string, password: string): Promise<void> {
    const { error } = await (await this.supabase()).auth.signInWithPassword({email: email.trim(), password});
    if (error) throw new Error('Unable to sign in. Check your email and password.');
    if (!await this.authorize()) {
      await this.logout();
      throw new Error('This account cannot access administration, or the administration service is unavailable.');
    }
  }
  async logout(): Promise<void> {
    if (this.browser) {
      const { error } = await (await this.supabase()).auth.signOut();
      if (error) throw new Error('Unable to sign out. Please try again.');
    }
    this.role.set(null);
  }
}
