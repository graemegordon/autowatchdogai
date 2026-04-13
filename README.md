# ATIP Request Generator

An AI-powered Access to Information (ATIP) request generator for Canadian investigative journalists.

## Features

### Phase 2 – AI Request Generation
- Downloads the latest `ati-all.csv` from open.canada.ca daily (Vercel cron at 06:00 UTC)
- Calls Claude Opus to analyze patterns and generate 5–10 highly specific ATIP request ideas
- Saves results to `proposed_requests` table with `pending` status

### Phase 3 – Journalist Review Dashboard
- Beautiful dark-mode card dashboard listing daily proposals
- Each card: institution, draft request text, AI reasoning, date range
- Actions: **Approve** | **Edit** (inline rich text via Tiptap) | **Reject** | **Archive**
- Filter by status, date batch, or free-text search
- "Generate New Batch" button for on-demand generation

### Phase 4 – PDF Form Generator
- Route `/api/generate-form?id=<requestId>` generates a TBS 350-57 compliant PDF
- Fills all fields: requester info, institution name + mailing address, records description, $5 fee note
- Page 2: step-by-step instruction sheet (print → sign → attach $5 cheque → mail)
- 27 government departments with verified ATIP coordinator addresses

### Phase 5 – Polish
- Dark mode (journalist vibe) — defaults to dark, toggleable
- Email notifications on new daily batch via **Resend**
- Searchable history of submitted requests with status tracking
- Rate limiting on AI routes (10 stories/hr, 20 PDFs/hr)
- Vercel cron job configuration

### Phase 6 – ATIP Disclosures Feed
- Fetches voluntarily posted ATIP disclosures from open.canada.ca
- AI-generated headlines for each disclosure
- **Generate News Story** button: produces 500–800 word draft story
- Government questions section for reporter follow-up
- Paginated, searchable, 12-hour cache

## Tech Stack

| Layer | Tech |
|-------|------|
| Framework | Next.js 15 (App Router) |
| Auth + DB | Supabase |
| AI | Claude Opus 4.6 (Anthropic) |
| PDF | pdf-lib |
| Rich Text | Tiptap |
| Email | Resend |
| Styling | Tailwind CSS + next-themes |
| Cron | Vercel Cron Jobs |

## Setup

### 1. Clone and install

```bash
git clone <repo>
cd ati-request-generator
npm install
```

### 2. Environment variables

Copy `.env.example` to `.env.local` and fill in:

```bash
cp .env.example .env.local
```

Required:
- `NEXT_PUBLIC_SUPABASE_URL` — your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — public anon key
- `SUPABASE_SERVICE_ROLE_KEY` — service role key (server-side only)
- `ANTHROPIC_API_KEY` — from console.anthropic.com
- `CRON_SECRET` — random string to protect the cron endpoint

Optional:
- `RESEND_API_KEY` — for email notifications
- `NOTIFICATION_EMAIL` — where to send daily batch notifications

### 3. Database setup

Run the migration in your Supabase SQL editor:

```sql
-- Copy contents of supabase/migrations/001_init.sql
```

Or use the Supabase CLI:

```bash
supabase db push
```

### 4. Run locally

```bash
npm run dev
```

### 5. Deploy to Vercel

```bash
vercel --prod
```

The `vercel.json` cron runs `/api/cron/generate-requests` daily at 06:00 UTC.
Set `CRON_SECRET` in your Vercel environment variables.

## Usage

1. **Sign in** with email/password, magic link, or Google OAuth
2. **Dashboard** — review AI-generated ATIP proposals; approve, edit, or reject
3. **Approve** a request → click **Download PDF Form** → print → sign → attach $5 cheque → mail
4. **Disclosures** — browse latest voluntary ATIP releases; generate news stories with one click
5. **History** — track your submitted requests; mark as submitted / received / completed

## ATIP Filing Notes

- The $5 application fee is mandatory under s. 11 of the Access to Information Act
- Make cheques payable to **Receiver General for Canada**
- Response time: 30 calendar days (extensions allowed under s. 9)
- Complaints to: Office of the Information Commissioner, 1-800-267-0441

## Government Departments Supported

DFO, DND, ESDC, FCAC, GAC, HC, INFC, IRCC, NRC, NRCAN, PCO, PMO, PS, PSPC, RCMP, SSC, TC, TBS, VAC, CRA, CBSA, CSE, CSIS, PHAC, ISED, ENV, FIN, JUS

## License

For authorized journalism use. ATIP requests are public records under Canadian law.
