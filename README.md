# AudienceMeter ⚡ — Real-Time Interactive Polling Platform

A high-performance, minimalist **Mentimeter alternative** engineered for live events, workshops, webinars, and conferences. Handles **100–200+ concurrent participants** with sub-second real-time response updates, low-bandwidth mobile optimization, and automatic lead collection (First Name, Last Name, WhatsApp, Email).

Designed to be hosted **100% free of cost on Vercel** paired with **Supabase Free Tier (PostgreSQL + WebSockets)**.

---

## 🌟 Key Features

### 1. Diverse Question & Response Styles
- **Single Choice (MCQ)**: Real-time animated bar charts with vote counts & percentages.
- **Multiple Choice**: Multi-select voting with live distribution.
- **Short Answer (Word Cloud)**: Live interactive word cloud that dynamically scales words by frequency.
- **Long Answer / Q&A**: Responsive stream of audience thoughts, questions, and feedback.
- **True / False**: High-contrast pulse check with duel comparison.
- **Rating Scale (1–5)**: Live weighted average score calculation with star distribution.

### 2. Google Form-Style Shareable Surveys (`/survey/[code]`)
- **Direct Share Link**: Send a link (e.g. `/survey/512340` or `/s/512340`) via WhatsApp, Email, or Slack to collect feedback asynchronously — no live presentation screen needed.
- **Single-Page Form Flow**: All survey questions presented in a clean Google Forms layout.
- **Configurable Respondent Info**: Require or make optional Full Name, WhatsApp, Email, or allow 100% anonymous responses.
- **Question Validation**: Mark questions as required with asterisk (`*`) and automatic form validation.
- **Atomic Batch Submission**: Submits all answers in a single request directly to the database.
- **Custom Confirmation & Celebration**: Confetti animation and customizable thank you message.

### 3. Frictionless Participant Onboarding (Live Mode)
- **Direct Link / QR Code**: Participants join via URL (e.g. `/join/824915`) or by scanning a QR code on the presentation screen.
- **Effortless Registration**: First Name, Last Name, WhatsApp Mobile Number, and Email.
- **Local Storage Caching**: Participant details are remembered on the device so reloading or switching apps never asks for their data again.
- **Low-Bandwidth Mobile First**: Lightweight HTML/CSS/SVG charts load in under 1 second even on 2G/3G mobile networks.

### 4. Excel (.xlsx) & CSV Export
- **Google Sheets Format Grid**: Sheet 1 outputs 1 row per submission with each question as a dedicated column, matching the Google Forms spreadsheet export.
- **Detailed Audit Log**: Sheet 2 contains row-by-row question answer history with timestamps.
- **Respondents Directory**: Sheet 3 lists all respondents, contact details, and completion status.
- **Questions & Stats**: Sheet 4 provides choice breakdowns, response counts, and rating averages.

### 5. Public Presentation View (`/present/[code]`)
- Projector/Large display view with big, high-contrast typography.
- Real-time animated SVG bar charts, word clouds, and response counters.
- QR code toggle modal with one-click URL copy.
- Floating host toolbar:
  - Previous / Next slide controls
  - Lock / Unlock submissions in real time
  - Show / Hide results toggle
  - Fullscreen toggle (Key `F`)
  - Confetti burst for celebrations (Key `C`)
  - Direct Excel / CSV Export of attendee responses

### 6. Admin Dashboard & Form Builder (`/admin`)
- Create either **Live Audience Presentations** or **Google Form-Style Surveys**.
- Filter tabs: "All", "⚡ Live Polls", "📋 Survey Forms".
- Quick **"Copy Share Link"** for surveys and **"Open Form"** preview.
- In-browser **Responses & Analytics Modal** with live option bar charts, average ratings, and Google Sheets submission table.
- Edit form questions, set required toggles, add options, and configure thank you messages.

---

## 🚀 Instant Deployment to Vercel (100% Free)

### Step 1: Deploy to Vercel
1. Push this repository to your GitHub account.
2. Go to [Vercel](https://vercel.com) and click **"Add New Project"**.
3. Select your repository and click **Deploy**.

### Step 2: Set Up Free Database (Supabase)
1. Create a free account at [Supabase](https://supabase.com).
2. Create a new project (e.g. `audiencemeter`).
3. In your Supabase Dashboard, go to the **SQL Editor**, open the [`supabase-schema.sql`](file:///Users/sadiq/antigravity/audience-meter/supabase-schema.sql) file from this repository, and click **Run**.
4. In your Supabase project settings under **API**, copy:
   - `Project URL`
   - `anon public key`
5. In your Vercel project settings under **Environment Variables**, add:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key
   ```
6. Redeploy. Your platform now has real-time WebSocket synchronization across all devices!

> **Note**: Even without Supabase keys, AudienceMeter includes a built-in zero-config live sync engine (`/api/sync`) so it functions immediately out of the box!

---

## 💻 Local Development

```bash
# 1. Install dependencies
npm install

# 2. Run local development server
npm run dev

# 3. Open in browser
# Landing Page:            http://localhost:3000
# Presenter Screen:        http://localhost:3000/present/824915
# Participant Join Screen: http://localhost:3000/join/824915
# Admin Dashboard:         http://localhost:3000/admin
```

---

## ⌨️ Keyboard Shortcuts for Presenter View

| Key | Action |
| --- | --- |
| `Right Arrow` or `Space` | Next Slide |
| `Left Arrow` | Previous Slide |
| `F` | Toggle Fullscreen |
| `Q` | Open / Close QR Code Modal |
| `L` | Lock / Unlock Voting |
| `R` | Show / Hide Results |
| `C` | Trigger Confetti |

---

## 🔒 Security & Privacy
- Zero password requirement for audience members to ensure maximum participation rate.
- Anonymous public RLS policies enabled in PostgreSQL for instant, frictionless responses.
- Complete data export available exclusively to the presenter.
