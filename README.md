# fin-dash

A family finance dashboard: a static React app that signs in with Google and reads and writes the family's Google
Spreadsheet straight from the browser. There is no backend, and no financial data lives in this repo; it stays in Google.

The app shows the month-end history of cash, investments and pension, closes a month, edits closed months, manages the
portfolio of groups and balances, and tracks a monthly savings goal. A group is a grouping of money (a bank account, a
broker platform, a pension fund); a balance is a named line inside a group; a month-end balance is either one's amount
at the end of a month.

## Where the logic lives

- `src/domain/`: tab specs, row decoding and validation, shared with the import script. It and `src/calc/` stay free of
  Node-only and browser-only APIs.
- `src/calc/`: pure functions from a validated ledger to chart series and headline figures.
- `src/close/`, `src/portfolio/`, `src/goal/`, `src/schemaUpdate/`: closing and editing months, groups and balances, the
  savings goal, and updating an older spreadsheet. Everything is pure except the files that write: `write*`,
  `appendWithUnusedId` and `updateSchema`.
- `src/data/`: all Google access, behind the storage-neutral `DataStore` exported from `src/data/index.ts`.
- `src/routing/`: hash routes (`#/close`, `#/months/2026-10`, ...), so GitHub Pages serves every page from `index.html`.
- `src/components/`: React only. Recharts types stay inside `src/components/charts/`.

## Rules the code relies on

- **Access**: sign-in uses the `drive.file` scope, so the app opens only spreadsheets it created or the user chose in the
  Picker. The other partner gets the spreadsheet shared in Drive and chooses it once.
- **Writes**: the app never deletes a row. It appends, or overwrites only the cells that changed. Before writing it reads
  the tab again, places each value under its own header, and stops when the rows changed since the form opened, so two
  people cannot close or edit a month at once.
- **Order**: a close appends the month-end balance rows before the `months` row, so a close that fails midway leaves the
  month open and can be run again. Creating a spreadsheet writes `_meta` last, so one without `schema_version` reads as
  an interrupted setup.
- **Estimates exist only on screen**: a month without a value for a group is never zero. It is interpolated between
  measured months, or extended from the group's recent trend up to the newest month in the history, and marked `≈`.
  Nothing estimated is written, and gap months keep the status `gap`.
- **Pension**: entered at a month's close from the statement received that month, with the statement's date as `as_of`.
  It has its own chart and stays out of the cash and investment totals.
- **Schema versions**: a `schema_version` above `appSchemaVersion` (`src/domain/schema/meta.ts`) opens the spreadsheet
  read-only. One below it offers an update, which copies the spreadsheet as a backup first, renames tabs and headers in
  one `batchUpdate`, and writes the new version last, so an interrupted update can be run again.

## Local setup

1. Node 22.18 or later (the import script runs TypeScript directly).
2. In one Google Cloud project:
   - Enable the Google Sheets API, Google Picker API and Google Drive API.
   - Google Auth Platform: an External app with only non-sensitive scopes (`drive.file` plus `openid`, `email`,
     `profile`), published "In production". In "Testing" every authorisation expires after seven days.
   - An OAuth client of type Web application, with `http://localhost:5173` (and the hosted origin) as authorised
     JavaScript origins. No redirect URIs are needed.
   - An API key restricted to the Google Picker API and to the same websites.
3. Copy `.env.example` to `.env.local` and fill in `VITE_GOOGLE_CLIENT_ID`, `VITE_GOOGLE_API_KEY` and
   `VITE_GOOGLE_PROJECT_NUMBER` (the Picker app ID). These end up in the built JavaScript and are not secrets; the
   authorised origins and the API key restriction protect the app.
4. `npm install`, then `npm run dev`. `npm run build` writes the static site to `dist/`; `npm test` runs Vitest.

## Hosting

`.github/workflows/deploy.yml` lints, tests, builds and publishes to GitHub Pages on every push to `main`. It needs
Pages set to deploy from GitHub Actions and the three `VITE_GOOGLE_*` values as repository Actions variables. The build
uses relative asset paths, so it runs under the Pages project path; `public/manifest.webmanifest` makes it installable,
and `public/privacy.html` is the privacy policy the Google consent screen links to.

## Importing the legacy history

`npm run import` is a one-time local script in `scripts/import/`, not part of the app. It reads
`data/legacy-cashflow.xlsx` and writes `data/import/bundle.json` with review CSVs and a reconciliation report, all
gitignored because they hold real figures. It fails when a reconciliation check fails or the bundle does not pass the
app's validation. In the app, "Create spreadsheet from import" checks the bundle the same way and creates the spreadsheet.

SheetJS (`xlsx`) comes from the SheetJS CDN, since the npm registry's `xlsx` package is an old, unmaintained release.
