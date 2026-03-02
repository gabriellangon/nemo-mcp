// ============================================================
// Storage Adapter — Supabase
// ============================================================

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type { StorageAdapter, NoteEntry, Reminder, Bookmark } from "../types.js";

export class SupabaseAdapter implements StorageAdapter {
  private client: SupabaseClient;

  constructor(url: string, serviceKey: string) {
    this.client = createClient(url, serviceKey);
  }

  // ── Notes ──────────────────────────────────────────────────

  async saveNote(
    entry: Omit<NoteEntry, "id" | "created_at" | "updated_at">
  ): Promise<NoteEntry> {
    const { data, error } = await this.client
      .from("notes")
      .insert(entry)
      .select()
      .single();

    if (error) throw new Error(`Failed to save note: ${error.message}`);
    return data as NoteEntry;
  }

  async searchNotes(
    query: string,
    category?: string,
    tags?: string[],
    limit: number = 20
  ): Promise<NoteEntry[]> {
    let q = this.client
      .from("notes")
      .select("*")
      .textSearch("title", query, { type: "websearch" })
      .limit(limit)
      .order("created_at", { ascending: false });

    // If websearch on title doesn't find results, we'll also search content
    // For now, use ilike as a broader fallback
    let { data, error } = await this.client
      .from("notes")
      .select("*")
      .or(`title.ilike.%${query}%,content.ilike.%${query}%`)
      .limit(limit)
      .order("created_at", { ascending: false });

    if (category) {
      ({ data, error } = await this.client
        .from("notes")
        .select("*")
        .or(`title.ilike.%${query}%,content.ilike.%${query}%`)
        .eq("category", category)
        .limit(limit)
        .order("created_at", { ascending: false }));
    }

    if (tags && tags.length > 0) {
      ({ data, error } = await this.client
        .from("notes")
        .select("*")
        .or(`title.ilike.%${query}%,content.ilike.%${query}%`)
        .overlaps("tags", tags)
        .limit(limit)
        .order("created_at", { ascending: false }));
    }

    if (error) throw new Error(`Search failed: ${error.message}`);
    return (data || []) as NoteEntry[];
  }

  async listCategories(): Promise<{ category: string; count: number }[]> {
    const { data, error } = await this.client
      .from("notes")
      .select("category");

    if (error) throw new Error(`Failed to list categories: ${error.message}`);

    const counts = new Map<string, number>();
    for (const row of data || []) {
      counts.set(row.category, (counts.get(row.category) || 0) + 1);
    }

    return Array.from(counts.entries())
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count);
  }

  async getNote(id: string): Promise<NoteEntry | null> {
    const { data, error } = await this.client
      .from("notes")
      .select("*")
      .eq("id", id)
      .single();

    if (error) return null;
    return data as NoteEntry;
  }

  async deleteNote(id: string): Promise<boolean> {
    const { error } = await this.client
      .from("notes")
      .delete()
      .eq("id", id);

    return !error;
  }

  // ── Reminders ──────────────────────────────────────────────

  async addReminder(reminder: Omit<Reminder, "id" | "created_at">): Promise<Reminder> {
    const { data, error } = await this.client
      .from("reminders")
      .insert(reminder)
      .select()
      .single();

    if (error) throw new Error(`Failed to add reminder: ${error.message}`);
    return data as Reminder;
  }

  async listReminders(includeDone: boolean = false): Promise<Reminder[]> {
    let query = this.client
      .from("reminders")
      .select("*")
      .order("due_date", { ascending: true });

    if (!includeDone) {
      query = query.eq("is_done", false);
    }

    const { data, error } = await query;
    if (error) throw new Error(`Failed to list reminders: ${error.message}`);
    return (data || []) as Reminder[];
  }

  async completeReminder(id: string): Promise<boolean> {
    const { error } = await this.client
      .from("reminders")
      .update({ is_done: true })
      .eq("id", id);

    return !error;
  }

  // ── Bookmarks ──────────────────────────────────────────────

  async saveBookmark(bookmark: Omit<Bookmark, "id" | "created_at">): Promise<Bookmark> {
    const { data, error } = await this.client
      .from("bookmarks")
      .insert(bookmark)
      .select()
      .single();

    if (error) throw new Error(`Failed to save bookmark: ${error.message}`);
    return data as Bookmark;
  }

  async searchBookmarks(query: string, tags?: string[]): Promise<Bookmark[]> {
    let q = this.client
      .from("bookmarks")
      .select("*")
      .or(`title.ilike.%${query}%,description.ilike.%${query}%,url.ilike.%${query}%`)
      .order("created_at", { ascending: false })
      .limit(20);

    if (tags && tags.length > 0) {
      q = q.overlaps("tags", tags);
    }

    const { data, error } = await q;
    if (error) throw new Error(`Search bookmarks failed: ${error.message}`);
    return (data || []) as Bookmark[];
  }

  async listBookmarks(category?: string, limit: number = 20): Promise<Bookmark[]> {
    let q = this.client
      .from("bookmarks")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (category) {
      q = q.eq("category", category);
    }

    const { data, error } = await q;
    if (error) throw new Error(`Failed to list bookmarks: ${error.message}`);
    return (data || []) as Bookmark[];
  }

  // ── Stats ──────────────────────────────────────────────────

  async getStats(): Promise<{
    total_notes: number;
    total_reminders: number;
    total_bookmarks: number;
    pending_reminders: number;
    categories: string[];
  }> {
    const [notes, reminders, bookmarks, pending, cats] = await Promise.all([
      this.client.from("notes").select("id", { count: "exact", head: true }),
      this.client.from("reminders").select("id", { count: "exact", head: true }),
      this.client.from("bookmarks").select("id", { count: "exact", head: true }),
      this.client.from("reminders").select("id", { count: "exact", head: true }).eq("is_done", false),
      this.listCategories(),
    ]);

    return {
      total_notes: notes.count || 0,
      total_reminders: reminders.count || 0,
      total_bookmarks: bookmarks.count || 0,
      pending_reminders: pending.count || 0,
      categories: cats.map((c) => c.category),
    };
  }
}
