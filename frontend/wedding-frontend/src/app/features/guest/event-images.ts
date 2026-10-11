import { Event } from '../../core/models';

export function eventImage(event: Event): { src: string; alt: string } {
  const slug = event.slug.toLowerCase().replace(/[^a-z]/g, '');
  switch (slug) {
    case 'reception':
      return { src: '/images/venue-2.jpg', alt: event.venue_name || 'Reception venue' };
    case 'weddingeve':
      return { src: '/images/wedding-eve.svg', alt: 'Artistic illustration of glowing lamps and flowers for Wedding Eve' };
    case 'mehndi':
    case 'mehendi':
      return { src: '/images/mehndi.svg', alt: 'Artistic illustration of henna patterns and flowers for Mehndi' };
    default:
      return { src: '/images/venue-1.jpg', alt: event.venue_name || event.name };
  }
}
