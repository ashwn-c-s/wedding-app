import { GuestTag } from '../models/admin';
export const normalizeTagName = (name: string) => name.trim().replace(/\s+/g, ' ');
export function tagNameError(name: string) {
  const normalized = normalizeTagName(name);
  return !normalized || normalized.length > 40 || normalized.includes('|')
    ? 'Use 1–40 characters without |.'
    : '';
}
export function matchesTag(tags: GuestTag[] | undefined, filter: string): boolean {
  return (
    !filter || (filter === 'untagged' ? !tags?.length : !!tags?.some((tag) => tag.id === filter))
  );
}
