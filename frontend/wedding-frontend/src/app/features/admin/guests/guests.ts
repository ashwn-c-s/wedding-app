import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { AdminService } from '../../../core/services/admin.service';
import { AdminGuest, GuestTag, GuestUpdate, ImportReport } from '../../../core/models/admin';
import { Event } from '../../../core/models';
import { invitationLink, whatsAppLink } from '../../../core/utils/admin';
import { TagPicker } from '../tag-picker/tag-picker';
import { TagManager } from '../tag-manager/tag-manager';
import { matchesTag } from '../../../core/utils/tags';
import { AdminNav } from '../admin-nav/admin-nav';
@Component({
  selector: 'app-admin-guests',
  imports: [FormsModule, AdminNav, TagPicker, TagManager],
  templateUrl: './guests.html',
  styleUrls: ['../admin.scss','../tags.scss'],
})
export class Guests {
  private api = inject(AdminService);
  guests = signal<AdminGuest[]>([]);
  search = signal('');
  tagFilter = signal('');
  tags = signal<GuestTag[]>([]);
  catalogue = computed(() => this.tags().map(tag => ({...tag,guest_count:this.guests().filter(guest=>guest.tags?.some(label=>label.id===tag.id)).length})).sort((a,b)=>a.name.localeCompare(b.name)));
  loading = signal(true);
  importing = signal(false);
  error = signal('');
  notice = signal('');
  report = signal<ImportReport | null>(null);
  csv = '';
  filtered = computed(() =>
    this.guests().filter((guest) =>
      `${guest.name} ${guest.phone}`.toLowerCase().includes(this.search().trim().toLowerCase()) && matchesTag(guest.tags,this.tagFilter()),
    ),
  );
  events = signal<Event[]>([]);
  saving = signal(false);
  editingId = '';
  draft: GuestUpdate | null = null;
  assignmentsLocked = false;
  constructor() {
    void this.load();
  }
  async load() {
    this.loading.set(true);
    this.error.set('');
    try {
      const [guests, events] = await Promise.all([
        firstValueFrom(this.api.guests()),
        firstValueFrom(this.api.events()),
      ]);
      this.guests.set(guests.guests);
      this.tags.set(guests.tags || []);
      this.events.set(events.events);
    } catch {
      this.error.set('Unable to load guests and events. Check your session and try again.');
    } finally {
      this.loading.set(false);
    }
  }
  add() {
    this.editingId = '';
    this.assignmentsLocked = false;
    this.draft = { name: '', phone: '', party_size: 1, event_ids: [] };
    this.error.set('');
    this.notice.set('');
  }
  edit(guest: AdminGuest) {
    this.editingId = guest.id;
    this.assignmentsLocked = guest.responses.length > 0;
    this.draft = {
      name: guest.name,
      phone: guest.phone,
      party_size: guest.party_size,
      event_ids: [...guest.event_ids],
      ...(guest.tags ? {tag_ids:guest.tags.map(tag=>tag.id),new_tags:[]} : {}),
    };
    this.error.set('');
    this.notice.set('');
  }
  setTags(selection:{tag_ids:string[];new_tags:string[]}) {if(this.draft)this.draft={...this.draft,...selection};}
  renameTag(tag:GuestTag) {
    this.tags.update(tags=>tags.map(existing=>existing.id===tag.id?{...existing,name:tag.name}:existing));
    this.guests.update(guests=>guests.map(guest=>({...guest,tags:guest.tags?.map(existing=>existing.id===tag.id?{...existing,name:tag.name}:existing)})));
    this.notice.set('Tag renamed for all associated guests.');
  }
  toggleEvent(id: string, checked: boolean) {
    if (!this.draft || this.assignmentsLocked) return;
    this.draft.event_ids = checked
      ? [...this.draft.event_ids, id]
      : this.draft.event_ids.filter((eventId) => eventId !== id);
  }
  eventNames(guest: AdminGuest) {
    return (
      guest.event_ids
        .map((id) => this.events().find((event) => event.id === id)?.name || 'Unavailable event')
        .join(', ') || 'No events assigned'
    );
  }
  async save() {
    if (this.saving() || !this.draft) return;
    const update = {
      ...this.draft,
      name: this.draft.name.trim(),
      phone: this.draft.phone.trim(),
      event_ids: [...this.draft.event_ids],
    };
    if (
      !update.name ||
      !update.phone ||
      !Number.isInteger(update.party_size) ||
      update.party_size < 1 ||
      update.party_size > 1000 ||
      !update.event_ids.length
    ) {
      this.error.set(
        'Enter a name, phone, party size from 1 to 1000, and select at least one event.',
      );
      return;
    }
    this.saving.set(true);
    this.error.set('');
    this.notice.set('');
    try {
      const { guest } = await firstValueFrom(
        this.editingId ? this.api.saveGuest(this.editingId, update) : this.api.createGuest(update),
      );
      this.guests.update((guests) =>
        [...guests.filter((existing) => existing.id !== guest.id), guest].sort((a, b) =>
          a.name.localeCompare(b.name),
        ),
      );
      this.tags.update(tags=>[...new Map([...tags,...(guest.tags || [])].map(tag=>[tag.id,tag])).values()]);
      this.draft = null;
      this.notice.set(
        this.editingId
          ? 'Guest updated. Their invitation link is unchanged.'
          : 'Guest added. You can now share their invitation.',
      );
    } catch (error) {
      const message =
        error instanceof HttpErrorResponse && typeof error.error?.error === 'string'
          ? error.error.error
          : 'Unable to save guest. Refresh the list before retrying.';
      await this.load();
      this.error.set(message);
      // Preserve unsaved guest details and tag selections for correction/retry.
    } finally {
      this.saving.set(false);
    }
  }
  async readFile(event: globalThis.Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    if (file.size > 500 * 1024) {
      this.error.set('Choose a CSV file no larger than 500 KB.');
      return;
    }
    try {
      this.csv = await file.text();
      this.error.set('');
    } catch {
      this.error.set('Unable to read the CSV file.');
    }
  }
  async importCsv() {
    if (this.importing()) return;
    this.error.set('');
    this.report.set(null);
    if (!this.csv.trim()) {
      this.error.set('Choose a CSV file or paste CSV contents first.');
      return;
    }
    this.importing.set(true);
    try {
      this.report.set(await firstValueFrom(this.api.importGuests(this.csv)));
      await this.load();
    } catch (error) {
      this.error.set(
        error instanceof HttpErrorResponse && typeof error.error?.error === 'string'
          ? error.error.error
          : 'Import failed. Refresh the guest list before retrying; some rows may have been saved.',
      );
    } finally {
      this.importing.set(false);
    }
  }
  async copy(guest: AdminGuest) {
    try {
      await navigator.clipboard.writeText(
        invitationLink(window.location.origin, guest.invite_token),
      );
      this.notice.set(`Invitation link copied for ${guest.name}.`);
    } catch {
      this.error.set('Clipboard access failed. Copy the invitation link using its address below.');
    }
  }
  link(guest: AdminGuest) {
    return invitationLink(window.location.origin, guest.invite_token);
  }
  whatsapp(guest: AdminGuest) {
    return whatsAppLink(
      window.location.origin, guest.invite_token, guest.name, guest.phone,
      this.events().filter(event => guest.event_ids.includes(event.id)),
    );
  }
}
