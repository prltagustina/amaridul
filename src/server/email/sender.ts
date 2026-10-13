export type EmailMessage = {
  to: string;
  subject: string;
  text: string;
  /** Designed version; `text` stays for clients that do not show HTML. */
  html?: string;
  template: string;
  replyTo?: string;
  /**
   * One key per real-world event (a request, an invitation link, an approval…). A second send with
   * the same key is dropped by the provider for 24 h, so a retry or a double submit never duplicates.
   */
  idempotencyKey?: string;
};

/** Provider-agnostic. Local: console. Production (pending approval): Resend or equivalent. */
export interface EmailSender {
  send(message: EmailMessage): Promise<void>;
}

export class ConsoleEmailSender implements EmailSender {
  constructor(private readonly from: string) {}

  async send(message: EmailMessage): Promise<void> {
    console.info(
      [
        `──── EMAIL NO ENVIADO (solo registro) · ${message.subject} ────`,
        `From: ${this.from}`,
        `To: ${message.to}`,
        message.replyTo ? `Reply-To: ${message.replyTo}` : null,
        `Plantilla: ${message.template}`,
        `Asunto: ${message.subject}`,
        "",
        message.text,
        "───────────────────────────────────",
      ]
        .filter((l) => l !== null)
        .join("\n"),
    );
  }
}

import { LOCKUP_CID, LOCKUP_URL } from "./layout";

export class EmailDeliveryError extends Error {}

/**
 * Resend (https://resend.com) over its REST API: one POST per message, plain text. The API key is a
 * server-only secret; failures throw so callers can log them (they never lose the stored request).
 */
export class ResendEmailSender implements EmailSender {
  constructor(
    private readonly apiKey: string,
    private readonly from: string,
    /** Where replies go when a message does not set its own. */
    private readonly replyTo?: string,
    private readonly fetchImpl: typeof fetch = fetch,
    /** TEMPORARY (demo phase): blind copy of every email to the team. */
    private readonly bcc: string[] = [],
  ) {}

  async send(message: EmailMessage): Promise<void> {
    // Never copy someone on their own email: they would get it twice.
    const bcc = this.bcc.filter((a) => a !== message.to.toLowerCase());
    const res = await this.fetchImpl("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
        ...(message.idempotencyKey ? { "Idempotency-Key": message.idempotencyKey.slice(0, 256) } : {}),
      },
      body: JSON.stringify({
        from: this.from,
        to: [message.to],
        ...(bcc.length ? { bcc } : {}),
        subject: message.subject,
        text: message.text,
        ...(message.html ? { html: message.html } : {}),
        // The designed emails reference the lockup by cid; Resend fetches it and embeds it.
        ...(message.html?.includes(`cid:${LOCKUP_CID}`)
          ? { attachments: [{ filename: "amaridul.png", path: LOCKUP_URL, content_id: LOCKUP_CID, content_type: "image/png" }] }
          : {}),
        ...(message.replyTo || this.replyTo ? { replyTo: message.replyTo || this.replyTo } : {}),
        tags: [{ name: "template", value: message.template }],
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      // The body names the problem (unverified domain, invalid key…); never the key itself.
      const detail = (await res.text().catch(() => "")).slice(0, 300);
      throw new EmailDeliveryError(`Resend respondió ${res.status}: ${detail}`);
    }
  }
}

/** Collects messages in memory; used by tests. */
export class MemoryEmailSender implements EmailSender {
  readonly sent: EmailMessage[] = [];
  async send(message: EmailMessage): Promise<void> {
    this.sent.push(message);
  }
}
