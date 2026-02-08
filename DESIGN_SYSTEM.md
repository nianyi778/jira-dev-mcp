# Design System

This document defines the visual and interaction standards for Jira Monitor.
All pages should follow these rules to keep a consistent, commercial-grade UX.

## Design Principles
- Clarity over decoration: every UI element must have a purpose.
- Consistent hierarchy: primary actions look the same everywhere.
- Calm density: comfortable spacing, no cramped layouts.
- Predictable motion: short, subtle transitions only.
- Accessible by default: color contrast and focus states are always visible.

## Typography
- Primary font: "Noto Sans SC" (UI, body, headings)
- Mono font: "JetBrains Mono" (codes, tokens, endpoints)
- Heading scale:
  - H1: 28-32px, 700
  - H2: 18-20px, 600
  - Body: 13-15px, 400-500
- Line height: 1.6 for body, 1.2-1.3 for headings

## Layout
- Admin layout: fixed 280px sidebar + main content
- Content width: max 960px in main area
- Page padding: 40px top, 60px sides, 80px bottom
- Section spacing: 24-32px between sections

## Color Tokens
Dark (default):
- bg-primary: #0a0a0f
- bg-secondary: #12121a
- bg-tertiary: #1a1a24
- bg-input: #0f0f16
- border: rgba(255,255,255,0.06)
- border-light: rgba(255,255,255,0.12)
- text-primary: #f0f0f5
- text-secondary: #a0a0b0
- text-muted: #606070

Light:
- bg-primary: #f6f6f9
- bg-secondary: #ffffff
- bg-tertiary: #f1f2f6
- bg-input: #f7f7fb
- border: rgba(15,23,42,0.08)
- border-light: rgba(15,23,42,0.16)
- text-primary: #0f172a
- text-secondary: #475569
- text-muted: #7b8794

Accents:
- green: #10b981
- blue: #3b82f6
- purple: #8b5cf6
- orange: #f59e0b
- pink: #ec4899
- red: #ef4444

## Components

Buttons
- Primary: gradient or solid accent, white text
- Secondary: bg-tertiary with border
- Disabled: opacity 0.5, no hover

Inputs
- Height: 40-44px
- Radius: 10px
- Focus: border + 3px shadow

Cards/Sections
- Radius: 18-20px
- Border: 1px solid border token
- Background: bg-secondary

Tables
- Header: bg-tertiary
- Row hover: bg-secondary or bg-tertiary
- Mono columns: use JetBrains Mono

Modals
- Overlay: rgba(15,15,20,0.6) + blur(6px)
- Card radius: 18-20px
- Primary/Secondary actions aligned

Badges
- Small pill, 11-12px, with border and background tint

Toasts
- Bottom-right, 12px radius
- Success/Warning/Error color accents

## Interaction Rules
- Confirmations must use custom modal (no browser confirm)
- Token actions: disable/enable only
- Admin navigation: all items live in config sidebar
- Logs page is a section inside /config

## Accessibility
- All buttons reachable by keyboard
- Focus states visible
- Avoid low-contrast gray text on light bg

## Theme Toggle
- Admin pages: inside sidebar footer
- Public pages: top-right floating
