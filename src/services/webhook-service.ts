// ============================================================
// Nemo — Webhook Service
// Sends events to external services (Make, Zapier, n8n, etc.)
// ============================================================

export interface WebhookEvent {
  event: string;
  timestamp: string;
  data: Record<string, unknown>;
}

export interface WebhookConfig {
  url: string;
  events: string[];  // e.g. ["knowledge.saved", "reminder.created"] or ["*"] for all
  secret?: string;   // Optional shared secret for signature verification
  name?: string;     // Friendly name (e.g. "Make - Notion sync")
}

export class WebhookService {
  private webhooks: WebhookConfig[];
  private retryAttempts: number;
  private timeoutMs: number;

  constructor() {
    this.webhooks = this.loadWebhooksFromEnv();
    this.retryAttempts = parseInt(process.env.WEBHOOK_RETRY_ATTEMPTS || "2");
    this.timeoutMs = parseInt(process.env.WEBHOOK_TIMEOUT_MS || "5000");

    if (this.webhooks.length > 0) {
      console.error(`🔗 Webhooks configured: ${this.webhooks.length}`);
      for (const wh of this.webhooks) {
        console.error(`   → ${wh.name || wh.url} (events: ${wh.events.join(", ")})`);
      }
    } else {
      console.error("🔗 No webhooks configured (set WEBHOOK_URL or WEBHOOKS_JSON to enable)");
    }
  }

  /**
   * Load webhook configs from environment variables.
   * 
   * Simple mode (single webhook):
   *   WEBHOOK_URL=https://hook.make.com/xxx
   *   WEBHOOK_EVENTS=*                        (optional, default: *)
   *   WEBHOOK_SECRET=my-secret                (optional)
   * 
   * Advanced mode (multiple webhooks):
   *   WEBHOOKS_JSON=[{"url":"https://hook.make.com/xxx","events":["knowledge.saved"],"name":"Make"},{"url":"https://hooks.zapier.com/yyy","events":["*"],"name":"Zapier"}]
   */
  private loadWebhooksFromEnv(): WebhookConfig[] {
    // Advanced mode: JSON array
    const jsonConfig = process.env.WEBHOOKS_JSON;
    if (jsonConfig) {
      try {
        const parsed = JSON.parse(jsonConfig) as WebhookConfig[];
        return parsed.filter((wh) => wh.url);
      } catch (e) {
        console.error("⚠️ Failed to parse WEBHOOKS_JSON:", (e as Error).message);
        return [];
      }
    }

    // Simple mode: single URL
    const url = process.env.WEBHOOK_URL;
    if (url) {
      return [{
        url,
        events: (process.env.WEBHOOK_EVENTS || "*").split(",").map((e) => e.trim()),
        secret: process.env.WEBHOOK_SECRET,
        name: "default",
      }];
    }

    return [];
  }

  /**
   * Check if any webhooks are configured
   */
  get isEnabled(): boolean {
    return this.webhooks.length > 0;
  }

  /**
   * Send an event to all matching webhooks.
   * This is fire-and-forget — it won't block the MCP response.
   */
  async emit(eventType: string, data: Record<string, unknown>): Promise<void> {
    if (!this.isEnabled) return;

    const event: WebhookEvent = {
      event: eventType,
      timestamp: new Date().toISOString(),
      data,
    };

    const matchingWebhooks = this.webhooks.filter(
      (wh) => wh.events.includes("*") || wh.events.includes(eventType)
    );

    if (matchingWebhooks.length === 0) return;

    // Fire-and-forget: don't await, don't block the MCP response
    const promises = matchingWebhooks.map((wh) =>
      this.sendWithRetry(wh, event).catch((err) => {
        console.error(`⚠️ Webhook failed [${wh.name || wh.url}]: ${(err as Error).message}`);
      })
    );

    // We intentionally don't await here to keep MCP responses fast.
    // But we still catch errors to avoid unhandled rejections.
    Promise.allSettled(promises);
  }

  /**
   * Send a webhook with retry logic
   */
  private async sendWithRetry(config: WebhookConfig, event: WebhookEvent): Promise<void> {
    const body = JSON.stringify(event);
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "User-Agent": "Memento-MCP/1.0",
      "X-Memento-Event": event.event,
    };

    // Add HMAC signature if secret is configured
    if (config.secret) {
      const { createHmac } = await import("node:crypto");
      const signature = createHmac("sha256", config.secret).update(body).digest("hex");
      headers["X-Memento-Signature"] = `sha256=${signature}`;
    }

    for (let attempt = 0; attempt <= this.retryAttempts; attempt++) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

        const response = await fetch(config.url, {
          method: "POST",
          headers,
          body,
          signal: controller.signal,
        });

        clearTimeout(timeout);

        if (response.ok) {
          console.error(`✅ Webhook sent [${config.name || "default"}] → ${event.event}`);
          return;
        }

        // Non-retryable status codes
        if (response.status >= 400 && response.status < 500 && response.status !== 429) {
          console.error(`⚠️ Webhook rejected [${config.name}]: ${response.status} ${response.statusText}`);
          return;
        }

        // Retryable: 429, 5xx
        if (attempt < this.retryAttempts) {
          const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
          console.error(`🔄 Webhook retry ${attempt + 1}/${this.retryAttempts} in ${delay}ms...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      } catch (err) {
        if (attempt < this.retryAttempts) {
          const delay = Math.pow(2, attempt) * 1000;
          console.error(`🔄 Webhook error, retry ${attempt + 1}/${this.retryAttempts} in ${delay}ms: ${(err as Error).message}`);
          await new Promise((resolve) => setTimeout(resolve, delay));
        } else {
          throw err;
        }
      }
    }
  }
}

// ── Singleton ────────────────────────────────────────────────

let instance: WebhookService | null = null;

export function getWebhookService(): WebhookService {
  if (!instance) {
    instance = new WebhookService();
  }
  return instance;
}
