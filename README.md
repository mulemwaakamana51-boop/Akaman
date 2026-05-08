# Akamana Backend

Full Node.js + Express backend for the Akamana content platform.
Supports paid downloads, subscriptions, ad revenue, creator payouts, and S3 file storage.

---

## Tech Stack

- **Node.js + Express** — API server
- **MongoDB Atlas** — database (free tier available)
- **Stripe** — payments & subscriptions
- **AWS S3** — file storage (movies, music, docs)
- **JWT** — authentication

---

## Folder Structure

```
akamana-backend/
├── server.js           ← Entry point
├── .env.example        ← Copy to .env and fill in values
├── models/
│   └── index.js        ← User, Content, Purchase schemas
├── middleware/
│   └── auth.js         ← JWT auth middleware
└── routes/
    ├── auth.js         ← Register, login, /me
    ├── content.js      ← Browse, search, rate content
    ├── upload.js       ← S3 file upload + signed download URLs
    ├── payments.js     ← Stripe checkout, subscriptions, webhooks
    └── users.js        ← Profiles, creator leaderboard
```

---

## Setup (Step by Step)

### 1. Install dependencies
```bash
cd akamana-backend
npm install
```

### 2. Set up MongoDB Atlas (free)
1. Go to https://cloud.mongodb.com → create free account
2. Create a cluster (free M0 tier)
3. Get your connection string → paste into `.env` as `MONGO_URI`

### 3. Set up Stripe
1. Go to https://stripe.com → create account
2. Get your **Secret Key** from Dashboard → Developers → API Keys
3. Create two subscription products:
   - **Standard** at $7.99/month → copy the Price ID
   - **Premium** at $14.99/month → copy the Price ID
4. Set up webhook: Dashboard → Webhooks → Add endpoint
   - URL: `https://yourdomain.com/api/payments/webhook`
   - Events to listen for:
     - `checkout.session.completed`
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
5. Copy Webhook Signing Secret → paste as `STRIPE_WEBHOOK_SECRET`

### 4. Set up AWS S3
1. Go to https://aws.amazon.com → create account
2. Create an S3 bucket (e.g. `akamana-uploads`)
3. Set bucket region (e.g. `us-east-1`)
4. Create an IAM user with `AmazonS3FullAccess`
5. Copy Access Key ID and Secret Access Key → paste into `.env`
6. Add this CORS policy to your bucket:
```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
    "AllowedOrigins": ["https://yourdomain.com"],
    "ExposeHeaders": []
  }
]
```

### 5. Configure .env
```bash
cp .env.example .env
# Fill in all values
```

### 6. Run locally
```bash
npm run dev    # development (with nodemon)
npm start      # production
```

---

## API Reference

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Login, get JWT |
| GET  | `/api/auth/me` | Get current user (auth required) |
| POST | `/api/auth/become-creator` | Upgrade to creator |

### Content
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/content` | Browse (supports `?type=movie&genre=drama&search=...&sort=popular`) |
| GET | `/api/content/trending` | Top 12 trending |
| GET | `/api/content/:id` | Single content item |
| PATCH | `/api/content/:id` | Update (creator only) |
| POST | `/api/content/:id/rate` | Rate 1–5 stars |

### Upload
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/upload/content` | Upload file to S3 (creator only) |
| POST | `/api/upload/thumbnail/:id` | Upload thumbnail image |
| GET  | `/api/upload/download-url/:id` | Get signed S3 download URL |
| DELETE | `/api/upload/:id` | Delete content + S3 file |

### Payments
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/payments/checkout` | Create Stripe checkout for download |
| POST | `/api/payments/subscribe` | Subscribe to Standard or Premium |
| POST | `/api/payments/cancel-subscription` | Cancel subscription |
| GET  | `/api/payments/purchases` | User's purchase history |
| GET  | `/api/payments/creator-earnings` | Creator earnings breakdown |
| POST | `/api/payments/webhook` | Stripe webhook handler |

### Users
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users/:id/profile` | Public creator profile |
| GET | `/api/users/:id/content` | Creator's uploaded content |
| PATCH | `/api/users/me` | Update own profile |
| GET | `/api/users/leaderboard/top` | Top 10 earning creators |

---

## Deploy to Railway (easiest, ~5 min)

1. Go to https://railway.app → sign up
2. New Project → Deploy from GitHub repo
3. Add environment variables (paste your .env values)
4. Railway auto-detects Node.js and deploys

Your backend will be live at `https://akamana-backend.up.railway.app`

## Deploy to Render (free tier)

1. Go to https://render.com → New Web Service
2. Connect GitHub → select repo
3. Build command: `npm install`
4. Start command: `node server.js`
5. Add environment variables

---

## Revenue Flow

```
User buys content ($3.99)
  → Stripe processes payment
  → Webhook fires: checkout.session.completed
  → Purchase record created in DB
  → Creator receives 85% ($3.39) added to totalEarned
  → User gains download access
  → Signed S3 URL generated on demand (expires 15 min)
```

## Subscription Flow

```
User subscribes to Premium ($14.99/mo)
  → Stripe checkout session created
  → On success webhook: user.plan = "premium"
  → User can now stream/download subscription content
  → Monthly Stripe invoice auto-renews
  → Cancellation: plan reverts to "free" at period end
```
