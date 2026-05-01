# Binance Personal Account Payment System
## Next.js + Vercel

---

## ফাইল স্ট্রাকচার

```
আপনার-nextjs-প্রজেক্ট/
├── lib/
│   └── binance.js                    ← Binance API helper
├── app/
│   ├── api/
│   │   └── pay/
│   │       └── verify/
│   │           └── route.js          ← Payment verify API
│   └── pay/
│       └── [invoiceId]/
│           └── page.jsx              ← Payment UI page
└── .env.local                        ← API keys (এটা .gitignore-এ থাকে)
```

---

## Step 1: Binance Read-Only API Key তৈরি করুন

1. Binance অ্যাপ বা ওয়েবসাইট খুলুন
2. **Profile** → **API Management** যান
3. **Create API** → Label দিন (যেমন: "My Payment System")
4. ✅ **Enable Reading** — শুধু এটাই enable রাখুন
5. ❌ Trading, Withdrawal — disable রাখুন (security)
6. IP Restriction: আপনার Vercel server IP দিতে পারেন (optional কিন্তু safe)
7. API Key ও Secret Key কপি করুন (Secret একবারই দেখা যাবে)

---

## Step 2: .env.local ফাইলে যোগ করুন

```env
# Binance Personal Account API (Read-only)
BINANCE_API_KEY=আপনার_api_key_এখানে
BINANCE_SECRET_KEY=আপনার_secret_key_এখানে

# আপনার Binance UID (যেখানে user টাকা পাঠাবে)
NEXT_PUBLIC_BINANCE_UID=1192463855

# আপনার সাইটের নাম
NEXT_PUBLIC_MERCHANT_NAME=আপনার_সাইটের_নাম
```

---

## Step 3: Vercel-এ Environment Variables দিন

Vercel Dashboard → আপনার Project → Settings → Environment Variables

উপরের সব variables add করুন।

---

## Step 4: ফাইলগুলো প্রজেক্টে কপি করুন

এই জিপের ফাইলগুলো আপনার Next.js প্রজেক্টে paste করুন।

---

## Payment Page URL

```
https://আপনার-সাইট.vercel.app/pay/INV001?amount=10&currency=USDT&desc=Purchase
```

**Parameters:**
| Parameter | বিবরণ | উদাহরণ |
|-----------|-------|---------|
| `amount` | কত USDT | `10` |
| `currency` | মুদ্রা | `USDT` |
| `desc` | বিবরণ | `Course+Purchase` |

---

## কীভাবে কাজ করে

```
User → Payment Page দেখে
     → Binance অ্যাপে আপনার UID-তে USDT পাঠায়
     → Binance থেকে Order ID কপি করে
     → Payment Page-এ Order ID submit করে
     → আপনার server Binance Read API দিয়ে verify করে
     → ✅ Success বা ❌ Error দেখায়
```

---

## Vercel KV দিয়ে Duplicate Prevention (Recommended)

```bash
# Vercel KV install করুন
npm install @vercel/kv
```

তারপর `app/api/pay/verify/route.js`-এ KV section uncomment করুন।

---

## Important Notes

- Binance Pay Trade History API শেষ **90 দিনের** transactions দেখায়
- API rate limit: প্রতি minute-এ সীমিত call (abuse করবেন না)
- Production-এ অবশ্যই Vercel KV দিয়ে duplicate prevention করুন
- Secret Key কখনো client-side code-এ দেবেন না
