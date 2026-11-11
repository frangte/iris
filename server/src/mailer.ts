export interface Mailer {
  sendOtp(email: string, code: string): Promise<void>;
}

/** Logs the code instead of sending. Used in development and tests. */
export class ConsoleMailer implements Mailer {
  readonly sent: { email: string; code: string }[] = [];
  constructor(private readonly quiet = false) {}
  async sendOtp(email: string, code: string) {
    this.sent.push({ email, code });
    if (!this.quiet) console.log(`[otp] ${email} → ${code}`);
  }
}

/** Sends through Resend's HTTP API (https://resend.com/docs/api-reference/emails/send-email). */
export class ResendMailer implements Mailer {
  constructor(
    private readonly apiKey: string,
    private readonly from: string,
  ) {}

  async sendOtp(email: string, code: string) {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: this.from,
        to: [email],
        subject: `Mã đăng nhập Floied: ${code}`,
        text: `Mã đăng nhập của bạn là ${code}. Mã có hiệu lực trong 10 phút.\n\nNếu bạn không yêu cầu, hãy bỏ qua email này.`,
      }),
    });
    if (!res.ok) {
      throw new Error(`Resend ${res.status}: ${await res.text()}`);
    }
  }
}

export function mailerFromEnv(env: Record<string, string | undefined>): Mailer {
  if (env.RESEND_API_KEY) {
    return new ResendMailer(env.RESEND_API_KEY, env.MAIL_FROM ?? 'Floied <onboarding@resend.dev>');
  }
  return new ConsoleMailer();
}
