// ============================================================
// Nemo — MCP Server
// A personal note-taking MCP accessible from AI assistants
// ============================================================

import "dotenv/config";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import express from "express";
import { pathToFileURL } from "node:url";

import type { StorageAdapter } from "./types.js";
import { SupabaseAdapter } from "./services/supabase-adapter.js";
import { PostgresAdapter } from "./services/postgres-adapter.js";
import { registerAllTools } from "./tools/index.js";

// ── Configuration ──────────────────────────────────────────

export function getStorageAdapter(): StorageAdapter {
  const storageType = process.env.STORAGE_TYPE || "supabase";

  if (storageType === "supabase") {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_KEY;
    if (!url || !key) {
      console.error("Error: SUPABASE_URL and SUPABASE_SERVICE_KEY are required for Supabase storage.");
      console.error("Set STORAGE_TYPE=postgres to use self-hosted PostgreSQL instead.");
      process.exit(1);
    }
    console.error(`Storage: Supabase (${url})`);
    return new SupabaseAdapter(url, key);
  }

  if (storageType === "postgres") {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      console.error("Error: DATABASE_URL is required for PostgreSQL storage.");
      console.error("Example: DATABASE_URL=postgresql://user:pass@localhost:5432/nemo");
      process.exit(1);
    }
    console.error(`Storage: PostgreSQL (${connectionString.replace(/\/\/.*@/, "//***@")})`);
    return new PostgresAdapter(connectionString);
  }

  console.error(`Error: Unknown STORAGE_TYPE "${storageType}". Use "supabase" or "postgres".`);
  process.exit(1);
}

// ── Server Setup ───────────────────────────────────────────

export function createMcpServer(storage: StorageAdapter = getStorageAdapter()): McpServer {
  const server = new McpServer({
    name: "nemo-mcp-server",
    version: "1.0.0",
  });

  registerAllTools(server, storage);
  return server;
}

// ── Transport: Streamable HTTP (for remote access) ─────────

export function createHttpApp(server: Pick<McpServer, "connect">): express.Express {
  const app = express();
  app.use(express.json());

  // Health check
  app.get("/health", (_req, res) => {
    res.json({ status: "ok", server: "nemo-mcp-server" });
  });

  // MCP endpoint
  app.post("/mcp", async (req, res) => {
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    });
    res.on("close", () => transport.close());
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  });

  return app;
}

export async function runHTTP(server: McpServer = createMcpServer()): Promise<void> {
  const app = createHttpApp(server);

  const port = parseInt(process.env.PORT || "3100");
  app.listen(port, "0.0.0.0", () => {
    console.error(`Nemo MCP server running on http://0.0.0.0:${port}/mcp`);
    console.error(`   Health check: http://0.0.0.0:${port}/health`);
  });
}

// ── Transport: stdio (for local use) ───────────────────────

export async function runStdio(server: McpServer = createMcpServer()): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Nemo MCP server running on stdio");
}

// ── Entry Point ────────────────────────────────────────────

export async function main(): Promise<void> {
  const server = createMcpServer();
  const transport = process.env.TRANSPORT || "http";

  if (transport === "http") {
    await runHTTP(server);
    return;
  }

  await runStdio(server);
}

const isMainModule =
  process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMainModule) {
  main().catch((error) => {
    console.error("Server error:", error);
    process.exit(1);
  });
}
