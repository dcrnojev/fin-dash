# fin-dash

A family finance dashboard: a static React app that signs in with Google and reads and writes the family's Google
Spreadsheet straight from the browser. There is no backend, and no financial data lives in this repo; it stays in Google.

Today the app creates that spreadsheet from the legacy import, reads it back through the validator, and shows the
month-end history (cash, investments, both together, and pension on its own) with a Data health page listing what the
validator found. It closes a month by appending that month's month-end balance rows, edits the values of a month already
closed, and adds and edits groups and balances.

## Screens and navigation

- Once signed in, every page sits in one shell (`src/components/shell/`): a menu on the left, which becomes a drawer
  opened from the top bar below 820px wide, and a top bar with the page name and the Hide amounts switch. Menu entries
  for planned features show as "Soon" and open nothing.
- The page lives in the URL hash (`#/`, `#/close`, `#/months`, `#/months/2026-10`, `#/portfolio`, `#/health`, `#/setup`),
  read by `useRoute` in `src/routing/`, so GitHub Pages serves every page from `index.html` and the back button works.
  An unknown hash opens Home. Until a spreadsheet is chosen, only Setup and spreadsheet opens.
- Home: the headline tiles, one chart card (cash, investments, both, or pension; 12 months, 24 months or all; as a chart
  or as a table) and the latest month by group. Months lists every month with its status and totals and opens a closed or
  legacy month's edit page. "Close <month>" in the menu shows "Due" once that month has ended.
- Hide amounts masks every euro figure on screen but keeps percentages and colours; Data health then shows each issue's
  code instead of its message, since a message can quote an amount.

## How it reaches Google

- All Google access sits in `src/data/`. UI code imports only from `src/data/index.ts`, which exposes a storage-neutral
  `DataStore`; the Google implementation is in `src/data/google/`.
- Sign-in uses the Google Identity Services token model with the `drive.file` scope. The app can open only the
  spreadsheets it created for that user or that the user chose in the Google Picker. The other partner needs the
  spreadsheet shared in Drive and then chooses it once with "Choose spreadsheet".
- Access tokens last about an hour. The token is kept in `sessionStorage`, so reloading the same tab within that hour
  needs no click. A new tab, or a reload after the token expired, asks Google for a new one without showing a consent
  screen, but browsers usually block that window until the user clicks, so the page then offers "Continue as ...".
- Every load reads all the app's tabs in one request, unformatted, so a Croatian-locale sheet still returns numbers and
  dates come back as serial numbers. The spreadsheet's id is remembered per device in `localStorage`.
- The app never deletes a row. It appends rows, editing a month overwrites only the `value`, `as_of` and `source`
  cells of the rows it changes, and editing a group or balance overwrites only the cells of its row that change. Before writing it reads the tab again and works from that tab's header row, so a tab
  whose columns were reordered or extended by hand gets each value under its own header. A value for a column the tab
  lacks stops the write with a message naming the column to add.

## Local setup

