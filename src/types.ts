// ============================================================
// Nemo — Type Definitions
// ============================================================

export interface KnowledgeEntry {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  source: string | null;
  entry_type: EntryType;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface Reminder {
  id: string;
  title: string;
  description: string | null;
  due_date: string;
  is_done: boolean;
  priority: Priority;
  created_at: string;
}

export interface Bookmark {
  id: string;
  url: string;
  title: string;
  description: string | null;
  tags: string[];
  category: string;
  created_at: string;
}

export type EntryType = "conversation" | "note" | "idea" | "snippet" | "summary" | "resource";
export type Priority = "low" | "medium" | "high" | "urgent";

export interface StorageAdapter {
  // Knowledge
  saveKnowledge(entry: Omit<KnowledgeEntry, "id" | "created_at" | "updated_at">): Promise<KnowledgeEntry>;
  searchKnowledge(query: string, category?: string, tags?: string[], limit?: number): Promise<KnowledgeEntry[]>;
  listCategories(): Promise<{ category: string; count: number }[]>;
  getKnowledge(id: string): Promise<KnowledgeEntry | null>;
  deleteKnowledge(id: string): Promise<boolean>;

  // Reminders
  addReminder(reminder: Omit<Reminder, "id" | "created_at">): Promise<Reminder>;
  listReminders(includeDone?: boolean): Promise<Reminder[]>;
  completeReminder(id: string): Promise<boolean>;

  // Bookmarks
  saveBookmark(bookmark: Omit<Bookmark, "id" | "created_at">): Promise<Bookmark>;
  searchBookmarks(query: string, tags?: string[]): Promise<Bookmark[]>;
  listBookmarks(category?: string, limit?: number): Promise<Bookmark[]>;

  // Utility
  getStats(): Promise<{
    total_knowledge: number;
    total_reminders: number;
    total_bookmarks: number;
    pending_reminders: number;
    categories: string[];
  }>;
}
