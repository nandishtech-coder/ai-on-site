# Helix — AI Chatbot Platform

Build the full Helix product: public marketing site, sign-in, guided setup, a bot dashboard, a working answer engine trained on the customer's own website, and a one-line snippet they paste into their site.

## What gets built

### 1. Landing page (`/`)
- Top bar: "Helix AI" logo, Solutions dropdown (Education, Real Estate, E-Commerce, Healthcare, IT Support), Features, Pricing, Blog, plus "Log In" and "Sign Up for Free".
- Hero with the given headline/subheadline and a website-URL box with "Create Free Chatbot" that carries the typed domain into sign-up.
- Four feature cards: Launches in Minutes, Instant Web Scraping, Multi-Language Support, Inbox & Logs.
- How It Works: 3 steps (enter domain → customize → paste snippet).
- Pricing: Free $0, Pro $29, Enterprise $99 with the listed limits.
- Supporting pages for Features, Pricing, Blog and each Solutions entry so no nav link dead-ends.

### 2. Accounts
- Email + password, magic link, and Google sign-in on `/auth`.
- First-time users land on `/onboarding`: enter domain → "Build Helix Bot" → animated 4-stage progress (crawl, extract, embed, done) → redirect to their new bot's dashboard.

### 3. Dashboard (collapsible sidebar)
- Bot switcher, Overview, Customize Bot, Conversation Logs, Lead Capture, Embed Code, Billing & Account.
- Overview: conversations / answered questions / leads captured, domain, last crawl time, "Re-sync Website".
- Customize: controls on the left, live chat preview on the right. Appearance (name, colour, greeting, avatar, "Powered by Helix" toggle), Training Data (crawled page list, delete pages, add custom Q&A), Lead Capture (contact-form toggle).
- Embed page: copyable one-line script tag plus setup steps for WordPress, Wix, Squarespace, Shopify, Webflow.

### 4. Answer engine
- Crawler reads `sitemap.xml` or follows internal links (up to the plan's page limit), strips scripts/styles/nav/footer, splits text into ~400-word chunks with 40-word overlap, and stores embeddings.
- Chat endpoint embeds the visitor question, finds the closest chunks for that bot, and streams an answer grounded only in that content; offers to take contact details when it can't answer.
- `public/widget.js`: standalone floating button + chat window (isolated so it can't clash with the host site's styles), talking to the chat endpoint.

### 5. Data
Enable Lovable Cloud, then create `bots`, `site_chunks` (vector), and `conversations` per the provided schema, with vector search enabled, owner-only access rules, and public read access limited to what the widget needs.

## Technical notes
- TanStack Start: routes under `src/routes`, server functions for dashboard reads/writes, public HTTP routes under `src/routes/api/public/*` for `/chat` and the widget (third-party origins, so CORS + rate-conscious handling there).
- Embeddings and chat run through the Lovable AI gateway (default models per platform policy) with server-side keys — no OpenAI key needed from you.
- `site_chunks` gets an ivfflat/HNSW index and a `match_site_chunks` SQL function for similarity search.
- Crawling runs in the background per bot with status written back to the bot row so the progress screen reflects real work.
- Widget script is served from the app's own domain (`/widget.js`), since `cdn.helix.ai` isn't a domain you control; the embed page shows that real URL.
- Distinct page metadata on every public route.

## Scope notes
- Billing page shows plan, usage and limits; real card payments (Stripe) are not wired up unless you want them.
- Plan limits are enforced in the crawler and chat endpoint.
