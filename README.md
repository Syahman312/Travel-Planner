# Voyage – Travel Planner

A single-file travel planner web app. No build step, no dependencies. Data is saved in your browser and can optionally sync to Google Sheets.

## Features
- **Multiple trips**: upcoming and past trips, with yearly travel stats (trips, days away, total spent)
- **Overview**: countdown, budget used, to-do and packing progress, notes
- **Essentials**: hotel address with a big **Show to driver** screen (local-language address), emergency numbers, embassy, live local time and time difference, plug type, language and phrases
- **Itinerary**: activities by day with map links. **Share** to WhatsApp, or save as a PDF
- **Map**: every activity as a numbered pin, coloured by day, with the hotel. Filter by day and open the day's route in Google Maps. A place that can't be found can be typed as coordinates (`35.71, 139.79`)
- **Weather** for each trip day (Open-Meteo, no key needed). Forecast up to 16 days ahead; further out it shows last year's weather on the same dates
- **Budget**: expenses in your home or the local currency (e.g. JPY), converted at the trip's rate (tap *Get today's rate*), plus a converter
- **Split bill**: add who you're travelling with, pick who paid and who shares each expense, and see who owes who. Mark payments as paid, or send the list on WhatsApp
- **Lists**: pre-trip **to-do** list with due dates (visa, insurance, bank, eSIM, currency…) and a **packing** list in sections with templates (Basics, Beach, City, Winter, Business, Umrah / Hajj)
- **Bookings & documents**: attach photos or PDFs of tickets and your passport. Stored on the device and optionally saved to **Google Drive**
- **Reminders**: each booking can have a time and a reminder. Flights get "online check-in opens" a day before and "leave for the airport" 3 hours before. The overview shows what's coming up, and the app can show alerts while it's open
- **Calendar**: add bookings to **Google Calendar** automatically (a "Voyage" calendar, kept up to date when you sync), one at a time, or download an `.ics` file for iPhone Calendar or Outlook
- **Tap any item to edit it**, and undo after deleting
- **Auto-sync** to Google Sheets, with a status dot in the header
- **Backup**: download and restore a file
- **Works on every device**
  - **Swipe left/right** between tabs: the next tab follows your finger and snaps into place. Tapping a tab slides it in from the matching side
  - iPhone and Android: bottom tab bar, notch and home-bar safe areas, no zoom-on-tap, the right number keypad, Android back button closes pop-ups
  - iPad, tablets and PC: floating side panel with a sliding highlight; hide it with the button at its bottom (or `\`) for more room. Two-column layout on wide screens, hover states
  - Keyboard: `1`–`6` switch tabs, `N` new trip, `Enter` adds, `Esc` closes
  - **Install to home screen** (Safari → Share → Add to Home Screen, or Chrome → Install app). Works offline after the first visit.
  - Printable itinerary (browser Print)

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
5. Turn on **Auto-sync**. Changes save automatically, and opening the app on another device pulls the newest copy. **Push ↑** / **Pull ↓** do it by hand.
6. (Optional) Turn on **Settings → Add bookings to Google Calendar**. Only events Voyage created are changed or removed.
7. Keep **Save attachments to Google Drive** on to upload booking photos and PDFs to *Google Drive → Voyage → trip name*. The files stay private to your account.

The sheet gets readable **Trips / Itinerary / Expenses / Payments / To-do / Packing / Bookings / Essentials** tabs, plus a hidden `_voyage` tab that holds the full data.

**Already deployed the old `Code.gs`?** Paste the new version, then **Deploy → Manage deployments → ✏️ Edit → Version: New version → Deploy**, and approve the new Google Drive and Google Calendar permissions. The URL stays the same.

Photos are stored on each device, so another phone shows them as links to Drive instead. Backups don't include photos.

> The URL lets anyone who has it read and overwrite your planner data, so keep it private.
