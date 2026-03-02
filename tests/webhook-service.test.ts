import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { WebhookService } from "../src/services/webhook-service.ts";

const originalEnv = { ...process.env };

describe("WebhookService", () => {
  beforeEach(() => {
    process.env = {
      ...originalEnv,
      WEBHOOK_URL: "https://example.com/webhook",
      WEBHOOK_EVENTS: "note.saved",
      WEBHOOK_SECRET: "test-secret",
      WEBHOOK_RETRY_ATTEMPTS: "0",
      WEBHOOK_TIMEOUT_MS: "50",
    };

    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("sends signed webhook requests for note events", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: "OK",
    });

    vi.stubGlobal("fetch", fetchMock);

    const service = new WebhookService();
    await service.emit("note.saved", { id: "note-1" });

    await vi.waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    const [url, init] = fetchMock.mock.calls[0] as [
      string,
      RequestInit & { headers: Record<string, string> },
    ];

    expect(url).toBe("https://example.com/webhook");
    expect(init.method).toBe("POST");
    expect(init.headers["User-Agent"]).toBe("Nemo-MCP/1.0");
    expect(init.headers["X-Nemo-Event"]).toBe("note.saved");
    expect(init.headers["X-Nemo-Signature"]).toMatch(/^sha256=/);
  });

  it("skips webhook delivery when the event does not match", async () => {
    process.env.WEBHOOK_EVENTS = "bookmark.saved";

    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const service = new WebhookService();
    await service.emit("note.saved", { id: "note-1" });

    expect(fetchMock).not.toHaveBeenCalled();
  });
});
