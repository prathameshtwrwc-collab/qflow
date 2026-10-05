# Changelog

Dates are when the work was done. The prototype is not versioned or released yet.

## Unreleased

- **Documentation and backend design.** Added `docs/`, `AGENTS.md` and the Supabase
  migrations rebuilt around a super-admin provisioning model: platform admins create
  companies and hand over credentials, companies cannot self sign-up, and platform admins
  only read a company's data inside a support window the company opens.
- **GST Tax Invoice template** (`tally`): boxed layout with IRN/Ack header, consignee and
  buyer blocks, HSN summary, declaration, bank block and authorised signatory. Works for
  quotations and invoices.
- **Real PDF download** for quotations, invoices, receipts, challans and credit/debit notes,
  with a print-dialog fallback. **WhatsApp sharing** now opens WhatsApp with the template
  message prefilled, from the share sheet, invoice page, receipts, challans and reminders.
- **Purchase order, delivery challan, credit and debit notes, structured payment terms,
  payment methods with UTR and cheque details, receipts, bank details on invoices, HSN/SAC,
  CGST/SGST/IGST breakdown, round-off, TDS, customer statements, credit limits, invoice
  attachments and an audit trail.**
- **Custom item columns**: rename, hide, reorder, add and delete; number columns can multiply
  into the line amount. Managed in Settings → Item columns.
- Alignment and responsiveness fixes across the landing page, tables, invoice document,
  mobile top bar and the Tally template.
- Initial build: landing page, dashboard, quotations and builder, client portal, customers,
  products, pipeline, follow-ups, templates, invoices, reports, settings.
