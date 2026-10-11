import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { GalleryService } from './gallery.service';

describe('Gallery photo optimization',()=>{
  afterEach(()=>{vi.unstubAllGlobals();vi.restoreAllMocks();});
  it('resizes large photos while preserving their aspect ratio and closes decoded bitmaps',async()=>{
    TestBed.configureTestingModule({providers:[provideHttpClient()]});
    const api=TestBed.inject(GalleryService);
    const bitmap={width:6000,height:4000,close:vi.fn()};
    vi.stubGlobal('createImageBitmap',vi.fn().mockResolvedValue(bitmap));
    const draw=vi.fn();
    vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue({drawImage:draw} as unknown as CanvasRenderingContext2D);
    vi.spyOn(HTMLCanvasElement.prototype,'toBlob').mockImplementation(function(this:HTMLCanvasElement,callback:BlobCallback,type?:string){
      expect(this.width).toBe(2400);expect(this.height).toBe(1600);expect(type).toBe('image/webp');callback(new Blob(['webp'],{type:'image/webp'}));
    });
    const file=await api.optimize(new File(['jpeg'],'photo.jpg',{type:'image/jpeg'}));
    expect(file.type).toBe('image/webp');expect(draw).toHaveBeenCalled();expect(bitmap.close).toHaveBeenCalledOnce();
  });
  it('rejects unreadable photos without requesting upload authorization',async()=>{
    TestBed.configureTestingModule({providers:[provideHttpClient()]});
    vi.stubGlobal('createImageBitmap',vi.fn().mockRejectedValue(new Error('invalid image')));
    await expect(TestBed.inject(GalleryService).optimize(new File(['bad'],'photo.jpg',{type:'image/jpeg'}))).rejects.toThrow('could not be opened');
  });
});
