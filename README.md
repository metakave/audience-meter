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

### 2. Frictionless Participant Onboarding
- **Direct Link / QR Code**: Participants join via URL (e.g. `/join/824915`) or by scanning a QR code on the presentation screen.
- **Effortless Registration**: First Name, Last Name, WhatsApp Mobile Number, and Email.
- **Local Storage Caching**: Participant details are remembered on the device so reloading or switching apps never asks for their data again.
- **Low-Bandwidth Mobile First**: Lightweight HTML/CSS/SVG charts load in under 1 second even on 2G/3G mobile networks.

### 3. Public Presentation View (`/present/[code]`)
- Projector/Large display view with big, high-contrast typography.
- Real-time animated SVG bar charts, word clouds, and response counters.
- QR code toggle modal with one-click URL copy.
- Floating host toolbar:
  - Previous / Next slide controls
  - Lock / Unlock submissions in real time
  - Show / Hide results toggle
  - Fullscreen toggle (Key `F`)
  - Confetti burst for celebrations (Key `C`)
  - Direct CSV Export of attendee responses

### 4. Admin Dashboard & Slide Builder (`/admin`)
- Create new presentations with auto-generated 6-digit room PINs.
- Add, edit, reorder, or delete slides.
- Configure options, toggle results visibility, and manage slide locks.
- One-click CSV export containing:
  - Participant First & Last Name
  - WhatsApp Mobile Number
  - Email Address
  - Question Title & Type
  - Answer / Selection
  - Submission Timestamp

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
