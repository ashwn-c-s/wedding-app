import { Component, OnInit, OnDestroy, signal } from '@angular/core';

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

@Component({
  selector: 'app-countdown-timer',
  imports: [],
  templateUrl: './countdown-timer.html',
  styleUrl: './countdown-timer.scss',
})
export class CountdownTimer implements OnInit, OnDestroy {
  private weddingDate = new Date('2026-11-15T00:00:00');
  private intervalId: ReturnType<typeof setInterval> | null = null;

  timeLeft = signal<TimeLeft>({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  ngOnInit() {
    this.calculate();
    this.intervalId = setInterval(() => this.calculate(), 1000);
  }

  ngOnDestroy() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }

  private calculate() {
    const now = new Date().getTime();
    const target = this.weddingDate.getTime();
    const diff = target - now;

    if (diff <= 0) {
      this.timeLeft.set({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      return;
    }

    this.timeLeft.set({
      days: Math.floor(diff / (1000 * 60 * 60 * 24)),
      hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
      minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
      seconds: Math.floor((diff % (1000 * 60)) / 1000)
    });
  }

  get units() {
    const t = this.timeLeft();
    return [
      { label: 'Days', value: t.days },
      { label: 'Hours', value: t.hours },
      { label: 'Minutes', value: t.minutes },
      { label: 'Seconds', value: t.seconds }
    ];
  }
}
