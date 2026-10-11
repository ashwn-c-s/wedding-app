import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AdminGallery } from './gallery';
import { GalleryService, photoFileError } from '../../../core/services/gallery.service';
import { AdminAuthService } from '../../../core/services/admin-auth.service';

const photo = {
  id: 'a',
  url: '/photo.jpg',
  album_type: 'pre',
  caption: 'A moment',
  created_at: '',
};
const upload = { path: 'pre/a.jpg', token: 'storage-token', intent: 'proof' };
describe('Admin photo publication', () => {
  it('rejects unsupported and oversized uploads before requesting authorization', () => {
    expect(photoFileError(new File(['x'], 'photo.heic', { type: 'image/heic' }))).toContain(
      'Convert HEIC',
    );
    const big = new File(['x'], 'photo.jpg', { type: 'image/jpeg' });
    Object.defineProperty(big, 'size', { value: 16 * 1024 * 1024 });
    expect(photoFileError(big)).toContain('15 MB');
    expect(photoFileError(new File(['x'], 'photo.jpg', { type: 'image/jpeg' }))).toBe('');
  });
  it('retries metadata publication without uploading the photo twice', async () => {
    const api = {
      list: vi.fn(() => of({ photos: [] })),
      optimize: vi.fn((file: File) => Promise.resolve(file)),
      prepare: vi.fn().mockResolvedValue(upload),
      upload: vi.fn().mockResolvedValue(undefined),
      publish: vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue({ photo }),
    };
    await TestBed.configureTestingModule({
      imports: [AdminGallery],
      providers: [
        provideRouter([]),
        { provide: GalleryService, useValue: api },
        { provide: AdminAuthService, useValue: { role: () => 'full' } },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(AdminGallery);
    await fixture.whenStable();
    const component = fixture.componentInstance;
    component.file = new File(['x'], 'photo.jpg', { type: 'image/jpeg' });
    const input = document.createElement('input');
    input.type = 'file';
    await component.save(input);
    expect(component.pending).toEqual(upload);
    expect(component.error()).toBe('offline');
    await component.save(input);
    expect(api.prepare).toHaveBeenCalledTimes(1);
    expect(api.upload).toHaveBeenCalledTimes(1);
    expect(api.publish).toHaveBeenCalledTimes(2);
    expect(component.photos()).toEqual([photo]);
    expect(component.pending).toBeNull();
    expect(component.notice()).toContain('published');
  });
});
