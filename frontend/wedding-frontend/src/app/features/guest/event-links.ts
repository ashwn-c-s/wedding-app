export { directionsUrl } from '../../core/utils/event-location';

export function isValidInviteToken(token: string | null): token is string {
  return !!token && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token);
}
