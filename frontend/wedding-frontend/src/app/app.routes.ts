import { Routes } from '@angular/router';

export const routes: Routes = [
  // Guest routes
  {
    path: 'invite/:token',
    loadComponent: () =>
      import('./features/guest/landing/landing').then(m => m.Landing)
  },
  {
    path: 'invite/:token/rsvp',
    loadComponent: () =>
      import('./features/guest/rsvp-form/rsvp-form').then(m => m.RsvpForm)
  },
  {
    path: 'invite/:token/rsvp/confirmed',
    loadComponent: () =>
      import('./features/guest/rsvp-confirmed/rsvp-confirmed').then(m => m.RsvpConfirmed)
  },
  {
    path: 'invite/:token/venues',
    loadComponent: () =>
      import('./features/guest/venue/venue').then(m => m.Venue)
  },
  {
    path: 'invite/:token/gallery',
    loadComponent: () =>
      import('./features/guest/gallery/gallery').then(m => m.Gallery)
  },
  {
    path: 'invalid-invite',
    loadComponent: () =>
      import('./features/guest/invalid-invite/invalid-invite').then(m => m.InvalidInvite)
  },
  // Admin routes
  {
    path: 'admin/login',
    loadComponent: () =>
      import('./features/admin/login/login').then(m => m.Login)
  },
  {
    path: '',
    redirectTo: 'invalid-invite',
    pathMatch: 'full'
  }
];