# Admin unread counters

1. Run admin-unread-setup.sql in Supabase SQL Editor. product-reviews-setup.sql from the previous update must already be installed.
2. Replace the included HTML, CSS and JS in their matching locations.

Quote Requests shows unread, uncontacted requests. Product Reviews shows unread, unpublished feedback. Opening a tab marks only the visible list page as read; additional pages are marked as read when opened. The count decreases immediately after the read marker is saved. Marking a review read does not approve it. Pending reviews remain in the moderation list.

Read state is saved in the database and shared between administrator sessions. New submissions have no read timestamp; admin-created/edited reviews are marked read by the admin. Existing records start unread after the migration until viewed. Records are not deleted.

Counts use exact queries, refresh every 30 seconds while the page is visible, and refresh after actions or when returning to the page. If the relevant list is open, new items load and visible items are marked read. Zero counts are hidden; 100 or more shows 99+ with the full number in a tooltip. SQL preserves RLS; customer review inserts must be unpublished and unread.

Live SQL permissions and browser layout should be checked after deployment.
