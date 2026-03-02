import { describe, expect, it, vi } from "vitest";

import { SupabaseAdapter } from "../src/services/supabase-adapter.ts";

type QueryResponse = {
  data: unknown[] | null;
  error: { message: string } | null;
};

function createBuilder(response: QueryResponse) {
  const builder: Record<string, any> = {};

  builder.select = vi.fn(() => builder);
  builder.insert = vi.fn(() => builder);
  builder.single = vi.fn(() => Promise.resolve(response));
  builder.textSearch = vi.fn(() => builder);
  builder.or = vi.fn(() => builder);
  builder.eq = vi.fn(() => builder);
  builder.overlaps = vi.fn(() => builder);
  builder.limit = vi.fn(() => builder);
  builder.order = vi.fn(() => Promise.resolve(response));

  return builder;
}

describe("SupabaseAdapter", () => {
  it("uses full-text search on search_vector when available", async () => {
    const adapter = new SupabaseAdapter("https://example.supabase.co", "test-key");
    const builder = createBuilder({ data: [], error: null });
    const from = vi.fn(() => builder);

    (adapter as any).client = { from };

    await adapter.searchNotes("docker");

    expect(from).toHaveBeenCalledWith("notes");
    expect(builder.select).toHaveBeenCalledWith(
      "id, title, content, category, tags, source, entry_type, metadata, created_at, updated_at"
    );
    expect(builder.textSearch).toHaveBeenCalledWith("search_vector", "docker", {
      config: "french",
      type: "websearch",
    });
    expect(builder.or).not.toHaveBeenCalled();
  });

  it("falls back to ilike search when search_vector is not available", async () => {
    const adapter = new SupabaseAdapter("https://example.supabase.co", "test-key");
    const ftsBuilder = createBuilder({
      data: null,
      error: { message: "column notes.search_vector does not exist" },
    });
    const fallbackBuilder = createBuilder({ data: [], error: null });
    const from = vi
      .fn()
      .mockReturnValueOnce(ftsBuilder)
      .mockReturnValueOnce(fallbackBuilder);

    (adapter as any).client = { from };

    await adapter.searchNotes("docker", "devops", ["search"]);

    expect(ftsBuilder.textSearch).toHaveBeenCalledWith("search_vector", "docker", {
      config: "french",
      type: "websearch",
    });
    expect(fallbackBuilder.or).toHaveBeenCalledWith(
      "title.ilike.%docker%,content.ilike.%docker%"
    );
    expect(fallbackBuilder.eq).toHaveBeenCalledWith("category", "devops");
    expect(fallbackBuilder.overlaps).toHaveBeenCalledWith("tags", ["search"]);
  });
});
