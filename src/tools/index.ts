// ============================================================
// Nemo — Tool Registrations
// ============================================================

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { StorageAdapter } from "../types.js";
import { getWebhookService } from "../services/webhook-service.js";
import {
  SaveKnowledgeSchema,
  SearchKnowledgeSchema,
  GetKnowledgeSchema,
  DeleteKnowledgeSchema,
  AddReminderSchema,
  ListRemindersSchema,
  CompleteReminderSchema,
  SaveBookmarkSchema,
  SearchBookmarksSchema,
  ListBookmarksSchema,
} from "../schemas/index.js";

export function registerAllTools(server: McpServer, storage: StorageAdapter): void {
  const webhooks = getWebhookService();

  // ── Knowledge Tools ──────────────────────────────────────

  server.registerTool(
    "nemo_save_knowledge",
    {
      title: "Save Knowledge",
      description: `Save a piece of knowledge to Nemo.

Use this when the user wants to store a conversation excerpt, an idea, a code snippet, a summary, or any valuable information for future reference.

The AI should:
- Choose an appropriate category and tags based on the content
- Summarize if the content is long
- Set the entry_type based on what's being saved

Args:
  - title: Short descriptive title
  - content: The full content to store
  - category: Organization category (e.g. 'devops', 'flutter', 'ideas')
  - tags: Array of tags for filtering
  - source: Where this came from (e.g. 'claude-chat')
  - entry_type: conversation | note | idea | snippet | summary | resource
  - metadata: Additional key-value data

Returns: The saved entry with its UUID`,
      inputSchema: SaveKnowledgeSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
    },
    async (params) => {
      try {
        const entry = await storage.saveKnowledge({
          title: params.title,
          content: params.content,
          category: params.category ?? "general",
          tags: params.tags ?? [],
          source: params.source ?? null,
          entry_type: params.entry_type ?? "note",
          metadata: params.metadata ?? {},
        });

        webhooks.emit("knowledge.saved", {
          id: entry.id,
          title: entry.title,
          category: entry.category,
          tags: entry.tags,
          entry_type: entry.entry_type,
          content_preview: entry.content.slice(0, 300),
          source: entry.source,
        });

        return {
          content: [{
            type: "text" as const,
            text: `✅ Saved to Nemo!\n\nID: ${entry.id}\nTitle: ${entry.title}\nCategory: ${entry.category}\nTags: ${entry.tags.join(", ") || "none"}\nType: ${entry.entry_type}`,
          }],
        };
      } catch (error) {
        return {
          isError: true,
          content: [{ type: "text" as const, text: `Error saving knowledge: ${(error as Error).message}` }],
        };
      }
    }
  );

  server.registerTool(
    "nemo_search_knowledge",
    {
      title: "Search Knowledge",
      description: `Search through stored knowledge in Nemo.

Use this to find previously saved conversations, notes, ideas, snippets, or any stored content. Supports filtering by category and tags.

Args:
  - query: Search terms
  - category: Optional category filter
  - tags: Optional tag filter
  - limit: Max results (default 10)

Returns: Matching entries with title, content preview, and metadata`,
      inputSchema: SearchKnowledgeSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async (params) => {
      try {
        const results = await storage.searchKnowledge(
          params.query,
          params.category,
          params.tags,
          params.limit
        );

        if (results.length === 0) {
          return {
            content: [{ type: "text" as const, text: `No results found for "${params.query}". Try broader terms or check available categories with nemo_list_categories.` }],
          };
        }

        const formatted = results.map((r, i) => {
          const preview = r.content.length > 200 ? r.content.slice(0, 200) + "..." : r.content;
          return `**${i + 1}. ${r.title}**\nID: ${r.id}\nCategory: ${r.category} | Type: ${r.entry_type} | Tags: ${r.tags.join(", ") || "none"}\nCreated: ${r.created_at}\n\n${preview}`;
        }).join("\n\n---\n\n");

        return {
          content: [{ type: "text" as const, text: `Found ${results.length} result(s):\n\n${formatted}` }],
        };
      } catch (error) {
        return {
          isError: true,
          content: [{ type: "text" as const, text: `Search error: ${(error as Error).message}` }],
        };
      }
    }
  );

  server.registerTool(
    "nemo_get_knowledge",
    {
      title: "Get Knowledge Entry",
      description: `Retrieve a specific knowledge entry by its UUID.

Args:
  - id: UUID of the entry

Returns: Full entry with all content and metadata`,
      inputSchema: GetKnowledgeSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async (params) => {
      try {
        const entry = await storage.getKnowledge(params.id);
        if (!entry) {
          return {
            content: [{ type: "text" as const, text: `No entry found with ID: ${params.id}` }],
          };
        }
        return {
          content: [{ type: "text" as const, text: JSON.stringify(entry, null, 2) }],
        };
      } catch (error) {
        return {
          isError: true,
          content: [{ type: "text" as const, text: `Error: ${(error as Error).message}` }],
        };
      }
    }
  );

  server.registerTool(
    "nemo_delete_knowledge",
    {
      title: "Delete Knowledge Entry",
      description: `Delete a knowledge entry by its UUID.

Args:
  - id: UUID of the entry to delete

Returns: Confirmation of deletion`,
      inputSchema: DeleteKnowledgeSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async (params) => {
      try {
        const success = await storage.deleteKnowledge(params.id);
        if (success) {
          webhooks.emit("knowledge.deleted", { id: params.id });
        }
        return {
          content: [{
            type: "text" as const,
            text: success ? `✅ Deleted entry ${params.id}` : `Entry ${params.id} not found`,
          }],
        };
      } catch (error) {
        return {
          isError: true,
          content: [{ type: "text" as const, text: `Error: ${(error as Error).message}` }],
        };
      }
    }
  );

  server.registerTool(
    "nemo_list_categories",
    {
      title: "List Categories",
      description: `List all knowledge categories with entry counts.

Returns: Categories sorted by number of entries`,
      inputSchema: {},
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async () => {
      try {
        const categories = await storage.listCategories();
        if (categories.length === 0) {
          return {
            content: [{ type: "text" as const, text: "No categories yet. Start saving knowledge to create categories!" }],
          };
        }
        const formatted = categories.map((c) => `- **${c.category}** (${c.count} entries)`).join("\n");
        return {
          content: [{ type: "text" as const, text: `📂 Categories:\n\n${formatted}` }],
        };
      } catch (error) {
        return {
          isError: true,
          content: [{ type: "text" as const, text: `Error: ${(error as Error).message}` }],
        };
      }
    }
  );

  // ── Reminder Tools ───────────────────────────────────────

  server.registerTool(
    "nemo_add_reminder",
    {
      title: "Add Reminder",
      description: `Add a reminder with a due date and priority.

Use this when the user mentions a deadline, a task to do later, or anything time-sensitive.

Args:
  - title: What to remember
  - description: Additional details (optional)
  - due_date: ISO 8601 datetime
  - priority: low | medium | high | urgent

Returns: The created reminder`,
      inputSchema: AddReminderSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
    },
    async (params) => {
      try {
        const reminder = await storage.addReminder({
          title: params.title,
          description: params.description ?? null,
          due_date: params.due_date,
          is_done: false,
          priority: params.priority ?? "medium",
        });

        webhooks.emit("reminder.created", {
          id: reminder.id,
          title: reminder.title,
          due_date: reminder.due_date,
          priority: reminder.priority,
          description: reminder.description,
        });

        return {
          content: [{
            type: "text" as const,
            text: `⏰ Reminder set!\n\nID: ${reminder.id}\nTitle: ${reminder.title}\nDue: ${reminder.due_date}\nPriority: ${reminder.priority}`,
          }],
        };
      } catch (error) {
        return {
          isError: true,
          content: [{ type: "text" as const, text: `Error: ${(error as Error).message}` }],
        };
      }
    }
  );

  server.registerTool(
    "nemo_list_reminders",
    {
      title: "List Reminders",
      description: `List all pending reminders (or all including completed ones).

Args:
  - include_done: Whether to show completed reminders (default: false)

Returns: Reminders sorted by due date`,
      inputSchema: ListRemindersSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async (params) => {
      try {
        const reminders = await storage.listReminders(params.include_done);
        if (reminders.length === 0) {
          return {
            content: [{ type: "text" as const, text: "No pending reminders. 🎉" }],
          };
        }
        const formatted = reminders.map((r) => {
          const status = r.is_done ? "✅" : "⏳";
          const priorityEmoji = { low: "🟢", medium: "🟡", high: "🟠", urgent: "🔴" }[r.priority];
          return `${status} ${priorityEmoji} **${r.title}**\n   ID: ${r.id}\n   Due: ${r.due_date}\n   ${r.description || ""}`;
        }).join("\n\n");

        return {
          content: [{ type: "text" as const, text: `📋 Reminders:\n\n${formatted}` }],
        };
      } catch (error) {
        return {
          isError: true,
          content: [{ type: "text" as const, text: `Error: ${(error as Error).message}` }],
        };
      }
    }
  );

  server.registerTool(
    "nemo_complete_reminder",
    {
      title: "Complete Reminder",
      description: `Mark a reminder as done.

Args:
  - id: UUID of the reminder

Returns: Confirmation`,
      inputSchema: CompleteReminderSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async (params) => {
      try {
        const success = await storage.completeReminder(params.id);
        if (success) {
          webhooks.emit("reminder.completed", { id: params.id });
        }
        return {
          content: [{
            type: "text" as const,
            text: success ? `✅ Reminder marked as done!` : `Reminder ${params.id} not found`,
          }],
        };
      } catch (error) {
        return {
          isError: true,
          content: [{ type: "text" as const, text: `Error: ${(error as Error).message}` }],
        };
      }
    }
  );

  // ── Bookmark Tools ───────────────────────────────────────

  server.registerTool(
    "nemo_save_bookmark",
    {
      title: "Save Bookmark",
      description: `Save a URL as a bookmark with tags and description.

Use this when the user shares an interesting link or wants to save a website for later.

Args:
  - url: The URL to bookmark
  - title: Title of the page
  - description: Why it's interesting (optional)
  - tags: Tags for filtering
  - category: Category (e.g. 'tools', 'articles', 'docs')

Returns: The saved bookmark`,
      inputSchema: SaveBookmarkSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
    },
    async (params) => {
      try {
        const bookmark = await storage.saveBookmark({
          url: params.url,
          title: params.title,
          description: params.description ?? null,
          tags: params.tags ?? [],
          category: params.category ?? "general",
        });

        webhooks.emit("bookmark.saved", {
          id: bookmark.id,
          url: bookmark.url,
          title: bookmark.title,
          tags: bookmark.tags,
          category: bookmark.category,
          description: bookmark.description,
        });

        return {
          content: [{
            type: "text" as const,
            text: `🔖 Bookmark saved!\n\nID: ${bookmark.id}\nTitle: ${bookmark.title}\nURL: ${bookmark.url}\nCategory: ${bookmark.category}`,
          }],
        };
      } catch (error) {
        return {
          isError: true,
          content: [{ type: "text" as const, text: `Error: ${(error as Error).message}` }],
        };
      }
    }
  );

  server.registerTool(
    "nemo_search_bookmarks",
    {
      title: "Search Bookmarks",
      description: `Search saved bookmarks by title, description, or URL.

Args:
  - query: Search terms
  - tags: Optional tag filter

Returns: Matching bookmarks`,
      inputSchema: SearchBookmarksSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async (params) => {
      try {
        const results = await storage.searchBookmarks(params.query, params.tags);
        if (results.length === 0) {
          return {
            content: [{ type: "text" as const, text: `No bookmarks found for "${params.query}"` }],
          };
        }
        const formatted = results.map((b, i) =>
          `${i + 1}. **${b.title}**\n   🔗 ${b.url}\n   ${b.description || ""}\n   Tags: ${b.tags.join(", ") || "none"} | Category: ${b.category}`
        ).join("\n\n");
        return {
          content: [{ type: "text" as const, text: `Found ${results.length} bookmark(s):\n\n${formatted}` }],
        };
      } catch (error) {
        return {
          isError: true,
          content: [{ type: "text" as const, text: `Error: ${(error as Error).message}` }],
        };
      }
    }
  );

  server.registerTool(
    "nemo_list_bookmarks",
    {
      title: "List Bookmarks",
      description: `List saved bookmarks, optionally filtered by category.

Args:
  - category: Filter by category (optional)
  - limit: Max results (default 20)

Returns: Bookmarks sorted by most recent`,
      inputSchema: ListBookmarksSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async (params) => {
      try {
        const results = await storage.listBookmarks(params.category, params.limit);
        if (results.length === 0) {
          return {
            content: [{ type: "text" as const, text: "No bookmarks yet. Start saving links!" }],
          };
        }
        const formatted = results.map((b, i) =>
          `${i + 1}. **${b.title}**\n   🔗 ${b.url}\n   Tags: ${b.tags.join(", ") || "none"} | Category: ${b.category}`
        ).join("\n\n");
        return {
          content: [{ type: "text" as const, text: `🔖 Bookmarks:\n\n${formatted}` }],
        };
      } catch (error) {
        return {
          isError: true,
          content: [{ type: "text" as const, text: `Error: ${(error as Error).message}` }],
        };
      }
    }
  );

  // ── Dashboard Tool ───────────────────────────────────────

  server.registerTool(
    "nemo_stats",
    {
      title: "Brain Stats",
      description: `Get an overview of what's stored in Nemo.

Returns: Total counts for knowledge entries, reminders, bookmarks, and available categories`,
      inputSchema: {},
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async () => {
      try {
        const stats = await storage.getStats();
        return {
          content: [{
            type: "text" as const,
            text: `🧠 Nemo — Dashboard\n\n` +
              `📝 Knowledge entries: ${stats.total_knowledge}\n` +
              `⏰ Reminders: ${stats.total_reminders} (${stats.pending_reminders} pending)\n` +
              `🔖 Bookmarks: ${stats.total_bookmarks}\n` +
              `📂 Categories: ${stats.categories.join(", ") || "none yet"}`,
          }],
        };
      } catch (error) {
        return {
          isError: true,
          content: [{ type: "text" as const, text: `Error: ${(error as Error).message}` }],
        };
      }
    }
  );
}