1. Node 20.19 or later (Vite's minimum).
2. In one Google Cloud project:
   - Enable the Google Sheets API, Google Picker API and Google Drive API.
   - Google Auth Platform: an External app with only non-sensitive scopes (`drive.file` plus `openid`, `email`,
     `profile`), published "In production". In "Testing" every authorisation expires after seven days.
   - An OAuth client of type Web application, with `http://localhost:5173` as an authorised JavaScript origin (plus the
     GitHub Pages origin once the app is hosted). No redirect URIs are needed.
   - An API key restricted to the Google Picker API and to the same websites.
3. Copy `.env.example` to `.env.local` and fill in:
   - `VITE_GOOGLE_CLIENT_ID`: the OAuth web client ID, ending in `.apps.googleusercontent.com`.
   - `VITE_GOOGLE_API_KEY`: the browser API key the Google Picker needs.
   - `VITE_GOOGLE_PROJECT_NUMBER`: the Cloud project number (digits only), used as the Picker app ID.

   These values end up in the built JavaScript and are not secrets; what protects the app is the list of authorised
   origins on the OAuth client and the website restriction on the API key. `.env.local` is gitignored all the same.
4. `npm install`, then `npm run dev` and open `http://localhost:5173`.

`npm run build` type-checks and writes the static site to `dist/`.

## Creating the spreadsheet

With no spreadsheet remembered on the device, the app offers to choose an existing one or to create one from the import:

1. Run `npm run import` (below), sign in, and choose `data/import/bundle.json` under "Create spreadsheet from import".
2. The file is checked in the browser exactly as the spreadsheet will later be read: converted to tab rows and read back
   with the validator. A bundle with errors cannot be loaded.
3. On confirm the app creates a spreadsheet named `fin-dash` in the user's Drive, writes the data tabs, then `_meta`, then
   formats the tabs (frozen bold header, month columns as plain text, money as `#,##0.00`, dates as `yyyy-mm-dd`).
   `_meta` goes last on purpose: a spreadsheet without `schema_version` is one whose setup was interrupted, and the app
   says so instead of showing it. A failed formatting step leaves a complete spreadsheet and is only reported.
4. If a write fails, the app does not clean up; the half-built spreadsheet can be deleted in Drive.

A `schema_version` higher than `appSchemaVersion` in `src/domain/schema/meta.ts` means a newer app wrote the
spreadsheet; this app then shows it read-only and asks for an update.

## Updating an older spreadsheet

A lower `schema_version` means an older app wrote the spreadsheet. The app then reads none of its data and writes nothing
but the update: every page but Setup and spreadsheet shows "Update the spreadsheet", which lists each tab and header cell
that changes, with the rows it found, and a button. Version 2 renamed the tabs `pots`, `holdings` and `snapshots` to
`groups`, `balances` and `month_end_balances`, and the columns `pot_id` and `holding_id` to `group_id` and `balance_id`.

1. It re-reads the tabs and plans again, and stops with nothing changed when a tab or column exists under both its old
   and its new name, or `_meta` does not hold exactly one `schema_version` of 1.
2. It copies the whole spreadsheet in Drive as `<title> backup before update to version 2 <date>` (Drive `files.copy`,
   which `drive.file` allows for a file the app can open), and stops with nothing changed if that fails.
3. It renames the tabs and overwrites the header cells, found by name in each header row, in one Sheets `batchUpdate`,
   which applies whole or not at all. No row moves.
4. It writes `schema_version` 2 in `_meta` last. A spreadsheet that still says 1 can be updated again: tabs and header
   cells that already have their new names are left alone, so the update carries on where it stopped.

## Where the logic lives

- `src/domain/`: tab specs, row decoding and validation, shared with the import script.
- `src/close/`: closing and editing a month; everything but `writeClose.ts` and `writeEdit.ts` is pure. `src/portfolio/`: ids and rows for new groups and
  balances, and edits to existing ones.
- `src/calc/`: pure functions from a validated ledger to chart series and headline figures. A month without a month-end balance row
  for a group is never zero. Between two measured months of the same group it is estimated on a straight line, gap months
  included; before a group's first or after its last measured month it stays unknown, and a total that needs it shows only
  the known part as a lower bound. Charts, tiles, tooltips and tables mark estimated values with `≈` (dotted lines with
  hollow diamonds, hatched columns) and lower bounds with `≥` (dashed or faded).
- Estimates exist only on screen: nothing is written to the spreadsheet, gap months keep the status `gap`, and later
  calculations over a gap (spending, for one) must not read an estimated value as a measured one.
- `src/schemaUpdate/`: what an older spreadsheet needs to reach the current schema; everything but `updateSchema.ts` is
  pure.
- `src/data/`: storage, behind the `DataStore` interface.
- `src/routing/`: the hash routes and the hook that follows them.
- `src/components/`: React only; charts use Recharts, whose types stay inside `src/components/charts/`.

## Portfolio

- A group is a grouping of money: a bank account, a broker platform, cash at home, a pension fund. A balance is a named
  line inside a group with its current amount. A group has either one amount of its own or several named balances. A
  month-end balance is the amount of a group, or of one of its balances, as recorded at the end of a month.
- A group's `owner` is a person id or `household`: cash and pension groups usually belong to one person, investment
  platforms to the household. A balance carries its own `owner` column (a person id, or blank or `household` for the
  household); spreadsheets made before that column existed read as all-household, and need the column added by hand
  before a balance can be added with, or edited to, a person as owner.
- "Portfolio" lists every group with its balances and adds either. The id is a slug of the label, numbered when the
  tab already uses it (checked against a fresh read of the tab, invalid rows included). A new group sorts last and has no
  opened month, so earlier months can still be typed in by hand. A balance needs the month it opened, which must be the
  next month to close or later: a balance open in a month already closed would leave that month's group total unknown.
- Only investment groups are entered per balance, so only they take balances here.
- "Edit" on a group changes its `label`, `owner`, `provider`, `liquidity`, `closed_month` and `note`; on a balance its
  `label`, `owner`, `code`, `closed_month` and `note`. Ids, opened months, a group's `kind` and a balance's `group_id` stay
  fixed, because month-end balance rows refer to them or are read by them; another kind or group means adding a new one.
- A closed month may be cleared, but when set it must be on or after the opened month and the latest month with a
  month-end balance or contribution row for that group or balance, since the validator leaves out a group's rows after it closed.
  Labels stay unique among groups, and among the balances of one group.
- A review lists each changed field as the sheet has it and as it will be. Saving re-reads the tab, finds the row by
  `id`, and stops before writing when the id has no row or more than one, or when an editable field of that row changed
  since the form opened. It then overwrites only the changed cells in one request and reloads.

## Closing a month

- The month to close is the one after the latest `legacy`, `gap` or `closed` row in `months`. With no such row it is
  the earliest month that has month-end balance rows but no `months` row, else the month after the latest month-end balance month. A
  month without a `months` row is open.
- The form asks for every cash, investment and pension group open that month, all required: one value per cash group, one
  per open balance of an investment group (one for the group when it has none open), and for a pension group the value plus
  the date of its statement, which must fall in the month. Fields start empty; last month's row at the same level shows
  as a hint with a "Same as last month" button that fills the amount. A group that changes between one group row and
  balance rows shows last month's total only as a hint. Amounts may be typed as `1.234,56` or `1234.56`.
- Rows the sheet already has for the month (a close that failed midway, or typed by hand) show read-only, at the level
  they are stored at even when the group's balances say otherwise, and closing keeps them as they are.
- A review step shows the totals per kind and every value against last month before anything is written. A month can
  be closed on any day; before its last day the review asks to confirm closing early.
- Writing re-reads `months` and `month_end_balances` right before each append and stops, writing nothing more, when the month got
  a `months` row or its month-end balance rows changed since the form opened: two people must not close or edit a month at once.
  It appends the month-end balance rows (`source` `app`; cash and investments `as_of` the day of the write), then the `months`
  row (`closed`, `closed_on` that day, `closed_by` the signed-in email), then reloads.
- The `months` row goes last, so a close that fails midway leaves the month open; reading the sheet again and closing
  again finishes it. A month that is already closed, or that has an `open` row typed by hand, is refused without
  writing anything.
- Pension: at a month's close the owner enters the statement that arrived during that month, with the statement's own
  date as `as_of`, so a pension value is not a month-end value. Pension has its own chart and stays out of the
  investment and combined totals.

## Editing a month

- A `closed` or `legacy` month on the Months page opens the same form, filled with what the sheet has.
  Each group keeps the level it is stored at. A field the month has no row for may stay blank; a row cannot be blanked.
- The review lists only the changed and added values, as the sheet has them and as they will be.
- Saving re-reads `month_end_balances` and finds each changed row by its key (`month`, `group_id`, `balance_id`). A key that is
  missing or appears more than once, or any change to the month's rows since the form opened, stops it before anything
  is written. It then overwrites that row's `value`, `as_of` (the day of the write, or the statement date for a
  pension) and `source` (`app`) cells in one request, re-reads, and appends rows for added values. The `months` row is
  never changed.

