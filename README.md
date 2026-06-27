# Automated Hotel Booking & Room Service Portal

A browser-based MVP for a two-sided hotel portal:

- Guests sign in to `guest/index.html`, search room availability by date, book rooms, and submit meal, maintenance, or cleaning requests.
- Staff sign in to `admin/index.html` to view active stays, monitor revenue and occupancy, filter service requests, and update fulfillment status.
- Data persists in `localStorage`, so the app works without a backend during demo and development.

## Run

For the static-only version, open `index.html` to choose a portal, or open a portal directly:

- Guest portal: `guest/index.html`
- Admin portal: `admin/index.html`

For backend access, run:

```bash
node backend/server.js
```

Then open:

- Portal chooser: `http://localhost:5000/`
- Guest portal: `http://localhost:5000/guest/`
- Admin portal: `http://localhost:5000/admin/`

## Demo Flow

1. Sign in as `guest` / `guest123`, or create a new guest account.
2. Pick check-in and check-out dates.
3. Book any available room.
4. Create a room-service request from the guest dashboard.
5. Open `admin/index.html`, then sign in as `ISMAIL` / `ismail123`.
6. Review bookings and update request status on the admin board.
7. Use **Reset demo data** to restore the seeded accounts, bookings, and requests.

## Next Backend Step

The current UI maps cleanly to REST endpoints:

- `GET /api/rooms`
- `POST /api/bookings`
- `GET /api/bookings/my`
- `GET /api/bookings/all`
- `POST /api/requests`
- `GET /api/requests/all`
- `PUT /api/requests/:id/status`

Those can be backed by Express and PostgreSQL when you are ready to move from prototype data to multi-user persistence.

## Backend API

This project now includes a dependency-free Node backend in `backend/server.js`. It stores demo data in `backend/data.json` after the first run.

Admin-protected routes require `Authorization: Bearer <token>` from `POST /api/auth/login`.

- `POST /api/auth/login`
- `POST /api/auth/register`
- `GET /api/rooms`
- `POST /api/bookings`
- `GET /api/bookings/my`
- `POST /api/requests`
- `GET /api/admin/bookings`
- `GET /api/admin/requests`
- `PATCH /api/admin/requests/:id/status`
- `POST /api/admin/reset`

## MySQL Setup

Install the Node package:

```bash
npm install
```

Create the MySQL database and tables:

```bash
mysql -u root -p < backend/schema.sql
```

Copy `.env.example` values into your environment, or set them in PowerShell before starting:

```powershell
$env:DB_CLIENT="mysql"
$env:DB_HOST="localhost"
$env:DB_PORT="3306"
$env:DB_USER="root"
$env:DB_PASSWORD="your_mysql_password"
$env:DB_NAME="hotel_portal"
node backend/server.js
```

When `DB_CLIENT=mysql` is set, the backend uses MySQL. When it is not set, it uses `backend/data.json`.

## Render Deployment

This project includes a `render.yaml` manifest for Render. To deploy:

- Push this repository to GitHub (example):

```bash
git remote add origin https://github.com/<your-username>/<your-repo>.git
git push -u origin main
```

- On Render (https://dashboard.render.com):
	- New → Web Service → select this GitHub repo and branch `main`.
	- Render will use `render.yaml` (or use Build: `npm install`, Start: `npm start`).
	- Add an environment variable `TOKEN_SECRET` with a random value.

- After deploy, visit: `https://<your-service>.onrender.com/` and check `https://<your-service>.onrender.com/api/health`.

Replace `<your-service>` or the GitHub URL above with your actual values after pushing.
