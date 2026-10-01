# Kazim Nawrozi LLC — Phase 12 Deployment Checklist

## Runtime
- Node.js 24 LTS or compatible Node 24 release
- `npm install`
- `npm run build`
- `npm start`

## Environment
Copy `.env.example` to `.env.local` and set:
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`
- `ADMIN_SESSION_SECRET` (use a long random value)
- `NEXT_PUBLIC_SITE_URL`
- SMTP variables if email notifications are required
- `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, and `TWILIO_WHATSAPP_FROM` if WhatsApp notifications are required

## Local SQLite
The live database is `data/kazim-nawrozi.db`.
Back it up before upgrades and deploys:

```powershell
npm run backup:db
```

Back up `public/uploads` as well because uploaded product images live there.

## Health check
After deployment:

`/api/health`

should return JSON with `ok: true` and `database: "sqlite"`.

## Email notifications
Without SMTP, orders still work and notifications are recorded in the database. With SMTP configured, customers receive:
- order confirmation
- status update emails for staff status changes

Mailing-list requests appear under Admin → Notifications and remain pending until approved. Approval sends a branded email using the logo and public contact details configured under Admin → Settings. Set `NEXT_PUBLIC_SITE_URL` to the public site origin so email clients can load the logo; a localhost URL is not reachable by customers.

## WhatsApp notifications
Set the three Twilio variables in the server environment to enable WhatsApp order confirmations and status updates. The sender must use Twilio's WhatsApp-enabled number format, such as `whatsapp:+14155238886`. Customers must explicitly opt in at checkout; phone numbers should be entered in international format (10-digit US numbers are normalized to `+1`).

For production, use an approved WhatsApp message template for business-initiated messages outside the customer service window. The implementation currently sends free-form text messages, so Twilio/WhatsApp may reject them when a template is required. Admin → Notifications shows channel configuration and delivery results without exposing credentials.

## Customer tracking
Customers can use `/track-order` with their order number and checkout email. The checkout confirmation also provides a private tracking link.

## Important production note
SQLite is a local-file database. For a single-server deployment, keep the database and uploads on persistent storage and schedule backups. Do not run multiple application servers against the same SQLite file unless you have a deliberate shared-storage architecture.
