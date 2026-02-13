import type { Env, StoredReport, AppConfig } from './types';
import {
  generateInternalNotificationSubject,
  generateInternalNotificationBody,
  generateInternalNotificationBodyHtml,
  generateNoTasksNotificationSubject,
  generateNoTasksNotificationBody,
  generateNoTasksNotificationBodyHtml,
} from './template';

const GMAIL_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GMAIL_SEND_URL = 'https://gmail.googleapis.com/gmail/v1/users/me/messages/send';

/**
 * Parse comma-separated email addresses to array
 */
function parseEmailAddresses(emailString: string): string[] {
  return emailString
    .split(',')
    .map((email) => email.trim())
    .filter((email) => email.length > 0);
}

function hasExternalGmailConfig(env: Env): boolean {
  return Boolean(
    env.GMAIL_CLIENT_ID &&
      env.GMAIL_CLIENT_SECRET &&
      env.GMAIL_REFRESH_TOKEN &&
      env.GMAIL_SENDER_EMAIL
  );
}

function hasInternalGmailConfig(env: Env): boolean {
  return Boolean(
    env.GMAIL_CLIENT_ID &&
      env.GMAIL_CLIENT_SECRET &&
      env.GMAIL_INTERNAL_REFRESH_TOKEN &&
      env.GMAIL_INTERNAL_SENDER_EMAIL
  );
}

