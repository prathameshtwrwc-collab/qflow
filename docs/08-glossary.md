# Glossary

Indian B2B trade and GST terms used across the product and the schema.

| Term | Meaning |
|------|---------|
| **Quotation** | A priced offer. Valid until a date; not a legal demand for money |
| **Customer PO** | The purchase order the customer issues against your quotation. Their reference number, never a replacement for yours |
| **Sales order (SO)** | Your internal confirmation that the order is accepted and in progress |
| **Delivery challan (DC)** | Accompanies goods in transit. Lists items and quantities but no prices; it is not a tax invoice |
| **Tax invoice** | The GST document that demands payment. Must carry GSTIN, HSN/SAC, tax split and the invoice number |
| **Proforma invoice** | A quotation dressed as an invoice, often used to collect advance. Not yet implemented |
| **Credit note (CN)** | Reduces what the customer owes: returns, overbilling, agreed discounts |
| **Debit note (DN)** | Increases what the customer owes: extra work, freight recovery |
| **Payment receipt (RCPT)** | Acknowledges money received against an invoice |
| **GSTIN** | 15-character GST registration number. The first two digits are the state code (27 = Maharashtra) |
| **HSN / SAC** | Harmonised System Nomenclature (goods) / Services Accounting Code. Printed per line on a tax invoice |
| **CGST + SGST** | Central and State GST, charged when supplier and customer are in the same state. Each is half the rate |
| **IGST** | Integrated GST, charged at the full rate for inter-state supply |
| **Cess** | An extra levy on certain goods, on top of GST |
| **Taxable value** | The amount tax is calculated on: net of discounts, including freight and other charges |
| **Round off** | Adjustment to bring the grand total to the nearest rupee; printed as its own line |
| **TDS** | Tax Deducted at Source. The customer withholds a percentage and pays it to the government; the invoice amount does not change, so the invoice shows "net receivable" |
| **E-invoice / IRN / Ack No.** | For businesses above the turnover threshold, invoices are registered on the government portal, which returns an Invoice Reference Number, acknowledgement number and a signed QR. The Tally template shows these fields; they are demo values until you integrate an IRP |
| **E-way bill** | Required for moving goods above a value threshold. Not implemented |
| **Net 30** | Payment due 30 days after the invoice date |
| **Advance** | Money collected before delivery, usually a percentage of the quotation |
| **Outstanding** | Invoiced minus received, including credit and debit notes |
| **Credit limit** | The maximum outstanding you allow a customer |
| **Lakh / crore** | 1 lakh = 100,000; 1 crore = 10,000,000. Indian digit grouping: ₹13,38,631.00 |
