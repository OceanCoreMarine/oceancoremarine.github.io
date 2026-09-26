# OceanCore Enhanced package

This is an enhanced working copy of the supplied static website.

## Included
- Rewritten home page value proposition and service sections.
- Catalogue search extended to model/OEM fields, editable in admin; all product records load in 1,000-row batches, with 12-item pagination.
- Hero slideshow images converted from PNG to WebP (about 2.4 MB total down to about 0.24 MB).
- Quote form supports JPG, PNG, WebP and PDF attachments up to 8 MB, with inline accessible confirmation/error messages.
- Admin quote pipeline supports New, Contacted, Quoted, Won and Lost statuses, status filtering, follow-up dates, and temporary signed attachment links.
- Keyboard focus styling, skip link, live result/quote messages, reduced-motion support, and mobile filter/form refinements.

## Required Supabase setup
Before deploying, run `quote-workflow-setup.sql` in the Supabase SQL Editor. It adds quote attachment/follow-up columns and creates a private attachment bucket with upload limits and admin-only read/delete policies. Keep the existing quote_requests RLS policies in place and confirm authenticated admins can update quote_requests. The public publishable key belongs in client code; never add a service-role key.

This package does not change your live website or Supabase project. After applying the SQL, upload this folder's contents to the hosting repository to publish the changes.
