import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CountdownTimer } from './countdown-timer';
import { vi } from 'vitest';

describe('CountdownTimer', () => {
  let component: CountdownTimer;
  let fixture: ComponentFixture<CountdownTimer>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CountdownTimer],
    }).compileComponents();

    fixture = TestBed.createComponent(CountdownTimer);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  afterEach(() => vi.useRealTimers());

  it('switches from the countdown to wedding day and thank-you messages at India midnight', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-14T18:29:58Z'));
    component.ngOnDestroy();
    component.ngOnInit();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Seconds');
    expect(component.timeLeft().seconds).toBe(2);
    vi.advanceTimersByTime(1000);
    expect(component.timeLeft().seconds).toBe(1);
    vi.advanceTimersByTime(1000);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Today is our wedding day!');
    vi.advanceTimersByTime(24 * 60 * 60 * 1000);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Thank you for celebrating with us');
    component.ngOnDestroy();
  });
});
