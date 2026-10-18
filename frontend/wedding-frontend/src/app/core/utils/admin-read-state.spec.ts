import { TestBed } from '@angular/core/testing';
import { NEVER } from 'rxjs';
import { AdminReadState, adminRead } from './admin-read-state';
describe('Bounded admin reads',()=>{
  afterEach(()=>vi.useRealTimers());
  it('announces a slow read and clears its timer after completion',async()=>{
    vi.useFakeTimers();const state=TestBed.runInInjectionContext(()=>new AdminReadState());
    let resolve!:(value:string)=>void;const pending=state.run(()=>new Promise<string>(done=>resolve=done),()=>{},'Read failed');
    await vi.advanceTimersByTimeAsync(6000);expect(state.slow()).toBe(true);
    resolve('done');await pending;expect(state.slow()).toBe(false);expect(state.loaded()).toBe(true);expect(state.loading()).toBe(false);
  });
  it('ends a hung read after 20 seconds so Retry becomes available',async()=>{
    vi.useFakeTimers();const state=TestBed.runInInjectionContext(()=>new AdminReadState());
    const pending=state.run(()=>adminRead(NEVER),()=>{},'Read timed out. Please retry.');
    await vi.advanceTimersByTimeAsync(20000);await pending;
    expect(state.loading()).toBe(false);expect(state.loaded()).toBe(false);expect(state.error()).toContain('timed out');
  });
});
