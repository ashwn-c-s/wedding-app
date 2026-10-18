import { DestroyRef, inject, signal } from '@angular/core';
import { firstValueFrom, Observable, timeout } from 'rxjs';

export function adminRead<T>(source: Observable<T>): Promise<T> {
  return firstValueFrom(source.pipe(timeout({first: 20000})));
}

/** Read state is independent of mutation feedback; generations reject obsolete responses. */
export class AdminReadState {
  readonly loading = signal(true);
  readonly loaded = signal(false);
  readonly error = signal('');
  readonly slow = signal(false);
  private generation = 0;
  private timer?: ReturnType<typeof setTimeout>;
  constructor() { inject(DestroyRef).onDestroy(() => this.cancel()); }
  cancel() {
    this.generation++;
    clearTimeout(this.timer);
    this.loading.set(false);
    this.slow.set(false);
  }
  async run<T>(read: () => Promise<T>, apply: (value: T) => void, message: string): Promise<boolean> {
    this.cancel();
    const generation = this.generation;
    this.loading.set(true);
    this.error.set('');
    this.timer = setTimeout(() => { if (generation === this.generation) this.slow.set(true); }, 6000);
    try {
      const value = await read();
      if (generation !== this.generation) return false;
      apply(value);
      this.loaded.set(true);
      return true;
    } catch {
      if (generation === this.generation) this.error.set(message);
      return false;
    } finally {
      if (generation === this.generation) {
        clearTimeout(this.timer);
        this.loading.set(false);
        this.slow.set(false);
      }
    }
  }
}
