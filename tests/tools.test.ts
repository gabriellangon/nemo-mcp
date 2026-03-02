import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { getWebhookService } from "../src/services/webhook-service.ts";
import { registerAllTools } from "../src/tools/index.ts";
import type { NoteEntry, StorageAdapter } from "../src/types.ts";

type ToolHandler = (params: any) => Promise<any>;

class FakeMcpServer {
  tools = new Map<string, { handler: ToolHandler }>();

  registerTool(name: string, _config: unknown, handler: ToolHandler): void {
    this.tools.set(name, { handler });
  }
}

function createStorageMock(): StorageAdapter {
  return {
    saveNote: vi.fn(),
    searchNotes: vi.fn().mockResolvedValue([]),
    listCategories: vi.fn().mockResolvedValue([]),
    getNote: vi.fn().mockResolvedValue(null),
    deleteNote: vi.fn().mockResolvedValue(false),
    addReminder: vi.fn(),
    listReminders: vi.fn().mockResolvedValue([]),
    completeReminder: vi.fn().mockResolvedValue(false),
    saveBookmark: vi.fn(),
    searchBookmarks: vi.fn().mockResolvedValue([]),
    listBookmarks: vi.fn().mockResolvedValue([]),
    getStats: vi.fn().mockResolvedValue({
      total_notes: 0,
      total_reminders: 0,
      total_bookmarks: 0,
      pending_reminders: 0,
      categories: [],
    }),
  };
}

describe("tool registrations", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("registers the renamed note tools", () => {
    const server = new FakeMcpServer();
    const storage = createStorageMock();

    registerAllTools(server as unknown as McpServer, storage);

    expect(server.tools.has("nemo_save_note")).toBe(true);
    expect(server.tools.has("nemo_search_notes")).toBe(true);
    expect(server.tools.has("nemo_get_note")).toBe(true);
    expect(server.tools.has("nemo_delete_note")).toBe(true);
  });

  it("saves a note and emits the note.saved webhook event", async () => {
    const server = new FakeMcpServer();
    const storage = createStorageMock();
    const note: NoteEntry = {
      id: "123e4567-e89b-12d3-a456-426614174000",
      title: "Project idea",
      content: "Build the first prototype.",
      category: "product",
      tags: ["prototype"],
      source: "chatgpt",
      entry_type: "note",
      metadata: {},
      created_at: "2026-03-02T10:00:00.000Z",
      updated_at: "2026-03-02T10:00:00.000Z",
    };

    (storage.saveNote as ReturnType<typeof vi.fn>).mockResolvedValue(note);

    const webhookService = getWebhookService();
    const emitSpy = vi.spyOn(webhookService, "emit").mockResolvedValue();

    registerAllTools(server as unknown as McpServer, storage);

    const result = await server.tools.get("nemo_save_note")!.handler({
      title: note.title,
      content: note.content,
      category: note.category,
      tags: note.tags,
      source: note.source,
      entry_type: note.entry_type,
      metadata: note.metadata,
    });

    expect(storage.saveNote).toHaveBeenCalledWith({
      title: note.title,
      content: note.content,
      category: note.category,
      tags: note.tags,
      source: note.source,
      entry_type: note.entry_type,
      metadata: note.metadata,
    });
    expect(emitSpy).toHaveBeenCalledWith(
      "note.saved",
      expect.objectContaining({
        id: note.id,
        title: note.title,
        category: note.category,
      })
    );
    expect(result.content[0].text).toContain("Saved note to Nemo.");
  });

  it("deletes a note and emits the note.deleted webhook event", async () => {
    const server = new FakeMcpServer();
    const storage = createStorageMock();
    const noteId = "123e4567-e89b-12d3-a456-426614174001";

    (storage.deleteNote as ReturnType<typeof vi.fn>).mockResolvedValue(true);

    const webhookService = getWebhookService();
    const emitSpy = vi.spyOn(webhookService, "emit").mockResolvedValue();

    registerAllTools(server as unknown as McpServer, storage);

    const result = await server.tools.get("nemo_delete_note")!.handler({ id: noteId });

    expect(storage.deleteNote).toHaveBeenCalledWith(noteId);
    expect(emitSpy).toHaveBeenCalledWith("note.deleted", { id: noteId });
    expect(result.content[0].text).toBe(`Deleted entry ${noteId}`);
  });
});
