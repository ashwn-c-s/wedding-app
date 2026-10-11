import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { Gallery } from './gallery';
import { GalleryService } from '../../../core/services/gallery.service';
import { Photo } from '../../../core/models';

const photos: Photo[] = [
  { id: 'a', url: '/a.jpg', caption: 'Our first moment', album_type: 'pre', created_at: '' },
  { id: 'b', url: '/b.jpg', caption: 'Together', album_type: 'post', created_at: '' },
  { id: 'c', url: '/c.jpg', caption: null, album_type: 'pre', created_at: '' },
];
describe('Editorial gallery', () => {
  let fixture: ComponentFixture<Gallery>;
  let gallery: Gallery;
  let api: { list: ReturnType<typeof vi.fn> };
  beforeEach(async () => {
    api = { list: vi.fn(() => of({ photos })) };
    await TestBed.configureTestingModule({
      imports: [Gallery],
      providers: [provideRouter([]), { provide: GalleryService, useValue: api }],
    }).compileComponents();
    fixture = TestBed.createComponent(Gallery);
    gallery = fixture.componentInstance;
    await fixture.whenStable();
    const dialog = gallery.viewer.dialog.nativeElement;
    dialog.showModal = vi.fn();
    dialog.close = vi.fn();
  });
  it('features the first photo once and groups remaining photos into chapters', () => {
    expect(gallery.featured()?.id).toBe('a');
    expect(gallery.chapterPhotos('pre').map((photo) => photo.id)).toEqual(['c']);
    expect(gallery.chapterPhotos('post').map((photo) => photo.id)).toEqual(['b']);
    expect(fixture.nativeElement.querySelectorAll('main .photo-button').length).toBe(3);
  });
  it('filters albums and moves through only the visible photos with wraparound', () => {
    gallery.album.set('pre');
    gallery.open(photos[0]);
    gallery.move(-1);
    expect(gallery.selected()?.id).toBe('c');
    gallery.viewer.keys(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
    expect(gallery.selected()?.id).toBe('a');
    gallery.close();
    expect(gallery.selected()).toBeNull();
  });
  it('restores scroll on native dismissal and destruction', () => {
    document.body.style.overflow = 'auto';
    gallery.open(photos[0]);
    expect(document.body.style.overflow).toBe('hidden');
    gallery.closed();
    expect(document.body.style.overflow).toBe('auto');
    gallery.open(photos[0]);
    fixture.destroy();
    expect(document.body.style.overflow).toBe('auto');
    document.body.style.overflow = '';
  });
  it('recovers from a list error without showing a misleading empty gallery', async () => {
    api.list.mockReturnValueOnce(throwError(() => new Error('offline')));
    await gallery.load();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain(
      'could not be loaded',
    );
    await gallery.load();
    expect(gallery.error()).toBe('');
    expect(gallery.photos()).toHaveLength(3);
  });
  it('shows a clear empty chapter and a fallback for failed image loading', async () => {
    gallery.imageFailed('a');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Photograph unavailable');
    api.list.mockReturnValueOnce(of({ photos: [] }));
    await gallery.load();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Our story is still unfolding.');
  });
});
