# Voyage – Travel Planner

A single-file travel planner web app. No build step, no dependencies. Data is saved in your browser and can optionally sync to Google Sheets.

## Features
- **Multiple trips**: upcoming and past trips, with yearly travel stats (trips, days away, total spent)
- **Overview**: countdown, budget used, to-do and packing progress, notes
- **Essentials**: hotel address with a big **Show to driver** screen (local-language address), emergency numbers, embassy, live local time and time difference, plug type, language and phrases
- **Itinerary**: activities by day with map links. **Share** to WhatsApp, or save as a PDF
- **Budget**: expenses in your home or the local currency (e.g. JPY), converted at the trip's rate (tap *Get today's rate*), plus a converter
- **Lists**: pre-trip **to-do** list with due dates (visa, insurance, bank, eSIM, currency…) and a **packing** list in sections with templates (Basics, Beach, City, Winter, Business, Umrah / Hajj)
- **Bookings & documents**: attach photos or PDFs of tickets and your passport. Stored on the device and optionally saved to **Google Drive**
- **Tap any item to edit it**, and undo after deleting
- **Auto-sync** to Google Sheets, with a status dot in the header
- **Backup**: download and restore a file
- **Works on every device**
  - **Swipe left/right** between tabs: the next tab follows your finger and snaps into place. Tapping a tab slides it in from the matching side
  - iPhone and Android: bottom tab bar, notch and home-bar safe areas, no zoom-on-tap, the right number keypad, Android back button closes pop-ups
  - iPad, tablets and PC: sidebar navigation, two-column layout on wide screens, hover states
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
2. Paste the contents of [`Code.gs`](Code.gs). Change `TOKEN = 'CHANGE_ME'` near the top to your own long secret word (16+ characters), then save.
3. **Deploy → New deployment → Web app**, Execute as **Me**, Who has access **Anyone**.
4. In the app go to **Settings**, paste the `/exec` URL and the same **secret word**, then tap **Save**. It says *Connected ✓* when the word matches. The 👁 button shows or hides the word as you type.
5. Turn on **Auto-sync**. Changes save automatically, and opening the app on another device pulls the newest copy. **Push ↑** / **Pull ↓** do it by hand.
6. Keep **Save attachments to Google Drive** on to upload booking photos and PDFs to *Google Drive → Voyage → trip name*. The files stay private to your account.

The sheet gets readable **Trips / Itinerary / Expenses / To-do / Packing / Bookings / Essentials** tabs, plus a hidden `_voyage` tab that holds the full data.

**Already deployed an older `Code.gs`?** Paste the new version, set your `TOKEN`, then **Deploy → Manage deployments → ✏️ Edit → Version: New version → Deploy** (approve the Google Drive permission if asked). The URL stays the same. Then type the same secret word in the app.

Photos are stored on each device, so another phone shows them as links to Drive instead. Backups don't include photos.

> Every read and write needs the secret word, so the URL alone shows nothing. After 20 wrong tries the script locks for 10 minutes. The secret word is saved only on each device, never in the Sheet.
