# fin-dash

A family finance dashboard: a static React app that signs in with Google and reads and writes the family's Google
Spreadsheet straight from the browser. There is no backend, and no financial data lives in this repo; it stays in Google.

Today the app creates that spreadsheet from the legacy import, reads it back through the validator, and shows the month-end
snapshot history (cash, investments, both together) with a Data health panel listing what the validator found.

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

## Where the logic lives

- `src/domain/`: tab specs, row decoding and validation, shared with the import script.
- `src/calc/`: pure functions from a validated ledger to chart series and headline figures. A month without a snapshot row
  for a pot is never zero. Between two measured months of the same pot it is estimated on a straight line, gap months
  included; before a pot's first or after its last measured month it stays unknown, and a total that needs it shows only
  the known part as a lower bound. Charts, tiles, tooltips and tables mark estimated values as estimated.
- Estimates exist only on screen: nothing is written to the spreadsheet, gap months keep the status `gap`, and later
  calculations over a gap (spending, for one) must not read an estimated balance as a measured one.
- `src/data/`: storage, behind the `DataStore` interface.
- `src/components/`: React only; charts use Recharts, whose types stay inside `src/components/charts/`.

## Importing the legacy history

`scripts/import/` is a local Node script, not part of the app. It reads the legacy month-end workbook and writes the
reference and snapshot tabs as a bundle the app loads into a new spreadsheet, with a reconciliation report.

- Run `npm run import`. Node runs the TypeScript directly with its built-in type stripping (Node 22.18 or later), so
  files under `scripts/`, `src/domain/` and `src/calc/` import each other with explicit `.ts` extensions.
- Inputs, relative to the repo root, with these defaults: `--cashflow data/legacy-cashflow.xlsx`,
  `--bills data/legacy-bills.xlsx` (not parsed yet) and `--out data/import`.
- Outputs land in `data/import/`, gitignored because they hold real figures: `bundle.json`, `review/<tab>.csv`,
  `labels.csv` (part groups of inline sums, with a `label` column for the owner), `snapshot-choice.csv` and `report.md`.
  The script exits with an error when a reconciliation check fails or the bundle does not pass the app's validation.
- The script and the app share `src/domain/`: tab specs, row decoding and validation. That folder and `src/calc/` must
  stay free of Node-only and browser-only APIs.
- SheetJS (`xlsx`) is installed from the SheetJS CDN, not from the npm registry, whose `xlsx` package is an old,
  unmaintained release.

`npm test` runs the unit tests (Vitest).
