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

/**
 * Parse comma-separated email addresses to array
 */
function parseEmailAddresses(emailString: string): string[] {
  return emailString
    .split(',')
    .map((email) => email.trim())
    .filter((email) => email.length > 0);
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

  await sendViaResend(config.internalEmail, subject, textBody, htmlBody, env);
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

  await sendViaResend(config.internalEmail, subject, textBody, htmlBody, env);
}
