# Nemo — MCP Server

> Turn your AI conversations into structured, searchable notes.

An [MCP (Model Context Protocol)](https://modelcontextprotocol.io/) server that lets you save notes, conversation takeaways, ideas, code snippets, bookmarks, and reminders directly from Claude, ChatGPT, or any MCP-compatible AI assistant.

## Disclaimer

This project is experimental and is not ready for production use.

The MCP endpoint is not secured yet: authentication and authorization are not implemented, so access is not protected by default. Do not expose this server publicly as-is.

Before using it in production, you should at minimum add authentication, access control, proper secret management, rate limiting, and basic security hardening around the HTTP endpoint.

## Repository Layout

- `src/` — Runtime server code
- `db/` — Public database schema and migrations
- `docs/` — Product-facing public docs
- `notes/` — Public work-in-progress notes, mockups, and experiments

## What It Does

You're chatting with Claude on your phone and the conversation is brilliant. Instead of losing it, you say:

> *"Save this in Nemo under DevOps, tag it docker and kubernetes"*

Claude calls your MCP server, and your note is stored, categorized, and searchable later.

### Available Tools

| Tool | Description |
|------|-------------|
| `nemo_save_note` | Save a conversation, idea, snippet, or note |
| `nemo_search_notes` | Search through your saved notes |
| `nemo_get_note` | Retrieve a specific note by ID |
| `nemo_delete_note` | Delete a note |
| `nemo_list_categories` | List all categories with counts |
| `nemo_add_reminder` | Add a reminder with due date and priority |
| `nemo_list_reminders` | List pending (or all) reminders |
| `nemo_complete_reminder` | Mark a reminder as done |
| `nemo_save_bookmark` | Save a URL with tags and description |
| `nemo_search_bookmarks` | Search through saved bookmarks |
| `nemo_list_bookmarks` | List bookmarks by category |
| `nemo_stats` | Dashboard with counts and categories |

## Two Deployment Options

### Option A: Supabase (Recommended)

Best if you want a managed database with a free tier, REST API for future apps (Flutter, web), and zero database maintenance.

```
Your Phone → Claude App → Your VPS (MCP Server) → Supabase Cloud (PostgreSQL)
```

### Option B: Self-Hosted (Docker)

Best if you want full data ownership, everything on your VPS, no external dependencies.

```
Your Phone → Claude App → Your VPS (Docker: MCP Server + PostgreSQL)
```

## Search Language

Full-text search for notes is configured in French by default.

If most of your notes are in another language, update the text search config so it matches your target language in `db/schema.sql`, `db/migrations/003_add_notes_search_vector.sql`, `src/services/supabase-adapter.ts`, and `src/services/postgres-adapter.ts`.

---

## Quick Start — Option A: Supabase

### 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a free project
2. Go to **SQL Editor** and run the contents of `db/schema.sql`
3. Go to **Settings → API** and copy your:
   - Project URL (e.g., `https://abc123.supabase.co`)
   - Service Role Key (keep this secret!)

### 2. Deploy on Your VPS

```bash
# Clone the repo
git clone https://github.com/gabriellangon/nemo-mcp.git
cd nemo-mcp

# Install dependencies
npm install

# Build
npm run build

# Configure
cp .env.example .env
# Edit .env with your Supabase credentials:
#   STORAGE_TYPE=supabase
#   SUPABASE_URL=https://your-project.supabase.co
#   SUPABASE_SERVICE_KEY=your-service-role-key

# Test it
node dist/index.js
# Should see: Nemo MCP server running on http://0.0.0.0:3100/mcp
```

### 3. Keep It Running with pm2

```bash
npm install -g pm2
pm2 start dist/index.js --name nemo-mcp
pm2 save
pm2 startup  # Auto-start on reboot
```

### 4. Set Up HTTPS with Nginx

```bash
# Install certbot if not already done
sudo apt install certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d nemo.yourdomain.com

# Copy nginx config
sudo cp nginx.conf /etc/nginx/sites-available/nemo-mcp
# Edit the domain name in the file
sudo ln -s /etc/nginx/sites-available/nemo-mcp /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

---

## Quick Start — Option B: Self-Hosted (Docker)

```bash
# Clone the repo
git clone https://github.com/gabriellangon/nemo-mcp.git
cd nemo-mcp

# Configure
cp .env.example .env
# Edit .env:
#   STORAGE_TYPE=postgres
#   DB_PASSWORD=your-secure-password

# Launch everything
docker compose up -d

# Check logs
docker compose logs -f mcp
```

Then set up nginx + HTTPS the same way as Option A.

---

## Connect to Claude

### Claude.ai (Web & Mobile)

1. Go to **Settings → Integrations → MCP**
2. Add a new integration:
   - **URL**: `https://nemo.yourdomain.com/mcp`
3. Start chatting and say things like:
   - *"Save this conversation in my brain under the category 'devops'"*
   - *"What did I save about Docker?"*
   - *"Add a reminder for next Friday to review the PR"*
   - *"Bookmark this link: https://..."*

### Claude Desktop (Local)

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "nemo": {
      "command": "node",
      "args": ["/path/to/nemo-mcp/dist/index.js"],
      "env": {
        "TRANSPORT": "stdio",
        "STORAGE_TYPE": "supabase",
        "SUPABASE_URL": "https://your-project.supabase.co",
        "SUPABASE_SERVICE_KEY": "your-service-role-key"
      }
    }
  }
}
```

---

## Webhooks — Connect to Make, Zapier, n8n

Nemo can send events to external services whenever something happens. This lets you build automations like:

- **Save to Notion** — Every new note creates a page in your Notion database
- **Google Calendar** — New reminders automatically create calendar events
- **Slack notifications** — Get pinged when you save something important
- **Google Sheets** — Log all bookmarks to a spreadsheet
- **Email digest** — Trigger a daily summary via n8n

### Quick Setup with Make

1. In Make, create a new scenario with a **Webhook** trigger
2. Copy the webhook URL (e.g. `https://hook.eu2.make.com/abc123...`)
3. Add it to your `.env`:
   ```
   WEBHOOK_URL=https://hook.eu2.make.com/abc123...
   ```
