import { describe, expect, it, vi } from "vitest";
import request from "supertest";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { createHttpApp } from "../src/index.ts";

describe("HTTP app", () => {
  it("returns the health payload", async () => {
    const server = {
      connect: vi.fn().mockResolvedValue(undefined),
    } as unknown as Pick<McpServer, "connect">;

    const app = createHttpApp(server);
    const response = await request(app).get("/health");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      status: "ok",
      server: "nemo-mcp-server",
    });
  });
});
