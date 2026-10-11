import { Component, ElementRef, ViewChild, input, output, signal } from '@angular/core';
import { Photo } from '../../../core/models';

@Component({
  selector: 'app-photo-viewer',
  templateUrl: './photo-viewer.html',
  styleUrl: './photo-viewer.scss',
})
export class PhotoViewer {
  readonly photo = input<Photo | null>(null);
  readonly count = input(0);
  readonly index = input<number | null>(null);
  readonly step = output<number>();
  readonly dismiss = output<void>();
  readonly failed = signal<Set<string>>(new Set());
  @ViewChild('viewer', { static: true }) dialog!: ElementRef<HTMLDialogElement>;
  private touch: { x: number; y: number } | null = null;
  open() {
    this.dialog.nativeElement.showModal();
  }
  close() {
    this.dialog.nativeElement.close();
  }
  imageFailed(id: string) {
    this.failed.update((ids) => new Set([...ids, id]));
  }
  keys(event: KeyboardEvent) {
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      event.preventDefault();
      this.step.emit(event.key === 'ArrowRight' ? 1 : -1);
    }
  }
  touchStart(event: TouchEvent) {
    const point = event.touches[0];
    this.touch = point ? { x: point.clientX, y: point.clientY } : null;
  }
  touchEnd(event: TouchEvent) {
    const point = event.changedTouches[0];
    if (this.touch && point) {
      const dx = point.clientX - this.touch.x,
        dy = point.clientY - this.touch.y;
      if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) this.step.emit(dx < 0 ? 1 : -1);
    }
    this.touch = null;
  }
}
