import { Component, input, output } from '@angular/core';
import { AdminReadState } from '../../../core/utils/admin-read-state';
@Component({
  selector: 'app-admin-read-status',
  template: `<section class="read-status" [attr.aria-label]="label() + ' loading status'">
    <div class="read-toolbar">
      <p role="status" aria-live="polite">
        @if (state().loading()) {
          {{ state().loaded() ? 'Refreshing' : 'Loading' }} {{ label() }}…
          @if (state().slow()) {
            This is taking longer than usual. Please wait, or retry when this request finishes.
          }
        } @else if (state().loaded() && !state().error()) {
          {{ label() }} loaded.
        }
      </p>
      <button type="button" (click)="retry.emit()" [disabled]="state().loading() || disabled()">
        {{
          state().error()
            ? 'Retry'
            : state().loading() && state().loaded()
              ? 'Refreshing…'
              : 'Refresh'
        }}
      </button>
    </div>
    @if (state().error()) {
      <p class="read-error" role="alert">
        {{ state().error() }}
        @if (state().loaded()) {
          Showing previously loaded data.
        }
      </p>
    }
    @if (!state().loaded() && state().loading()) {
      <div
        class="skeletons"
        [class.metrics]="shape() === 'metrics'"
        [class.photos]="shape() === 'photos'"
        [class.cards]="shape() === 'cards'"
        aria-hidden="true"
      >
        <div class="skeleton"></div>
        <div class="skeleton"></div>
        <div class="skeleton"></div>
        @if (shape() === 'metrics') {
          <div class="skeleton"></div>
          <div class="skeleton"></div>
        }
      </div>
    }
  </section>`,
  styles: [
    `
      :host {
        display: block;
        margin: 0.75rem 0 1rem;
        font:
          14px/1.5 'DM Sans',
          sans-serif;
        color: #475569;
      }
      .read-toolbar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.75rem;
        min-height: 44px;
      }
      p {
        margin: 0.4rem 0;
      }
      .read-toolbar p {
        flex: 1;
      }
      button {
        min-height: 44px;
        border: 1px solid #2563eb;
        border-radius: 0.5rem;
        padding: 0.5rem 0.85rem;
        background: #ffffff;
        color: #2563eb;
        cursor: pointer;
        font: inherit;
      }
      button:disabled {
        opacity: 0.6;
        cursor: wait;
      }
      button:focus-visible {
        outline: 3px solid #2563eb;
        outline-offset: 3px;
      }
      .read-error {
        border-left: 3px solid #9f1239;
        padding: 0.5rem 0.75rem;
        color: #9f1239;
      }
      .skeletons {
        display: grid;
        gap: 0.75rem;
        padding: 0.75rem 0;
      }
      .skeleton {
        height: 64px;
        border-radius: 0.6rem;
        background: #e2e8f0;
        animation: breathe 1.8s ease-in-out infinite;
      }
      .metrics,
      .photos {
        grid-template-columns: repeat(auto-fit, minmax(min(100%, 180px), 1fr));
      }
      .cards {
        grid-template-columns: repeat(auto-fit, minmax(min(100%, 280px), 1fr));
      }
      .cards .skeleton {
        height: 245px;
      }
      .metrics .skeleton {
        height: 110px;
      }
      .photos .skeleton {
        height: 220px;
      }
      @keyframes breathe {
        50% {
          opacity: 0.55;
        }
      }
      @media (prefers-reduced-motion: reduce) {
        .skeleton {
          animation: none;
        }
      }
    `,
  ],
})
export class AdminReadStatus {
  state = input.required<AdminReadState>();
  label = input.required<string>();
  shape = input<'rows' | 'cards' | 'metrics' | 'photos'>('rows');
  disabled = input(false);
  retry = output<void>();
}
