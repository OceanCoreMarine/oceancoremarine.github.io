# OceanCore — Invoice and Delivery Note update

## Install
1. In Supabase → SQL Editor, run `billing-documents-setup.sql` once. It requires your existing customers, quotations, quotation_items, invoices, invoice_items, products and admin_users tables. Take a database backup first. The migration does not delete existing billing rows.
2. Upload/replace the website files in your GitHub repository. For the small update ZIP, preserve the folders: `admin.html`, `assets/js/admin.js`, `assets/js/admin-billing.js`, `assets/js/billing-core.js`. Keep your current Supabase client configuration.
3. Reload admin.html (Ctrl+Shift+R), sign in, and open Billing → Company Details. Confirm your company address/contact details, actual TRN if registered, default VAT, and bank details. Bank fields start blank; the sample delivery note TRN is not copied.
4. Customers → add/update customer address and TRN as needed.

## Use
- Invoices → Create Invoice: select customer, choose products or enter manual items, quantities/units/prices/discounts, date, due date, paid amount and status. Save first, then Print / PDF → Save as PDF in the browser.
- Quotation → Convert to Invoice: creates a draft invoice. Repeating conversion opens the existing invoice rather than creating another one.
- Invoice → Delivery note: pre-fills remaining quantities. Adjust the quantities to the actual shipment and save. Draft, Dispatched and Delivered notes reserve quantity; Cancelled notes release it.
- Delivery Notes → Create Delivery Note: create independently without an invoice. Internal prices can be entered for later conversion but never appear on the delivery note PDF.
- Delivery Note → Convert to invoice: creates a draft invoice, links the delivery items and preserves the customer/company snapshot. If already linked, opens the existing invoice.
- Edit: saved documents preserve their original customer/company details and prices. Dates/status/notes/items can be edited subject to linked delivery quantities.
- Delete: asks for confirmation. An invoice with recorded payments or linked delivery notes cannot be deleted. Dispatched/Delivered notes must be cancelled before deletion. Change records remain in billing_audit.
- History: displays recorded creation/edit/conversion times. No detailed history exists for actions taken before this update.

## Printed documents
Invoice: logo, company/customer details, numbers/dates, item prices, discount, VAT, total, paid amount/balance and configured bank details. Shows TAX INVOICE only when supplier TRN is provided and VAT is positive; otherwise INVOICE. Confirm your VAT treatment and invoice requirements with your accountant before issuing tax invoices.
Delivery note: logo, company/customer details, delivery/invoice number, address, part number/description, quantities/units, remarks and received/delivered signature areas. No product prices.
Quotation PDF delivery time remains blank as previously requested.

## Validation and live checklist
Offline checks passed for decimal rounding, VAT, discounts, partial payments, remaining delivery quantities, print content and escaping, plus existing price/review/unread/quotation submission regression tests.
This package has not been executed against your live database or visually tested in a browser. After installation, create one test invoice with two products; deliver part of one item; check the remaining quantity; print both documents; edit and save; try the conversion twice; verify history and deletion restrictions. Also print a long document to check page breaks and repeated table headings on your browser.
Totals and quantity restrictions are recomputed in transactional database functions. Revision checks protect against overwriting another session's changes; creation tokens prevent duplicate retries. This is not inventory accounting, a payment ledger, or UAE e-invoicing integration. Paid amount is a manually maintained invoice total.
