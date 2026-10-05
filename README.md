# Kazim Nawrozi LLC — PostgreSQL + COD + Admin User Management

The application uses PostgreSQL (Neon) for persistent data and Cash on
Delivery. Set `DATABASE_URL` in `.env.local` for local development and in
Vercel's environment settings for deployed environments.

## Existing SQLite data migration

Back up the existing database and migrate it to the intended PostgreSQL
database before deploying:

```powershell
npm run backup:db
npm run migrate:neon
```

Set `DATABASE_URL` or `DATABASE_URL_UNPOOLED` in `.env.local` first. The
migration verifies row counts and exits unsuccessfully if the source and
destination differ. See [DEPLOYMENT.md](./DEPLOYMENT.md) for deployment steps.

## Admin Users / RBAC

The main admin account is configured in `.env.local` using `.env.example`. The main admin has full access and can open `/admin/users`.

The Admin Users module supports:
- Create staff users
- Edit username and permissions
- Change password while editing
- Reset password from the user list
- Disable / enable staff accounts
- Last login timestamp
- Created date
- PostgreSQL activity/audit log
- Server-side permission checks
- Staff cannot grant themselves the `users` permission

The audit log records staff login plus user-management actions such as create, update, enable, disable and password reset.

## Start

```powershell
npm install
npm run dev
```

Then open `http://localhost:3000/admin/login`.

Keep `.env.local` private.


## Phase 11 — Complete Order & Store Management

- Searchable and filterable admin order management
- Fulfillment statuses: New, Confirmed, Processing, Ready, Shipped, Delivered, Cancelled, Returned, Refund Requested
- COD payment tracking
- Internal order notes
- Customer/delivery details
- Printable professional order invoice
- 20% delivery/transfer amount shown separately
- Cancellation restores inventory
- Order changes recorded in the audit log
- Dashboard COD outstanding total

## Phase 12 — Customer Tracking, Notifications & Deployment Readiness

- Customer order tracking at `/track-order` using order number + checkout email
- Private tracking link on the order confirmation page
- Order status history stored in PostgreSQL
- Customer receipt page at `/order/receipt`
- Printable customer receipt/invoice workflow
- Optional SMTP email confirmation when an order is placed
- Optional SMTP status-update email when staff changes order status
- Optional opt-in Twilio WhatsApp confirmations and status updates
- Notification log in Admin → Notifications
- `/api/health` deployment health check
- `npm run backup:db` SQLite backup command for the migration source
- `DEPLOYMENT.md` production checklist
- Robust inventory handling when cancelled/returned orders are reactivated

### SMTP
Email and WhatsApp are optional. If a channel is not configured, orders still succeed and attempted notifications are recorded locally. Add SMTP settings or `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, and `TWILIO_WHATSAPP_FROM` to `.env.local` when you are ready for delivery. WhatsApp messages are sent only when the customer opts in at checkout.
