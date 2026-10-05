# Conventions

## JavaScript

- Plain ES2020 in the browser. No modules, no TypeScript, no build step.
- Globals are deliberate and few: `S` (data), `QS` (view state), `A` (click handlers),
  `IN` (input/change handlers), `UI` (transient flags).
- Page functions are named `pageX()` and return `{ html, title, after?, keepScroll? }`.
- Handlers are named after what they do and grouped with their screen:
  `A.invPay`, `A.dcNew`, `IN.bItem`. New screens follow the same pattern.
- Build HTML with template strings and **always** escape user text with `esc()`.
- Money helpers: `money()` (short, grouped), `money2()` (two decimals), `num2()` (plain
  Indian-format number used by the Tally template), `numberToWordsIN()`, `amtWords()`.
- After mutating `S`, call `rerender()`. Do not patch the DOM by hand except in hot paths
  (the quotation builder updates totals in place through `data-t` hooks).

## CSS

- One stylesheet, custom properties for the palette, flat class names.
- Theme tokens live on `:root` and `[data-theme="dark"]`. Never hard-code a colour that should
  follow the theme; documents are the exception because they print on white.
- Breakpoints: 1280, 1140, 980, 760, 640.
- Anything that must survive PDF export needs a rule under `.pdf-export`, because the export
  library clones the node out of its container.

## SQL

- snake_case everywhere, singular column names, plural table names.
- Money is `numeric(14,2)`; percentages are `numeric(5,2)`.
- Every business table starts with `id uuid primary key default gen_random_uuid()` and
  `company_id uuid not null references companies (id) on delete cascade`.
- Timestamps are `timestamptz`, dates are `date`.
- Helper functions are `security definer` with `set search_path = public`.
- Migrations are additive and numbered: `0004_…`, `0005_…`. Do not edit an applied migration.
- Make migrations re-runnable where it is cheap (`drop policy if exists`, `on conflict do nothing`).

## Git

- One concern per commit, imperative subject line, no trailing period:
  `Add delivery challan PDF export`.
- Mention the migration number in the subject when a change needs one.

## Testing by hand

There is no test suite. Before shipping a change, walk the demo journey: create a quotation,
add items, send it, open the client view, accept, convert to invoice, record a payment, open
the receipt. Check one screen at a phone width and in dark mode.
