// ============================================================
// Storage Adapter — PostgreSQL (Self-Hosted)
// ============================================================

import pg from "pg";
import type { StorageAdapter, NoteEntry, Reminder, Bookmark } from "../types.js";

const { Pool } = pg;

export class PostgresAdapter implements StorageAdapter {
  private pool: pg.Pool;

  constructor(connectionString: string) {
    this.pool = new Pool({ connectionString });
  }

  private async query<T>(sql: string, params: unknown[] = []): Promise<T[]> {
    const { rows } = await this.pool.query(sql, params);
    return rows as T[];
  }

  private async queryOne<T>(sql: string, params: unknown[] = []): Promise<T | null> {
    const rows = await this.query<T>(sql, params);
    return rows[0] || null;
  }

  // ── Notes ──────────────────────────────────────────────────

  async saveNote(
    entry: Omit<NoteEntry, "id" | "created_at" | "updated_at">
  ): Promise<NoteEntry> {
    const result = await this.queryOne<NoteEntry>(
      `INSERT INTO notes (title, content, category, tags, source, entry_type, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [entry.title, entry.content, entry.category, entry.tags, entry.source, entry.entry_type, JSON.stringify(entry.metadata)]
    );
    if (!result) throw new Error("Failed to save note");
    return result;
  }

  async searchNotes(
    query: string,
    category?: string,
    tags?: string[],
    limit: number = 20
  ): Promise<NoteEntry[]> {
    let sql = `
      SELECT *, ts_rank(to_tsvector('english', title || ' ' || content), plainto_tsquery('english', $1)) AS rank
      FROM notes
      WHERE to_tsvector('english', title || ' ' || content) @@ plainto_tsquery('english', $1)
         OR title ILIKE '%' || $1 || '%'
         OR content ILIKE '%' || $1 || '%'
    `;
    const params: unknown[] = [query];
    let paramIdx = 2;

    if (category) {
      sql += ` AND category = $${paramIdx}`;
      params.push(category);
      paramIdx++;
    }

    if (tags && tags.length > 0) {
      sql += ` AND tags && $${paramIdx}`;
      params.push(tags);
      paramIdx++;
    }

    sql += ` ORDER BY rank DESC NULLS LAST, created_at DESC LIMIT $${paramIdx}`;
    params.push(limit);

    return this.query<NoteEntry>(sql, params);
  }

  async listCategories(): Promise<{ category: string; count: number }[]> {
    return this.query<{ category: string; count: number }>(
      `SELECT category, COUNT(*)::int AS count FROM notes GROUP BY category ORDER BY count DESC`
    );
  }

  async getNote(id: string): Promise<NoteEntry | null> {
    return this.queryOne<NoteEntry>(`SELECT * FROM notes WHERE id = $1`, [id]);
  }

  async deleteNote(id: string): Promise<boolean> {
    const result = await this.pool.query(`DELETE FROM notes WHERE id = $1`, [id]);
    return (result.rowCount || 0) > 0;
  }

  // ── Reminders ──────────────────────────────────────────────

  async addReminder(reminder: Omit<Reminder, "id" | "created_at">): Promise<Reminder> {
    const result = await this.queryOne<Reminder>(
      `INSERT INTO reminders (title, description, due_date, is_done, priority)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [reminder.title, reminder.description, reminder.due_date, reminder.is_done, reminder.priority]
    );
    if (!result) throw new Error("Failed to add reminder");
    return result;
  }

  async listReminders(includeDone: boolean = false): Promise<Reminder[]> {
    const sql = includeDone
      ? `SELECT * FROM reminders ORDER BY due_date ASC`
      : `SELECT * FROM reminders WHERE is_done = FALSE ORDER BY due_date ASC`;
    return this.query<Reminder>(sql);
  }

  async completeReminder(id: string): Promise<boolean> {
    const result = await this.pool.query(
      `UPDATE reminders SET is_done = TRUE WHERE id = $1`,
      [id]
    );
    return (result.rowCount || 0) > 0;
  }

  // ── Bookmarks ──────────────────────────────────────────────

  async saveBookmark(bookmark: Omit<Bookmark, "id" | "created_at">): Promise<Bookmark> {
    const result = await this.queryOne<Bookmark>(
      `INSERT INTO bookmarks (url, title, description, tags, category)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [bookmark.url, bookmark.title, bookmark.description, bookmark.tags, bookmark.category]
    );
    if (!result) throw new Error("Failed to save bookmark");
    return result;
  }

  async searchBookmarks(query: string, tags?: string[]): Promise<Bookmark[]> {
    let sql = `
      SELECT * FROM bookmarks
      WHERE title ILIKE '%' || $1 || '%'
         OR description ILIKE '%' || $1 || '%'
         OR url ILIKE '%' || $1 || '%'
    `;
    const params: unknown[] = [query];

    if (tags && tags.length > 0) {
      sql += ` AND tags && $2`;
      params.push(tags);
    }

    sql += ` ORDER BY created_at DESC LIMIT 20`;
    return this.query<Bookmark>(sql, params);
  }

  async listBookmarks(category?: string, limit: number = 20): Promise<Bookmark[]> {
    if (category) {
      return this.query<Bookmark>(
        `SELECT * FROM bookmarks WHERE category = $1 ORDER BY created_at DESC LIMIT $2`,
        [category, limit]
      );
    }
    return this.query<Bookmark>(
      `SELECT * FROM bookmarks ORDER BY created_at DESC LIMIT $1`,
      [limit]
    );
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
      this.queryOne<{ count: number }>(`SELECT COUNT(*)::int AS count FROM notes`),
      this.queryOne<{ count: number }>(`SELECT COUNT(*)::int AS count FROM reminders`),
      this.queryOne<{ count: number }>(`SELECT COUNT(*)::int AS count FROM bookmarks`),
      this.queryOne<{ count: number }>(`SELECT COUNT(*)::int AS count FROM reminders WHERE is_done = FALSE`),
      this.listCategories(),
    ]);

    return {
      total_notes: notes?.count || 0,
      total_reminders: reminders?.count || 0,
      total_bookmarks: bookmarks?.count || 0,
      pending_reminders: pending?.count || 0,
      categories: cats.map((c) => c.category),
    };
  }
}
