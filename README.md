# Northstar Mail

## Environment variables
- `JWT_SECRET` (required): strong secret used to sign sessions.
- `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` (or Vercel KV-compatible `KV_REST_API_URL` and `KV_REST_API_TOKEN`): optional Redis cache and rate limiting credentials.
- `NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL`: preview redirect configuration when present.

## Demo accounts
Use the seeded local JSON accounts provided by the project environment. Do not use these credentials in production; replace them with managed users before deployment.

## JSON persistence schema
- `users.json`: user identity, profile, password hash, status, and timestamps.
- `roles.json`: role identifiers and names.
- `user-roles.json`: user-to-role assignments.
- `mails.json`: canonical message content, recipients, sender, thread, and timestamps.
- `user-mails.json`: per-user folder, read/starred flags, categories, snooze, and deletion state.
- `mail-categories.json`: category identifiers and display names.
- `user-dashboard-settings.json`: per-user dashboard preferences and enabled widgets.
- `dashboard-settings.json`: admin-managed global defaults.
- `versions.json`: per-user cache invalidation versions.

## Persistence note
The JSON files are read/written through `lib/db` only. On Vercel's deployed serverless runtime the project files are read-only, so writes will not persist. Keep all storage behind `lib/db` so it can be swapped for a database.
