import { describe, expect, it } from "vitest";

import {
  DeleteNoteSchema,
  GetNoteSchema,
  SaveNoteSchema,
  SearchNotesSchema,
} from "../src/schemas/index.ts";

describe("note schemas", () => {
  it("applies defaults when saving a note", () => {
    const parsed = SaveNoteSchema.parse({
      title: "Capture this",
      content: "A useful idea from an AI conversation.",
    });

    expect(parsed.category).toBe("general");
    expect(parsed.tags).toEqual([]);
    expect(parsed.entry_type).toBe("note");
    expect(parsed.metadata).toEqual({});
  });

  it("rejects unexpected fields", () => {
    const result = SaveNoteSchema.safeParse({
      title: "Capture this",
      content: "A useful idea from an AI conversation.",
      extra: true,
    });

    expect(result.success).toBe(false);
  });

  it("uses the default search limit", () => {
    const parsed = SearchNotesSchema.parse({ query: "docker" });

    expect(parsed.limit).toBe(10);
  });

  it("validates note ids as UUIDs", () => {
    expect(GetNoteSchema.safeParse({ id: "invalid-id" }).success).toBe(false);
    expect(DeleteNoteSchema.safeParse({ id: "invalid-id" }).success).toBe(false);
  });
});
