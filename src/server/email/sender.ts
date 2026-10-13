export type EmailMessage = {
  to: string;
  subject: string;
  text: string;
  template: string;
  replyTo?: string;
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
  ) {}

  async send(message: EmailMessage): Promise<void> {
    const res = await this.fetchImpl("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${this.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: this.from,
        to: [message.to],
        subject: message.subject,
        text: message.text,
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
