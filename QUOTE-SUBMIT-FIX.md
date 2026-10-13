# Quotation submission fix

The observed error was PostgreSQL 42501: new row violates row-level security policy for quote_requests. The old browser operation requested an inserted ID through a SELECT. Both insertion and returning rows can be blocked by policies.

1. Run quote-submit-fix.sql in the SAME Supabase project used by the website.
2. Replace assets/js/site.js in GitHub.
3. Hard-refresh the website and submit one new test quotation. Check Admin to verify it was saved, then check email and WhatsApp.

The new submit_quote_request RPC validates the eight form fields, inserts a pending quote and returns only the new request ID. It uses a fixed search path, accepts no dynamic SQL and does not expose other customer requests. RLS stays enabled and existing policies are unchanged. No service role key belongs in the website. Public callers cannot choose request IDs, notification status or arbitrary database fields.

Notifications happen only after a confirmed saved quote. Notification failures are logged separately and do not tell the customer to resubmit a saved request. The script blocks repeated clicks while submitting. The SQL and actual live submission must still be checked after deployment.
