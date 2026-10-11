import { Routes } from '@angular/router';
import { adminGuard, fullAdminGuard } from './core/guards/admin.guard';

const landing = () => import('./features/guest/landing/landing').then(m => m.Landing);

export const routes: Routes = [
  { path: 'invite/:token/rsvp/confirmed', title: 'RSVP confirmation · Ashwin & Amritha', loadComponent: () => import('./features/guest/rsvp-confirmed/rsvp-confirmed').then(m => m.RsvpConfirmed) },
  { path: 'invite/:token/rsvp', title: 'RSVP · Ashwin & Amritha', loadComponent: () => import('./features/guest/rsvp-form/rsvp-form').then(m => m.RsvpForm) },
  { path: 'invite/:token/venues', title: 'Venues · Ashwin & Amritha', loadComponent: () => import('./features/guest/venue/venue').then(m => m.Venue) },
  { path: 'invite/:token/about', title: 'About us · Ashwin & Amritha', loadComponent: () => import('./features/guest/about/about').then(m => m.About) },
  { path: 'invite/:token/gallery', title: 'Photo journal · Ashwin & Amritha', loadComponent: () => import('./features/guest/gallery/gallery').then(m => m.Gallery) },
  { path: 'invite/:token', title: 'Your invitation · Ashwin & Amritha', loadComponent: landing },
  { path: 'gallery', title: 'Photo journal · Ashwin & Amritha', loadComponent: () => import('./features/guest/gallery/gallery').then(m => m.Gallery) },
  { path: 'about', title: 'About us · Ashwin & Amritha', loadComponent: () => import('./features/guest/about/about').then(m => m.About) },
  { path: 'venues', title: 'Venues · Ashwin & Amritha', loadComponent: () => import('./features/guest/venue/venue').then(m => m.Venue) },
  { path: 'invite', title: 'Ashwin & Amritha · Wedding invitation', loadComponent: landing },
  { path: 'invalid-invite', title: 'Ashwin & Amritha · Wedding invitation', loadComponent: landing },
  { path: 'admin/login', title: 'Admin login · Wedding invitation', loadComponent: () => import('./features/admin/login/login').then(m => m.Login) },
  { path: 'admin/dashboard', title: 'RSVP dashboard · Wedding invitation', canActivate: [adminGuard], loadComponent: () => import('./features/admin/dashboard/dashboard').then(m => m.Dashboard) },
  { path: 'admin/rsvps', redirectTo: 'admin/dashboard', pathMatch: 'full' },
  { path: 'admin/guests', title: 'Guest management · Wedding invitation', canActivate: [adminGuard, fullAdminGuard], loadComponent: () => import('./features/admin/guests/guests').then(m => m.Guests) },
  { path: 'admin/gallery', title: 'Photo management · Wedding invitation', canActivate: [adminGuard, fullAdminGuard], loadComponent: () => import('./features/admin/gallery/gallery').then(m => m.AdminGallery) },
  { path: 'admin/events', title: 'Event management · Wedding invitation', canActivate: [adminGuard, fullAdminGuard], loadComponent: () => import('./features/admin/events/events').then(m => m.Events) },
  { path: 'admin', redirectTo: 'admin/dashboard', pathMatch: 'full' },
  { path: '', title: 'Ashwin & Amritha · Wedding invitation', pathMatch: 'full', loadComponent: landing },
  { path: '**', title: 'Ashwin & Amritha · Wedding invitation', loadComponent: landing }
];
