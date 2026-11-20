# Remove the Vercel Service-Key Requirement

## Goal
Keep Helix working without a Supabase service-role key in Vercel, while preserving user isolation and admin-only controls.

## Work
1. Add narrowly scoped database functions for public chatbot reads, retrieval, lead/conversation writes, and message counting. Public functions will only expose data for active bots and enforce bot-specific limits/settings.
2. Add authenticated admin database functions for cross-account reports, user credits, subscription review/cancellation, and payment settings. Each function will verify the caller's admin role in the database before reading or changing other users' data.
3. Replace runtime service-role client calls with the authenticated or publishable-key paths, then remove the app's runtime service-role-key dependency.
4. Verify the admin pages and public chatbot path in preview, and check build/runtime logs.

## Technical details
- Use Lovable Database migrations for function definitions and explicit execute grants; revoke public/anonymous access to admin functions.
- Keep the existing login/session flow and user-facing pages. Vercel will still need the Supabase project URL and publishable key; only the privileged service-role key becomes unnecessary.
- I can verify this project's preview, but cannot inspect or change settings in your separate Vercel account from the app code.
