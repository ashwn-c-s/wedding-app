import { validateGuestLocation } from './guest-location';
import { supabase } from "./supabase";
import { allRows } from "./pagination";
import { uuid, validateGuest } from "./validation";
export interface GuestTag {
  id: string;
  name: string;
}
export function tagName(value: unknown): string {
  if (typeof value !== "string") throw new Error("Enter a tag name");
  const name = value.trim().replace(/\s+/g, " ");
  if (!name || name.length > 40 || name.includes("|"))
    throw new Error("Tags must contain 1–40 characters and cannot include |");
  return name;
}
export function tagInput(input: Record<string, unknown>): {
  tag_ids?: string[];
  new_tags?: string[];
} {
  if (input.tag_ids === undefined && input.new_tags === undefined) return {};
  const ids = input.tag_ids === undefined ? [] : input.tag_ids,
    names = input.new_tags === undefined ? [] : input.new_tags;
  if (
    !Array.isArray(ids) ||
    ids.length > 10 ||
    ids.some((id) => typeof id !== "string" || !uuid.test(id)) ||
    new Set(ids).size !== ids.length ||
    !Array.isArray(names) ||
    names.length > 10
  )
    throw new Error("Choose up to 10 unique tags");
  const normalized = names.map(tagName);
  const unique = normalized.filter(
    (name, index) =>
      normalized.findIndex(
        (other) => other.toLowerCase() === name.toLowerCase(),
      ) === index,
  );
  if (ids.length + unique.length > 10) throw new Error("Choose up to 10 tags");
  return { tag_ids: ids, new_tags: unique };
}
export async function readTags() {
  const [tags, assignments] = await Promise.all([
    allRows<GuestTag>((from, to) =>
      supabase
        .from("guest_tags")
        .select("id,name")
        .order("name")
        .order("id")
        .range(from, to),
    ),
    allRows<{ guest_id: string; tag_id: string }>((from, to) =>
      supabase
        .from("guest_tag_assignments")
        .select("guest_id,tag_id")
        .order("guest_id")
        .order("tag_id")
        .range(from, to),
    ),
  ]);
  const catalogue = tags.data || [];
  const byId = new Map(catalogue.map((tag) => [tag.id, tag]));
  const byGuest = new Map<string, GuestTag[]>();
  for (const assignment of assignments.data || []) {
    const tag = byId.get(assignment.tag_id);
    if (tag)
      byGuest.set(assignment.guest_id, [
        ...(byGuest.get(assignment.guest_id) || []),
        tag,
      ]);
  }
  for (const labels of byGuest.values())
    labels.sort((a, b) => a.name.localeCompare(b.name));
  return {
    error: tags.error || assignments.error,
    tags: catalogue.map((tag) => ({
      ...tag,
      guest_count: (assignments.data || []).filter((a) => a.tag_id === tag.id)
        .length,
    })),
    byGuest,
  };
}

export function validateTaggedGuest(body: unknown) {
  return {
    ...validateGuest(body),
    ...tagInput(body as Record<string, unknown>),
    ...((body as Record<string, unknown>).location !== undefined ? {location:validateGuestLocation((body as Record<string, unknown>).location)} : {}),
  };
}
export function guestRpc(
  mode: string,
  id: string | null,
  input: ReturnType<typeof validateTaggedGuest>,
) {
  const args = {
    p_mode: mode,
    p_guest_id: id,
    p_name: input.name,
    p_phone: input.phone,
    p_party_size: input.party_size,
    p_event_ids: input.event_ids,
  };
  if (input.location !== undefined) return supabase.rpc("save_guest_atomic_v3", {
    ...args, p_tag_ids: input.tag_ids ?? null, p_new_tags: input.new_tags ?? null,
    p_tag_mode: mode === "import" ? "add" : "replace", p_location: input.location,
  });
  return input.tag_ids === undefined
    ? supabase.rpc("save_guest_atomic", args)
    : supabase.rpc("save_guest_atomic_v2", {
        ...args,
        p_tag_ids: input.tag_ids,
        p_new_tags: input.new_tags,
        p_tag_mode: mode === "import" ? "add" : "replace",
      });
}
