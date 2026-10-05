# Kazim Nawrozi LLC — Phase 12 Deployment Checklist

## Runtime
- Node.js 24 LTS or compatible Node 24 release
- `npm install`
- `npm run build`
- `npm start`

## Environment
Set these in Vercel Project Settings → Environment Variables. For local work,
copy `.env.example` to `.env.local` and set:
- `DATABASE_URL` (pooled Neon/PostgreSQL connection string)
- `ADMIN_EMAIL`
- `ADMIN_USERNAME` (optional owner-account login name; defaults to `ADMIN_EMAIL`)
- `ADMIN_PASSWORD`
- `ADMIN_SESSION_SECRET` (use a long random value)
- `NEXT_PUBLIC_SITE_URL`
- SMTP variables if email notifications are required
- `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, and `TWILIO_WHATSAPP_FROM` if WhatsApp notifications are required

## Migrate the existing SQLite database
Vercel's function filesystem is temporary, so SQLite is not a safe production
database. Before deploying this PostgreSQL-backed version:

```powershell
npm run backup:db
npm run migrate:neon
```

Set `DATABASE_URL` locally to the destination Neon database before running the
migration. The script also accepts `DATABASE_URL_UNPOOLED` or the
`KAZIM_NAWROZI_DATABASE_URL[_UNPOOLED]` variants, copies the existing
`data/kazim-nawrozi.db`, verifies record counts, and fails if they do not match.
Use a database backup and run the migration only against the intended
destination. Then add the pooled `DATABASE_URL` to Vercel's Production and
Preview environments.

Product images uploaded under `public/uploads` are files and are not copied by
the database migration; use persistent/object storage for production uploads.

## Health check
After deployment, `/api/health` should return JSON with `ok: true` and
`database: "postgres"`.

## Email notifications
Without SMTP, orders still work and notifications are recorded in the database.
With SMTP configured, customers receive:
- order confirmation
- status update emails for staff status changes

Mailing-list requests appear under Admin → Notifications and remain pending
until approved. Approval sends a branded email using the logo and public
contact details configured under Admin → Settings. Set `NEXT_PUBLIC_SITE_URL`
to the public site origin so email clients can load the logo; a localhost URL
is not reachable by customers.

## WhatsApp notifications
Set the three Twilio variables in the server environment to enable WhatsApp
order confirmations and status updates. The sender must use Twilio's
WhatsApp-enabled number format, such as `whatsapp:+14155238886`. Customers must
explicitly opt in at checkout; phone numbers should be entered in international
format (10-digit US numbers are normalized to `+1`).

For production, use an approved WhatsApp message template for business-initiated
messages outside the customer service window. The implementation currently
sends free-form text messages, so Twilio/WhatsApp may reject them when a
template is required. Admin → Notifications shows channel configuration and
delivery results without exposing credentials.

## Customer tracking
Customers can use `/track-order` with their order number and checkout email.
The checkout confirmation also provides a private tracking link.

## Database operations
The application requires a reachable PostgreSQL database and uses it for
product, order, customer, admin, notification, and site settings data. Keep
`DATABASE_URL` configured for Production and Preview deployments, and schedule
Neon backups.
