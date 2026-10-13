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

/** Collects messages in memory; used by tests. */
export class MemoryEmailSender implements EmailSender {
  readonly sent: EmailMessage[] = [];
  async send(message: EmailMessage): Promise<void> {
    this.sent.push(message);
  }
}