function base64UrlEncode(input: string): string {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(input);
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64Encode(input: string): string {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(input);
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

function isAscii(input: string): boolean {
  for (let i = 0; i < input.length; i += 1) {
    if (input.charCodeAt(i) > 127) {
      return false;
    }
  }
  return true;
}

function encodeMimeHeader(value: string): string {
  if (!value) return value;
  if (isAscii(value)) return value;
  return `=?UTF-8?B?${base64Encode(value)}?=`;
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getExternalSignatureText(senderEmail: string): string {
  return [
    '--------------------',
    'ELESTYLE 株式会社',
    '陳 剣 / CHEN.J / TIN.K',
    'WEB : https://www.elestyle.jp',
    `MAIL : ${senderEmail}`,
    'TEL : 03-6222-9557',
    '〒110-0006',
    '東京都台東区秋葉原1-1',
    '秋葉原ビジネスセンター6階',
    '--------------------',
  ].join('\n');
}

function getExternalSignatureHtml(senderEmail: string): string {
  return `
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="font-size: 12px; color: #475569; line-height: 1.6;">
      <tr>
        <td style="font-weight: 600; color: #0f172a; padding-bottom: 2px;">ELESTYLE 株式会社</td>
      </tr>
      <tr>
        <td>陳 剣 / CHEN.J / TIN.K</td>
      </tr>
      <tr>
        <td>WEB : <a href="https://www.elestyle.jp" style="color: #0f172a; text-decoration: none;">https://www.elestyle.jp</a></td>
      </tr>
      <tr>
        <td>MAIL : <a href="mailto:${senderEmail}" style="color: #0f172a; text-decoration: none;">${senderEmail}</a></td>
      </tr>
      <tr>
        <td>TEL : 03-6222-9557</td>
      </tr>
      <tr>
        <td>〒110-0006</td>
      </tr>
      <tr>
        <td>東京都台東区秋葉原1-1</td>
      </tr>
      <tr>
        <td>秋葉原ビジネスセンター6階</td>
      </tr>
    </table>
  `;
}

function appendSignatureIfMissing(body: string, senderEmail: string): string {
  if (body.includes('https://www.elestyle.jp')) {
    return body;
  }
  const trimmed = body.trimEnd();
  return `${trimmed}\n\n${getExternalSignatureText(senderEmail)}`;
}

function buildMimeMessage(
  to: string,
  cc: string | null,
  subject: string,
  textBody: string,
  htmlBody: string,
  from: string
): string {
  const boundary = `boundary_${crypto.randomUUID()}`;
  const encodedSubject = encodeMimeHeader(subject);
  const headerLines = [`From: ${from}`, `To: ${to}`];
  if (cc) {
    headerLines.push(`Cc: ${cc}`);
  }
  headerLines.push(
    `Subject: ${encodedSubject}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    ''
  );
  const headers = `${headerLines.join('\r\n')}\r\n`;

  const body = [
    `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    'Content-Transfer-Encoding: 8bit',
    '',
    textBody,
    '',
    `--${boundary}`,
    'Content-Type: text/html; charset="UTF-8"',
    'Content-Transfer-Encoding: 8bit',
    '',
    htmlBody,
    '',
    `--${boundary}--`,
    '',
  ].join('\r\n');

  return headers + body;
}

async function getGmailAccessToken(
  env: Env,
  refreshToken: string | undefined
): Promise<string> {
  if (!env.GMAIL_CLIENT_ID) {
    throw new Error('GMAIL_CLIENT_ID is not configured');
  }
  if (!env.GMAIL_CLIENT_SECRET) {
    throw new Error('GMAIL_CLIENT_SECRET is not configured');
  }
  if (!refreshToken) {
    throw new Error('GMAIL_REFRESH_TOKEN is not configured');
  }

  const body = new URLSearchParams({
    client_id: env.GMAIL_CLIENT_ID,
    client_secret: env.GMAIL_CLIENT_SECRET,
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
  });

  const response = await fetch(GMAIL_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gmail token error (${response.status}): ${errorText}`);
  }

  const result = (await response.json()) as { access_token?: string };
  if (!result.access_token) {
    throw new Error('Gmail token response missing access_token');
  }
  return result.access_token;
}

async function sendViaGmail(
  to: string,
  cc: string | null,
  subject: string,
  textBody: string,
  htmlBody: string,
  env: Env,
  options: {
    senderEmail?: string;
    senderName?: string;
    refreshToken?: string;
  }
): Promise<void> {
  if (!options.senderEmail) {
    throw new Error('GMAIL_SENDER_EMAIL is not configured');
  }

  const toAddresses = parseEmailAddresses(to);
  if (toAddresses.length === 0) {
    throw new Error('No recipient email addresses provided');
  }

  const ccAddresses = cc ? parseEmailAddresses(cc) : [];

  const fromName = options.senderName ? options.senderName.trim() : '';
  const from = fromName
    ? `${encodeMimeHeader(fromName)} <${options.senderEmail}>`
    : options.senderEmail;

  const accessToken = await getGmailAccessToken(env, options.refreshToken);
  const mime = buildMimeMessage(
    toAddresses.join(', '),
    ccAddresses.length > 0 ? ccAddresses.join(', ') : null,
    subject,
    textBody,
    htmlBody,
    from
  );
  const raw = base64UrlEncode(mime);

  console.log(`Sending email to: ${to}`);
  console.log(`From: ${from}`);
  console.log(`Subject: ${subject}`);

  const response = await fetch(GMAIL_SEND_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ raw }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gmail API error (${response.status}): ${errorText}`);
  }
}

/**
 * Send internal notification email with review link
 */
export async function sendInternalNotification(
  storedReport: StoredReport,
  reviewUrl: string,
  env: Env,
  config: AppConfig
): Promise<void> {
  if (!config.internalEmail) {
    throw new Error('Internal email is not configured');
  }

  const internalSenderEmail = env.GMAIL_INTERNAL_SENDER_EMAIL;
  if (!internalSenderEmail) {
    throw new Error('GMAIL_INTERNAL_SENDER_EMAIL is not configured');
  }

  const subject = generateInternalNotificationSubject(storedReport.dailyReport);
  const textBody = generateInternalNotificationBody(storedReport, reviewUrl, internalSenderEmail);
  const htmlBody = generateInternalNotificationBodyHtml(storedReport, reviewUrl, env.JIRA_BASE_URL, internalSenderEmail);

  if (!hasInternalGmailConfig(env)) {
    throw new Error('Gmail internal sender is not configured');
  }

  await sendViaGmail(config.internalEmail, null, subject, textBody, htmlBody, env, {
    senderEmail: env.GMAIL_INTERNAL_SENDER_EMAIL,
    senderName: env.GMAIL_INTERNAL_SENDER_NAME,
    refreshToken: env.GMAIL_INTERNAL_REFRESH_TOKEN,
  });
}

/**
 * Send notification when no tasks were completed today
 */
export async function sendNoTasksNotification(
  date: string,
  parentIssues: string[],
  env: Env,
  config: AppConfig
): Promise<void> {
  if (!config.internalEmail) {
    throw new Error('Internal email is not configured');
  }

  const internalSenderEmail = env.GMAIL_INTERNAL_SENDER_EMAIL;
  if (!internalSenderEmail) {
    throw new Error('GMAIL_INTERNAL_SENDER_EMAIL is not configured');
  }

  const subject = generateNoTasksNotificationSubject(date);
  const textBody = generateNoTasksNotificationBody(date, parentIssues);
  const htmlBody = generateNoTasksNotificationBodyHtml(date, parentIssues);

  if (!hasInternalGmailConfig(env)) {
    throw new Error('Gmail internal sender is not configured');
  }

  await sendViaGmail(config.internalEmail, null, subject, textBody, htmlBody, env, {
    senderEmail: env.GMAIL_INTERNAL_SENDER_EMAIL,
    senderName: env.GMAIL_INTERNAL_SENDER_NAME,
    refreshToken: env.GMAIL_INTERNAL_REFRESH_TOKEN,
  });
}

export async function sendClientEmail(
  to: string,
  cc: string | null,
  subject: string,
  body: string,
  env: Env
): Promise<void> {
  if (!hasExternalGmailConfig(env)) {
    throw new Error('Gmail external sender is not configured');
  }

  const senderEmail = env.GMAIL_SENDER_EMAIL;
  if (!senderEmail) {
    throw new Error('GMAIL_SENDER_EMAIL is not configured');
  }

  const finalBody = appendSignatureIfMissing(body, senderEmail);
  const safeBody = escapeHtml(body).replace(/\r?\n/g, '<br />');
  const signatureHtml = getExternalSignatureHtml(senderEmail);
  const htmlBody = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin: 0; padding: 0; background: #f6f7fb; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Hiragino Sans', 'Meiryo', sans-serif; color: #0f172a;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" bgcolor="#f6f7fb">
    <tr>
      <td align="center" style="padding: 24px;">
        <table width="640" cellpadding="0" cellspacing="0" role="presentation" bgcolor="#ffffff" style="width: 640px; max-width: 100%; border-radius: 12px; box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08); overflow: hidden;">
          <tr>
            <td style="padding: 24px 28px; border-bottom: 1px solid #e5e7eb; background: #ffffff;">
              <div style="font-size: 12px; color: #64748b; margin-bottom: 6px;">メール内容プレビュー</div>
              <div style="font-size: 18px; font-weight: 600; color: #0f172a;">${escapeHtml(subject)}</div>
            </td>
          </tr>
          <tr>
            <td style="padding: 24px 28px; font-size: 14px; line-height: 1.8; color: #1f2937; background: #ffffff;">
              ${safeBody}
            </td>
          </tr>
          <tr>
            <td style="padding: 16px 28px; border-top: 1px solid #eef2f7; background: #ffffff;">
              ${signatureHtml}
            </td>
          </tr>
          <tr>
            <td style="padding: 16px 28px 22px; border-top: 1px solid #eef2f7; font-size: 12px; color: #94a3b8; background: #ffffff;">
              このメールは自動送信されています。
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  await sendViaGmail(to, cc, subject, finalBody, htmlBody, env, {
    senderEmail: env.GMAIL_SENDER_EMAIL,
    senderName: env.GMAIL_SENDER_NAME,
    refreshToken: env.GMAIL_REFRESH_TOKEN,
  });
}
