import { Component, inject, signal, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { AdminNav } from '../admin-nav/admin-nav';
import {
  GalleryService,
  PhotoUpload,
  photoFileError,
} from '../../../core/services/gallery.service';
import { Photo } from '../../../core/models';

@Component({
  selector: 'app-admin-gallery',
  imports: [AdminNav, FormsModule, RouterLink],
  templateUrl: './gallery.html',
  styleUrls: ['../admin.scss', './gallery.scss'],
})
export class AdminGallery implements OnDestroy {
  private api = inject(GalleryService);
  photos = signal<Photo[]>([]);
  loading = signal(true);
  busy = signal(false);
  error = signal('');
  notice = signal('');
  stage = signal('');
  preview = signal('');
  file: File | null = null;
  album: 'pre' | 'post' = 'pre';
  caption = '';
  pending: PhotoUpload | null = null;
  constructor() {
    void this.load();
  }
  async load() {
    this.loading.set(true);
    this.error.set('');
    try {
      this.photos.set((await firstValueFrom(this.api.list())).photos);
    } catch {
      this.error.set('Unable to load the gallery. Please try again.');
    } finally {
      this.loading.set(false);
    }
  }
  select(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    this.clear();
    this.error.set('');
    this.notice.set('');
    if (!file) return;
    const error = photoFileError(file);
    if (error) {
      this.error.set(error);
      input.value = '';
      return;
    }
    this.file = file;
    this.preview.set(URL.createObjectURL(file));
  }
  async save(input: HTMLInputElement) {
    if (!this.file || this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    this.notice.set('');
    try {
      if (!this.pending) {
        this.stage.set('Optimizing photo…');
        const photo = await this.api.optimize(this.file);
        this.stage.set('Preparing upload…');
        const upload = await this.api.prepare(photo, this.album, this.caption);
        this.stage.set('Uploading photo…');
        await this.api.upload(photo, upload);
        this.pending = upload;
      }
      this.stage.set('Publishing photo…');
      const { photo } = await this.api.publish(this.pending);
      this.photos.update((photos) => [photo, ...photos.filter((item) => item.id !== photo.id)]);
      this.notice.set('Photo published to the gallery.');
      this.clear();
      this.caption = '';
      input.value = '';
    } catch (error) {
      this.error.set(
        error instanceof HttpErrorResponse
          ? error.error?.error || 'Unable to publish. Please try again.'
          : error instanceof Error
            ? error.message
            : 'Unable to upload photo.',
      );
    } finally {
      this.busy.set(false);
      this.stage.set('');
    }
  }
  clear() {
    if (this.preview()) URL.revokeObjectURL(this.preview());
    this.preview.set('');
    this.file = null;
    this.pending = null;
  }
  ngOnDestroy() {
    this.clear();
  }
}
