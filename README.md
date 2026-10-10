# Helix AI Chat

Act as a Lead Software Architect and Full-Stack SaaS Developer. Build a complete, production-ready AI Chatbot platform named "Helix" (a full functional clone of Noupe.com).

The platform allows users to visit the site, log in, submit a website URL, automatically crawl and index the site's content into a vector database, customize an AI chatbot, and get a 1-line embedded JavaScript code snippet to use on their own website.

---

### 1. PUBLIC LANDING PAGE (Exact Layout inspired by Noupe.com)

Build a landing page at route `/` with the following structure:

- Top Navigation Bar:

  - Brand Logo: "Helix AI"

  - Nav Links: Solutions (Education, Real Estate, E-Commerce, Healthcare, IT Support), Features, Pricing, Blog.

  - Action Buttons: "Log In" and "Sign Up for Free".

- Hero Section:

  - Headline: "AI Chatbot for Your Website in Minutes"

  - Subheadline: "Quick answers for your visitors with ease. Helix turns your website into a smart, 24/7 AI support agent. Just enter your URL, copy a line of code, and go live."

  - Domain Input Box: An input field reading "Enter your website URL (e.g. mycompany.com)" with a "Create Free Chatbot" button. Submitting this saves the domain into state/query params and redirects to `/signup`.

- Feature Cards:

  1. "Launches in Minutes": No coding required.

  2. "Instant Web Scraping": Learns directly from your web pages and FAQs.

  3. "Multi-Language Support": Responds automatically in 95+ languages.

  4. "Inbox & Logs": Sends visitor queries straight to your dashboard or email.

- How It Works (3 Steps):

  1. Step 1: Enter your domain.

  2. Step 2: Customize colors, bot name, and welcome greeting.

  3. Step 3: Copy and paste the 1-line script tag to WordPress, Wix, Shopify, or custom HTML.

- Pricing Section:

  - Free Tier ($0/mo): 1 Bot, 20 pages crawled, 100 messages/mo.

  - Pro Tier ($29/mo): 3 Bots, 500 pages crawled, 2,000 messages/mo, custom colors, no "Powered by Helix" badge.

  - Enterprise Tier ($99/mo): Unlimited pages, auto weekly re-crawl, priority support.

---

### 2. AUTHENTICATION & POST-LOGIN ONBOARDING

- Use Supabase Auth (Email/Password, Magic Link, Google OAuth).

- Upon logging in for the first time, route the user to `/onboarding`:

  1. Step 1: "Enter your Domain" — Input field for `https://yourwebsite.com`.

  2. Step 2: "Trigger Ingestion" — Clicking "Build Helix Bot" triggers a animated progress screen showing:

     - Stage 1: Parsing sitemap.xml & crawling internal links...

     - Stage 2: Extracting clean text content...

     - Stage 3: Generating vector embeddings...

     - Stage 4: Bot setup complete!

  3. Once complete, automatically redirect to the Bot Dashboard at `/dashboard/bot/[id]`.

---

### 3. POST-LOGIN DASHBOARD & BOT CUSTOMIZATION

Build a multi-page dashboard layout with a collapsible sidebar:

Sidebar Links:

- 🤖 My Bots (Dropdown selector)

- 📊 Overview

- 🎨 Customize Bot

- 💬 Conversation Logs / Inbox

- 🎯 Lead Capture

- 📜 Embed Code

- 💳 Billing & Account

Key Dashboard Views:

1. Overview (`/dashboard/bot/[id]`):

   - Stats Cards: Total Conversations, Answered Questions, Leads Captured.

   - Domain Info: Display domain URL, last crawled date, and a "Re-sync Website" button.

2. Customize Bot (`/dashboard/bot/[id]/customize`):

   - Split Screen: Controls on the Left, Live Interactive Chatbot Preview on the Right.

   - Appearance Tab: Bot Name, Primary Color Picker, Greeting Message, Avatar Picker, "Show 'Powered by Helix'" Toggle.

   - Training Data Tab: List of scraped page URLs (option to delete pages or manually add custom FAQ Q&A pairs).

   - Lead Capture Tab: Toggle to enable contact form (collect name, email, phone) when the bot cannot answer a question.

3. Embed Code Page (`/dashboard/bot/[id]/embed`):

   - Displays the generated code block with a 1-click "Copy Code" button:

     `<script src="https://cdn.helix.ai/widget.js" data-bot-id="YOUR_BOT_ID" defer></script>`

   - Expandable setup instructions for WordPress, Wix, Squarespace, Shopify, and Webflow.

---

### 4. BACKEND ENGINE & RAG ARCHITECTURE

- Web Scraper API Route (`/api/crawl`):

  - Fetches `sitemap.xml` or recursively crawls up to 20 internal URLs.

  - Strips HTML scripts, styles, header links, and footers.

  - Splits clean text into ~400-word chunks with 40-word overlap.

  - Generates 1536-dimensional embeddings using OpenAI `text-embedding-3-small`.

  - Saves vector embeddings to Supabase PostgreSQL (`pgvector`).

- RAG Chat Engine (`/api/chat`):

  - Accepts visitor prompt + `bot_id`.

  - Converts user prompt into a vector embedding.

  - Executes Cosine Similarity Search in PostgreSQL filtered by `bot_id` to retrieve top matching chunks.

  - Sends query + context chunks to `gpt-4o-mini` with system prompt:

    "You are an AI support assistant for {{bot_name}}. Answer strictly using the following website context: {{context}}. If unknown, politely offer to collect their contact info."

  - Streams response back in real time.

- Embedded Client Widget (`public/widget.js`):

  - Lightweight, standalone Vanilla JS script.

  - Appends a floating action button on the bottom right of any third-party page.

  - Clicking the button opens a chat window running in a shadow DOM / iframe.

  - Connects to `/api/chat` for streaming AI responses.

---

### 5. DATABASE SCHEMA (Supabase PostgreSQL with pgvector)

```sql

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE bots (

  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

  name VARCHAR(255) NOT NULL DEFAULT 'Helix Assistant',

  domain VARCHAR(255) NOT NULL,

  primary_color VARCHAR(7) DEFAULT '#6366F1',

  greeting_message TEXT DEFAULT 'Hi there! How can I help you today?',

  system_prompt TEXT,

  notification_email VARCHAR(255),

  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()

);

CREATE TABLE site_chunks (

  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  bot_id UUID REFERENCES bots(id) ON DELETE CASCADE,

  url TEXT NOT NULL,

  content TEXT NOT NULL,

  embedding VECTOR(1536),

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()

);

CREATE TABLE conversations (

  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  bot_id UUID REFERENCES bots(id) ON DELETE CASCADE,

  visitor_email VARCHAR(255),

  messages JSONB DEFAULT '[]'::jsonb,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()

);

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://ai-on-site.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/65958bf2-7a82-4a61-971c-1de13cd098bc).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