## Importing the legacy history

`scripts/import/` is a local Node script, not part of the app. It reads the legacy month-end workbook and writes the
reference and month-end balance tabs as a bundle the app loads into a new spreadsheet, with a reconciliation report.

- Run `npm run import`. Node runs the TypeScript directly with its built-in type stripping (Node 22.18 or later), so
  files under `scripts/`, `src/domain/` and `src/calc/` import each other with explicit `.ts` extensions.
- Inputs, relative to the repo root, with these defaults: `--cashflow data/legacy-cashflow.xlsx`,
  `--bills data/legacy-bills.xlsx` (not parsed yet) and `--out data/import`.
- Outputs land in `data/import/`, gitignored because they hold real figures: `bundle.json`, `review/<tab>.csv`,
  `labels.csv` (label slots of inline sums: one per column, part position and part count, with a `label` column for
  the owner), `month-end-choice.csv` and `report.md`.
  The script exits with an error when a reconciliation check fails or the bundle does not pass the app's validation.
- The script and the app share `src/domain/`: tab specs, row decoding and validation. That folder and `src/calc/` must
  stay free of Node-only and browser-only APIs.
- SheetJS (`xlsx`) is installed from the SheetJS CDN, not from the npm registry, whose `xlsx` package is an old,
  unmaintained release.

`npm test` runs the unit tests (Vitest).
