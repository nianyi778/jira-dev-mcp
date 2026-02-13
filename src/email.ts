import type { Env, StoredReport, ResendEmailRequest, AppConfig } from './types';
import {
  generateInternalNotificationSubject,
  generateInternalNotificationBody,
  generateInternalNotificationBodyHtml,
  generateNoTasksNotificationSubject,
  generateNoTasksNotificationBody,
  generateNoTasksNotificationBodyHtml,
} from './template';

const RESEND_API_URL = 'https://api.resend.com/emails';
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

function hasGmailConfig(env: Env): boolean {
  return Boolean(
    env.GMAIL_CLIENT_ID ||
      env.GMAIL_CLIENT_SECRET ||
      env.GMAIL_REFRESH_TOKEN ||
      env.GMAIL_SENDER_EMAIL ||
      env.GMAIL_SENDER_NAME
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

function buildMimeMessage(
  to: string,
  subject: string,
  textBody: string,
  htmlBody: string,
  from: string
): string {
  const boundary = `boundary_${crypto.randomUUID()}`;
  const headers = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    '',
  ].join('\r\n');

  const body = [
    `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    'Content-Transfer-Encoding: 7bit',
    '',
    textBody,
    '',
    `--${boundary}`,
    'Content-Type: text/html; charset="UTF-8"',
    'Content-Transfer-Encoding: 7bit',
    '',
    htmlBody,
    '',
    `--${boundary}--`,
    '',
  ].join('\r\n');

  return headers + body;
}

async function getGmailAccessToken(env: Env): Promise<string> {
  if (!env.GMAIL_CLIENT_ID) {
    throw new Error('GMAIL_CLIENT_ID is not configured');
  }
  if (!env.GMAIL_CLIENT_SECRET) {
    throw new Error('GMAIL_CLIENT_SECRET is not configured');
  }
  if (!env.GMAIL_REFRESH_TOKEN) {
    throw new Error('GMAIL_REFRESH_TOKEN is not configured');
  }

  const body = new URLSearchParams({
    client_id: env.GMAIL_CLIENT_ID,
    client_secret: env.GMAIL_CLIENT_SECRET,
    refresh_token: env.GMAIL_REFRESH_TOKEN,
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
  subject: string,
  textBody: string,
  htmlBody: string,
  env: Env
): Promise<void> {
  if (!env.GMAIL_SENDER_EMAIL) {
    throw new Error('GMAIL_SENDER_EMAIL is not configured');
  }

  const toAddresses = parseEmailAddresses(to);
  if (toAddresses.length === 0) {
    throw new Error('No recipient email addresses provided');
  }

  const fromName = env.GMAIL_SENDER_NAME ? env.GMAIL_SENDER_NAME.trim() : '';
  const from = fromName
    ? `${fromName} <${env.GMAIL_SENDER_EMAIL}>`
    : env.GMAIL_SENDER_EMAIL;

  const accessToken = await getGmailAccessToken(env);
  const mime = buildMimeMessage(toAddresses.join(', '), subject, textBody, htmlBody, from);
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
 * Send email via Resend API
 */
async function sendViaResend(
  to: string,
  subject: string,
  textBody: string,
  htmlBody: string,
  env: Env
): Promise<void> {
  if (!env.RESEND_FROM_EMAIL) {
    throw new Error('RESEND_FROM_EMAIL is not configured');
  }
  if (!env.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY is not configured');
  }

  const toAddresses = parseEmailAddresses(to);

  if (toAddresses.length === 0) {
    throw new Error('No recipient email addresses provided');
  }

  const emailRequest: ResendEmailRequest = {
    from: env.RESEND_FROM_EMAIL,
    to: toAddresses,
    subject,
    text: textBody,
    html: htmlBody,
  };

  console.log(`Sending email to: ${to}`);
  console.log(`From: ${env.RESEND_FROM_EMAIL}`);
  console.log(`Subject: ${subject}`);

  const response = await fetch(RESEND_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(emailRequest),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Resend API error (${response.status}): ${errorText}`
    );
  }

  const result = await response.json();
  console.log('Email sent successfully, id:', (result as { id?: string }).id);
}

async function sendEmail(
  to: string,
  subject: string,
  textBody: string,
  htmlBody: string,
  env: Env
): Promise<void> {
  if (hasGmailConfig(env)) {
    await sendViaGmail(to, subject, textBody, htmlBody, env);
    return;
  }
  await sendViaResend(to, subject, textBody, htmlBody, env);
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

  const subject = generateInternalNotificationSubject(storedReport.dailyReport);
  const textBody = generateInternalNotificationBody(storedReport, reviewUrl);
  const htmlBody = generateInternalNotificationBodyHtml(storedReport, reviewUrl);

  await sendEmail(config.internalEmail, subject, textBody, htmlBody, env);
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

  const subject = generateNoTasksNotificationSubject(date);
  const textBody = generateNoTasksNotificationBody(date, parentIssues);
  const htmlBody = generateNoTasksNotificationBodyHtml(date, parentIssues);

  await sendEmail(config.internalEmail, subject, textBody, htmlBody, env);
}
