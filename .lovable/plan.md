# Admin-only dashboard navigation

## Changes
- Detect the signed-in account's admin role before showing dashboard navigation.
- For admins, hide chatbot, billing, and new-chatbot menus; keep only **Admin · Credits** and **Sign out**.
- Send admins who open `/dashboard` directly to `/dashboard/admin`.
- Keep the existing full dashboard unchanged for regular users.

## Verification
- Confirm admin navigation contains only the admin page and sign-out.
- Confirm regular-user navigation remains unchanged and the app builds successfully.
