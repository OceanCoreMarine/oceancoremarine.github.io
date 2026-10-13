# OceanCore catalogue and website import

## What is included

- OceanCore-Illustrated-Catalogue.pdf: a new OceanCore illustrated product-reference working catalogue. Product photos are extracted under the supplier permission you confirmed; the page layout is new.
- OceanCore-Product-Review-With-Images.xlsx and .csv: editable product/reference review data and source PDF page numbers.
- OceanCore-Products-With-Images.json: the same draft data for the website importer.
- Page-Coverage.json: a manifest covering all 268 source PDF pages.
- OceanCore-Website-With-Images.zip: the latest website plus a catalogue review/import page.

The final extraction contains 2,003 draft records in 19 proposed categories and 49 category/subcategory pairs. There are 1,845 coded reference candidates and 158 records without a captured reference. The latter may represent model families rather than individual products. Some source codes may be supplier references, not manufacturer part numbers. Duplicate source pages were consolidated by code. Processing every page does not prove that every individual product or variant was extracted correctly.

Product names and codes are OCR-derived and need review. Brand fields are blank unless specifically identified. Specifications remain blank until verified. 1,342 records have candidate photos or illustrations; 661 need manual image matching. There are 1,469 bundled image assets, including alternative candidates for pages without an automatic match. Only 21 record photos were manually matched; other matches remain draft candidates. A family image may represent several sizes and must not be assumed to show the exact colour or variant. Correct the manufacturer brand, name, reference, specifications and authorised image before approval.

## Upload website files

Extract OceanCore-Website-With-Images.zip. Upload the contents of OceanCore-Final into the existing repository, replacing matching files. Keep all previous files and settings. The important changed files are:

- admin.html
- assets/js/admin.js
- assets/js/site.js
- catalogue-import.html (new)
- assets/js/catalogue-import.js (new)
- catalogue/oceancore-products.json (new)
- catalogue/image-library.json (new)
- assets/catalogue-images/ (new; upload the entire folder)

No database migration or service-role key is needed. Existing admin RLS permissions must allow inserts into categories, subcategories, brands and products. Provider notification secrets stay in Supabase.

## Review and import

1. Sign in at admin.html using the existing authorised admin account.
2. Click Catalogue Import.
3. Click Load catalogue draft.
4. Search and correct records against the original PDF, using source page numbers.
5. Tick Approved only for checked records. Approve visible rows applies to the current page only.
6. Use the source-page photo selector to replace a candidate image when it does not match the reference. A photo preview is shown beside the field. Download edited JSON frequently. Browser edits are not permanently saved until downloaded.
7. Click Preview import plan. It lists insert counts, skipped rows and intended visibility.
8. Start with a few reviewed products. Leave Publish imported products immediately unchecked to create inactive drafts.
9. Click Import approved records.
10. Download the import report. Correct failed rows and retry; successful existing references are skipped.
11. Check imported products in Admin, add authorised images and confirm details. Set Active when ready to show them publicly.
12. After review, Print approved catalogue opens a clean OceanCore table catalogue for Print / Save as PDF.

To review in Excel, edit the Product Review sheet and save that sheet as CSV UTF-8. Upload it through Open reviewed JSON / CSV. Both the delivered CSV field names and workbook column headers are supported. Preserve reference codes as text, including leading zeros. The separate Publish checkbox controls all accepted rows for each import run; workbook Publish cells do not independently publish items.

## Import behaviour

- Only approved records with product name, category and part reference are eligible.
- Existing part references are matched case-insensitively and skipped. Existing products are never overwritten or deleted.
- Category names are matched case-insensitively. Subcategories are matched within their parent category. Brand names are matched case-insensitively.
- New rows default to inactive, featured=false and top_selling=false.
- Image URL, if supplied, must use HTTPS or the supplied assets/catalogue-images/*.webp paths. Relative paths are stored as-is and work when the matching image folder is uploaded to the website repository. Images are not uploaded separately to Supabase Storage.
- Import runs one product at a time and reports each failure. Stop finishes the current row. It is not an atomic transaction: successful rows remain saved if later rows fail; a partially created category may also remain.
- Run one import at a time to avoid duplicate inserts in separate browser tabs. A database uniqueness constraint is not assumed.
- Catalogue fetches and admin quotation dropdowns now page through records, so imports above Supabase's normal first-result limit can be loaded.

## Verification completed

- JavaScript syntax checks passed for website, admin and importer scripts.
- Mocked importer tests passed for administrator checks, more than 1,000 existing products, duplicates, missing references, unapproved records, case-insensitive category matching, new subcategories and brands, inactive defaults and repeat imports.
- PDF text bounds and rendered pages were inspected.
- Spreadsheet sample values and both sheet layouts were inspected.

No data has been imported into the live Supabase project. Live permissions, browser interaction, mobile layout and actual import remain to be checked after deployment. The source catalogue has not been overwritten.

## Photo matching limits

The source PDF stores a full page as one image, so product pictures were cropped rather than extracted as independent original photos. Automatic crops can include diagrams, shared family pictures or neighbouring objects. The photo selector and original source page references are provided for correction before publication. Unknown matches remain explicitly blank instead of being filled with an unrelated photo.
