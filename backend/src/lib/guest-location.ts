export interface GuestLocation {
  type: 'coordinates' | 'maps';
  latitude?: number;
  longitude?: number;
  accuracy_m?: number | null;
  maps_url?: string;
  address?: string | null;
}
export function validateGuestLocation(value: unknown): GuestLocation | null {
  if (value === null) return null;
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid guest location');
  const input = value as Record<string, unknown>;
  if (Object.keys(input).some(key => !['type','latitude','longitude','accuracy_m','maps_url','address'].includes(key))) throw new Error('Invalid guest location fields');
  if (input.address !== undefined && input.address !== null && (typeof input.address !== 'string' || input.address.length > 500)) throw new Error('Address must be at most 500 characters');
  const address = typeof input.address === 'string' ? input.address.trim() || null : null;
  if (input.type === 'coordinates') {
    if (typeof input.latitude !== 'number' || !Number.isFinite(input.latitude) || Math.abs(input.latitude) > 90 ||
        typeof input.longitude !== 'number' || !Number.isFinite(input.longitude) || Math.abs(input.longitude) > 180 || input.maps_url !== undefined ||
        (input.accuracy_m !== undefined && input.accuracy_m !== null && (typeof input.accuracy_m !== 'number' || !Number.isFinite(input.accuracy_m) || input.accuracy_m < 0))) throw new Error('Enter valid latitude (-90 to 90), longitude (-180 to 180), and accuracy');
    return {type:'coordinates',latitude:input.latitude,longitude:input.longitude,accuracy_m:input.accuracy_m as number | null ?? null,address};
  }
  if (input.type === 'maps' && typeof input.maps_url === 'string' && input.maps_url.length <= 2048 && input.latitude === undefined && input.longitude === undefined && input.accuracy_m === undefined) {
    try {
      const url = new URL(input.maps_url.trim());
      const validHost = url.hostname === 'maps.app.goo.gl' || url.hostname === 'maps.google.com' ||
        (['google.com','www.google.com','goo.gl'].includes(url.hostname) && /^\/maps(?:\/|$)/.test(url.pathname));
      if (url.protocol === 'https:' && !url.username && !url.password && !url.port && validHost) return {type:'maps',maps_url:url.href,address};
    } catch { /* Return a useful validation error below. */ }
  }
  throw new Error('Enter a supported HTTPS Google Maps location link');
}
