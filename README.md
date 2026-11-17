# Voyage – Travel Planner

A single-file travel planner web app. No build step, no dependencies. Data is saved in your browser and can optionally sync to Google Sheets.

## Features
- **Multiple trips**: switch between them from the header
- **Overview**: countdown, trip length, budget used, packing progress, notes
- **Itinerary**: activities grouped by day
- **Budget**: expenses by category, with spent and remaining amounts
- **Packing** checklist
- **Bookings**: flight, hotel, car and other references, with links
- **Settings**: Google Sheets sync (push and pull), JSON backup and import, delete a trip
- Light and dark mode, works on phones

## Run it
Open `index.html` in a browser, or host it on GitHub Pages:

1. Repo **Settings → Pages**
2. Source: **Deploy from a branch** → `main` / `(root)`
3. Open `https://<your-username>.github.io/Travel-Planner/`

## Google Sheets sync (optional)
1. Create a new Google Sheet → **Extensions → Apps Script**.
2. Paste the contents of [`Code.gs`](Code.gs) and save.
3. **Deploy → New deployment → Web app**, Execute as **Me**, Who has access **Anyone**.
4. Copy the `/exec` URL into the app: **Settings → Save URL**.
5. **Push ↑** uploads this device's data. **Pull ↓** replaces this device's data with the copy in the sheet.

The sheet gets readable **Trips / Itinerary / Expenses / Packing / Bookings** tabs, plus a hidden `_voyage` tab that holds the full data.

> The URL lets anyone who has it read and overwrite your planner data, so keep it private.
