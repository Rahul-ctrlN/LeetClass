# LeetClass
Website Link : https://leetclass.onrender.com/

LeetClass is a classroom-style LeetCode analytics application with private, user-scoped classrooms, a detailed student view, refreshable profile data, and a separate leaderboard.

## Features

- Google OAuth sign-in and server-side, HTTP-only sessions
- Private student data scoped to the signed-in Google user
- Add students via a validated LeetCode profile URL
- Server-side LeetCode profile retrieval, refresh, and deterministic classroom rankings
- Professional light/dark themes stored in localStorage
- Responsive classroom, student detail, and leaderboard views
- Unavailable values are displayed as `—`; no acceptance rate, active-day, or badge data is fabricated

## Stack

Node.js built-in HTTP server, file-backed local JSON persistence, vanilla HTML/CSS/JavaScript, and Google OAuth 2.0. No frontend secrets are used.

## Setup

1. Install Node.js 18 or later.
2. Copy `.env.example` to `.env` and fill the Google OAuth values.
3. In Google Cloud Console, register `GOOGLE_CALLBACK_URL` as an authorized redirect URI.
4. Run `npm start`, then open `http://localhost:3000`.

## Environment variables

`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `GOOGLE_CALLBACK_URL` are required for sign-in. Set `SESSION_COOKIE_SECURE=true` when using HTTPS in production.

## Data and limitations

LeetCode data is retrieved server-side. LeetCode’s public profile response does not reliably provide a profile-wide acceptance rate, active days, or badges for every account, so those fields remain unavailable rather than being derived or invented. The local JSON store is appropriate for development; replace it with a managed database for multi-instance production deployments.
