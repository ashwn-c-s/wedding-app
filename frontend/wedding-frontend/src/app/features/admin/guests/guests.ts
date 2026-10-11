import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { AdminService } from '../../../core/services/admin.service';
import { AdminGuest, ImportReport } from '../../../core/models/admin';
import { invitationLink, whatsAppLink } from '../../../core/utils/admin';
import { AdminNav } from '../admin-nav/admin-nav';
@Component({selector:'app-admin-guests', imports:[FormsModule,AdminNav], templateUrl:'./guests.html', styleUrl:'../admin.scss'})
export class Guests {
  private api = inject(AdminService);
  guests = signal<AdminGuest[]>([]); search = signal(''); loading = signal(true); importing = signal(false); error = signal(''); notice = signal(''); report = signal<ImportReport | null>(null); csv = '';
  filtered = computed(() => this.guests().filter(guest => `${guest.name} ${guest.phone}`.toLowerCase().includes(this.search().trim().toLowerCase())));
  constructor() { void this.load(); }
  async load() { this.loading.set(true); this.error.set(''); try { this.guests.set((await firstValueFrom(this.api.guests())).guests); } catch { this.error.set('Unable to load guests. Check your session and try again.'); } finally { this.loading.set(false); } }
  async readFile(event: globalThis.Event) {
    const file = (event.target as HTMLInputElement).files?.[0]; if (!file) return;
    if (file.size > 500 * 1024) { this.error.set('Choose a CSV file no larger than 500 KB.'); return; }
    try { this.csv = await file.text(); this.error.set(''); } catch { this.error.set('Unable to read the CSV file.'); }
  }
  async importCsv() {
    if (this.importing()) return;
    this.error.set(''); this.report.set(null);
    if (!this.csv.trim()) { this.error.set('Choose a CSV file or paste CSV contents first.'); return; }
    this.importing.set(true);
    try { this.report.set(await firstValueFrom(this.api.importGuests(this.csv))); await this.load(); }
    catch (error) { this.error.set(error instanceof HttpErrorResponse && typeof error.error?.error === 'string' ? error.error.error : 'Import failed. Refresh the guest list before retrying; some rows may have been saved.'); }
    finally { this.importing.set(false); }
  }
  async copy(guest: AdminGuest) { try { await navigator.clipboard.writeText(invitationLink(window.location.origin, guest.invite_token)); this.notice.set(`Invitation link copied for ${guest.name}.`); } catch { this.error.set('Clipboard access failed. Copy the invitation link using its address below.'); } }
  link(guest: AdminGuest) { return invitationLink(window.location.origin, guest.invite_token); }
  whatsapp(guest: AdminGuest) { return whatsAppLink(window.location.origin,guest.invite_token,guest.name,guest.phone); }
}
