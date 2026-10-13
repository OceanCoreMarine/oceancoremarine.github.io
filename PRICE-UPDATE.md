# Product pricing

1. Run product-price-setup.sql in the same Supabase project SQL Editor.
2. Replace the included website files in their matching paths.
3. Refresh the website and Admin. Add/edit a product and enter the AED unit price before VAT.

Blank means Request price; zero is shown as AED 0.00. Existing products have no price until edited. Prices appear on cards, details, search suggestions, brand spotlight and the quotation request form. Selecting a product in a new quotation/invoice copies its current price, which can still be edited. Existing saved quotation/invoice prices remain unchanged when opened. Invoice conversion retains the saved quotation prices.

The SQL adds only a nullable price column and a nonnegative constraint. No existing product, notification setting, image or category is deleted. The admin/public application still uses its existing access policies. These files do not automatically deploy or run SQL. Catalogue import remains a separate deferred task.
