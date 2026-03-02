// ============================================================
// Nemo — Zod Schemas
// ============================================================

import { z } from "zod";

// ── Notes ────────────────────────────────────────────────────

export const SaveNoteSchema = z.object({
  title: z.string()
    .min(1, "Title is required")
    .max(500, "Title must be under 500 characters")
    .describe("Title or summary of the note"),
  content: z.string()
    .min(1, "Content is required")
    .describe("The full content to store — conversation excerpt, note, idea, code snippet, etc."),
  category: z.string()
    .default("general")
    .describe("Category for organization (e.g. 'devops', 'flutter', 'ideas', 'career')"),
  tags: z.array(z.string())
    .default([])
    .describe("Tags for filtering (e.g. ['python', 'docker', 'tutorial'])"),
  source: z.string()
    .optional()
    .describe("Source of the note (e.g. 'claude-chat', 'chatgpt', 'manual', 'web')"),
  entry_type: z.enum(["conversation", "note", "idea", "snippet", "summary", "resource"])
    .default("note")
    .describe("Type of entry: conversation, note, idea, snippet, summary, or resource"),
  metadata: z.record(z.unknown())
    .default({})
    .describe("Additional metadata as key-value pairs"),
}).strict();

export const SearchNotesSchema = z.object({
  query: z.string()
    .min(1, "Search query is required")
    .describe("Search term to find in titles and content"),
  category: z.string()
    .optional()
    .describe("Filter by category"),
  tags: z.array(z.string())
    .optional()
    .describe("Filter by tags (matches entries that have any of these tags)"),
  limit: z.number()
    .int()
    .min(1)
    .max(50)
    .default(10)
    .describe("Maximum number of results to return"),
}).strict();

export const GetNoteSchema = z.object({
  id: z.string().uuid().describe("UUID of the note to retrieve"),
}).strict();

export const DeleteNoteSchema = z.object({
  id: z.string().uuid().describe("UUID of the note to delete"),
}).strict();

// ── Reminders ────────────────────────────────────────────────

export const AddReminderSchema = z.object({
  title: z.string()
    .min(1, "Title is required")
    .max(300)
    .describe("What to be reminded about"),
  description: z.string()
    .optional()
    .describe("Additional details for the reminder"),
  due_date: z.string()
    .describe("When the reminder is due (ISO 8601 format, e.g. '2025-03-15T10:00:00Z')"),
  priority: z.enum(["low", "medium", "high", "urgent"])
    .default("medium")
    .describe("Priority level"),
}).strict();

export const ListRemindersSchema = z.object({
  include_done: z.boolean()
    .default(false)
    .describe("Whether to include completed reminders"),
}).strict();

export const CompleteReminderSchema = z.object({
  id: z.string().uuid().describe("UUID of the reminder to mark as done"),
}).strict();

// ── Bookmarks ────────────────────────────────────────────────

export const SaveBookmarkSchema = z.object({
  url: z.string()
    .url("Must be a valid URL")
    .describe("The URL to bookmark"),
  title: z.string()
    .min(1, "Title is required")
    .max(500)
    .describe("Title or description of the bookmarked page"),
  description: z.string()
    .optional()
    .describe("Why this bookmark is interesting or useful"),
  tags: z.array(z.string())
    .default([])
    .describe("Tags for filtering"),
  category: z.string()
    .default("general")
    .describe("Category (e.g. 'tools', 'articles', 'docs', 'tutorials')"),
}).strict();

export const SearchBookmarksSchema = z.object({
  query: z.string()
    .min(1)
    .describe("Search term to find in bookmark titles, descriptions, and URLs"),
  tags: z.array(z.string())
    .optional()
    .describe("Filter by tags"),
}).strict();

export const ListBookmarksSchema = z.object({
  category: z.string()
    .optional()
    .describe("Filter by category"),
  limit: z.number()
    .int()
    .min(1)
    .max(50)
    .default(20)
    .describe("Maximum number of results"),
}).strict();
