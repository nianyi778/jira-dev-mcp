/**
 * Preview script to generate and open the review page locally
 * Run with: npx tsx preview-review.ts
 */

import { generateReviewPage } from './src/pages/review';
import { generateSubject, generateEmailBody } from './src/template';
import { translateToJapanese } from './src/translate';
import type { StoredReport, DailyReport, CompletedSubtask } from './src/types';
import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';

// Create mock data
const now = new Date();
const expiresAt = new Date(now.getTime() + 86400 * 1000);

const formatTime = (offsetMinutes: number): string => {
  const time = new Date(now.getTime() - offsetMinutes * 60 * 1000);
  return new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(time).replace(/\//g, '-');
};

const formatDate = (): string => {
  const formatter = new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = formatter.formatToParts(now);
  const year = parts.find(p => p.type === 'year')?.value || '';
  const month = parts.find(p => p.type === 'month')?.value || '';
  const day = parts.find(p => p.type === 'day')?.value || '';
  return `${year}年${month}月${day}日`;
};

async function main() {
  const completedTasks: CompletedSubtask[] = [
    {
      key: 'PROJ-101',
      summary: 'Fix login page validation error',
      assignee: '田中太郎',
      completedAt: formatTime(120),
      completedAtDate: new Date(now.getTime() - 120 * 60 * 1000),
    },
    {
      key: 'PROJ-102',
      summary: '修复用户注册时邮箱验证失败的问题',
      assignee: '佐藤花子',
      completedAt: formatTime(60),
      completedAtDate: new Date(now.getTime() - 60 * 60 * 1000),
    },
    {
      key: 'PROJ-103',
      summary: 'Fix database connection timeout',
      assignee: '鈴木一郎',
      completedAt: formatTime(30),
      completedAtDate: new Date(now.getTime() - 30 * 60 * 1000),
    },
  ];

  // Translate Chinese summaries to Japanese
  console.log('Translating Chinese summaries...');
  for (const task of completedTasks) {
    const original = task.summary;
    task.summary = await translateToJapanese(task.summary);
    if (original !== task.summary) {
      console.log(`  "${original}" -> "${task.summary}"`);
    }
  }

  const mockDailyReport: DailyReport = {
    date: formatDate(),
    reports: [
      {
        parentKey: 'PROJ-001',
        parentSummary: 'Release v2.0 - Bug fixes',
        completedToday: completedTasks,
        totalSubtasks: 15,
        completedSubtasks: 12,
        progressPercent: 80,
      },
    ],
    totalCompletedToday: 3,
  };

  const mockReport: StoredReport = {
    id: 'preview-test-token',
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    dailyReport: mockDailyReport,
    defaultTo: 'client@example.com',
    defaultCc: 'manager@example.com',
    defaultSubject: generateSubject(mockDailyReport),
    defaultBody: generateEmailBody(mockDailyReport),
  };

  // Generate HTML
  const html = generateReviewPage(mockReport);

  // Write to temp file
  const tempFile = path.join('/tmp', 'jira-review-preview.html');
  fs.writeFileSync(tempFile, html, 'utf-8');

  console.log(`Preview file created: ${tempFile}`);
  console.log('Opening in browser...');

  // Open in browser
  exec(`open "${tempFile}"`, (error) => {
    if (error) {
      console.error('Failed to open browser:', error);
    }
  });
}

main().catch(console.error);