4. Restart the MCP server
5. Now every time you save something via Claude, Make receives the event

### Webhook Events

| Event | Triggered when | Data included |
|-------|---------------|---------------|
| `note.saved` | New note saved | id, title, category, tags, content_preview, source |
| `note.deleted` | Note deleted | id |
| `reminder.created` | New reminder added | id, title, due_date, priority, description |
| `reminder.completed` | Reminder marked as done | id |
| `bookmark.saved` | New bookmark saved | id, url, title, tags, category, description |

### Payload Format

Every webhook receives a JSON POST with this structure:

```json
{
  "event": "note.saved",
  "timestamp": "2025-03-15T14:30:00.000Z",
  "data": {
    "id": "uuid-here",
    "title": "Docker multi-stage builds",
    "category": "devops",
    "tags": ["docker", "ci-cd"],
    "content_preview": "First 300 characters...",
    "source": "claude-chat"
  }
}
```

### Multiple Webhooks

You can send different events to different services:

```bash
WEBHOOKS_JSON='[
  {
    "url": "https://hook.eu2.make.com/xxx",
    "events": ["note.saved", "bookmark.saved"],
    "name": "Make - Notion sync"
  },
  {
    "url": "https://hooks.zapier.com/yyy",
    "events": ["reminder.created"],
    "name": "Zapier - Google Calendar"
  },
  {
    "url": "https://n8n.yourdomain.com/webhook/zzz",
    "events": ["*"],
    "name": "n8n - Log everything"
  }
]'
```

### Security

Add a shared secret for HMAC signature verification:

```bash
WEBHOOK_SECRET=your-secret-here
```

Each request includes an `X-Nemo-Signature` header with a `sha256=` HMAC of the payload body. Verify this in your automation to ensure the request comes from your Nemo server.

---

## Future Ideas

- **Flutter app** to browse your notes (connects directly to Supabase)
- **Vector search** with pgvector for semantic "find things similar to..."
- **Image storage** via Supabase Storage
- **Export** to Markdown/Obsidian
- **Daily digest** of reminders via email

---

## Development

```bash
# Install dependencies
npm install

# Development mode (auto-reload)
npm run dev

# Build for production
npm run build

# Run tests (coming soon)
npm test
```

## License

MIT — Use it, fork it, make it yours.
