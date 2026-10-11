import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Photo } from '../models';

export interface PhotoUpload {
  path: string;
  token: string;
  intent: string;
}
export function photoFileError(file: File): string {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type))
    return 'Choose a JPEG, PNG or WebP photo. Convert HEIC photos before uploading.';
  if (file.size < 1 || file.size > 15 * 1024 * 1024) return 'Choose a photo smaller than 15 MB.';
  return '';
}
@Injectable({ providedIn: 'root' })
export class GalleryService {
  private http = inject(HttpClient);
  private base = environment.apiBaseUrl;
  list() {
    return this.http.get<{ photos: Photo[] }>(`${this.base}/api/gallery`);
  }
  async optimize(file: File): Promise<File> {
    const bitmap = await createImageBitmap(file).catch(() => {
      throw new Error('This photo could not be opened. Export it as JPEG, PNG or WebP and try again.');
    });
    try {
      const scale = Math.min(1, 2400 / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Unable to prepare this photo in your browser.');
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/webp', 0.88));
      if (!blob) throw new Error('Unable to prepare this photo. Please try again.');
      return new File([blob], 'photograph', {type: blob.type});
    } finally {
      bitmap.close();
    }
  }
  prepare(file: File, album: 'pre' | 'post', caption: string) {
    return firstValueFrom(
      this.http.post<PhotoUpload>(`${this.base}/api/admin/gallery/upload`, {
        type: file.type,
        size: file.size,
        album,
        caption,
      }),
    );
  }
  async upload(file: File, upload: PhotoUpload) {
    const { createClient } = await import('@supabase/supabase-js');
    const client = createClient(environment.supabaseUrl, environment.supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
    const { error } = await client.storage
      .from('wedding-photos')
      .uploadToSignedUrl(upload.path, upload.token, file, { contentType: file.type });
    if (error) throw new Error('Upload failed. Check your connection and try again.');
  }
  publish(upload: PhotoUpload) {
    return firstValueFrom(
      this.http.post<{ photo: Photo }>(`${this.base}/api/admin/gallery/publish`, {
        intent: upload.intent,
      }),
    );
  }
}
