# Product-specific reviews

Run product-reviews-setup.sql in Supabase before uploading the website files. Replace admin.html, index.html, product.html, assets/js/site.js and assets/css/style.css; add assets/js/product-reviews.js and assets/js/admin-reviews.js.

Customer: open product details, choose Write a review, enter name, 1-5 star rating and feedback. All guest submissions stay unpublished. No customer login is required.
Admin: sign in, open Product Reviews, review the Pending list and Approve, Edit or Delete. Create product-specific reviews through the form. Admin-entered customer feedback is labelled accordingly. OceanCore notes are separately labelled and excluded from the average rating. Publish is unchecked by default. Unpublish hides feedback; Delete removes it. Only approved customer feedback contributes to the average on product details.

The previous homepage review section is removed. Old customer_reviews data is preserved in its original table and is not automatically reassigned to products. No product, price or quotation data is deleted. New product reviews are held in a separate product_reviews table. Anonymous submissions cannot set is_published through their allowed column grants; RLS also rejects publishing and source impersonation by non-admins.

A hidden honeypot and button locking deter simple accidental/bot submissions; these are not server-side rate limiting. All displayed feedback is HTML-escaped. No claim of verified purchase is displayed. Test approval and visibility after live deployment; no SQL or deployment is performed by this package.
