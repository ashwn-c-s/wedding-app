import { Component, computed, inject, signal, ViewChild, OnDestroy } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { firstValueFrom, map } from 'rxjs';
import { Nav } from '../../../shared/nav/nav';
import { Footer } from '../../../shared/footer/footer';
import { GalleryService } from '../../../core/services/gallery.service';
import { Photo } from '../../../core/models';
import { isValidInviteToken } from '../event-links';
import { PhotoViewer } from './photo-viewer';

@Component({
  selector: 'app-gallery',
  imports: [Nav, Footer, PhotoViewer],
  templateUrl: './gallery.html',
  styleUrl: './gallery.scss',
})
export class Gallery implements OnDestroy {
  private api = inject(GalleryService);
  private document = inject(DOCUMENT);
  private route = inject(ActivatedRoute);
  @ViewChild('viewer', { static: true }) viewer!: PhotoViewer;
  readonly token = toSignal(
    this.route.paramMap.pipe(
      map((params) => {
        const token = params.get('token');
        return isValidInviteToken(token) ? token : null;
      }),
    ),
    { initialValue: null },
  );
  readonly chapters = [
    {
      id: 'pre' as const,
      title: 'Before the wedding',
      number: '01',
      note: 'The beginning of our forever.',
    },
    {
      id: 'post' as const,
      title: 'The celebration',
      number: '02',
      note: 'All the love, all the little moments.',
    },
  ];
  photos = signal<Photo[]>([]);
  loading = signal(true);
  error = signal('');
  album = signal<'all' | 'pre' | 'post'>('all');
  index = signal<number | null>(null);
  failed = signal<Set<string>>(new Set());
  filtered = computed(() =>
    this.photos().filter((photo) => this.album() === 'all' || photo.album_type === this.album()),
  );
  featured = computed(() => this.filtered()[0] || null);
  selected = computed(() => {
    const index = this.index();
    return index === null ? null : this.filtered()[index] || null;
  });
  private scrollStyle: string | null = null;
  constructor() {
    void this.load();
  }
  async load() {
    this.loading.set(true);
    this.error.set('');
    try {
      this.photos.set((await firstValueFrom(this.api.list())).photos);
    } catch {
      this.error.set('Our photographs could not be loaded. Please try again.');
    } finally {
      this.loading.set(false);
    }
  }
  chapterPhotos(album: 'pre' | 'post') {
    return this.filtered().filter(
      (photo) => photo.album_type === album && photo.id !== this.featured()?.id,
    );
  }
  count(album: 'pre' | 'post') {
    return this.photos().filter((photo) => photo.album_type === album).length;
  }
  open(photo: Photo) {
    const index = this.filtered().findIndex((item) => item.id === photo.id);
    if (index < 0) return;
    this.index.set(index);
    this.scrollStyle = this.document.body.style.overflow;
    this.document.body.style.overflow = 'hidden';
    this.viewer.open();
  }
  close() {
    this.viewer.close();
    this.closed();
  }
  closed() {
    this.index.set(null);
    if (this.scrollStyle !== null) {
      this.document.body.style.overflow = this.scrollStyle;
      this.scrollStyle = null;
    }
  }
  move(direction: number) {
    const index = this.index();
    if (index === null || !this.filtered().length) return;
    this.index.set((index + direction + this.filtered().length) % this.filtered().length);
  }
  imageFailed(id: string) {
    this.failed.update((ids) => new Set([...ids, id]));
  }
  ngOnDestroy() {
    this.closed();
  }
}
