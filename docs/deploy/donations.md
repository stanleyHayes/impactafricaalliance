# Donations: switching on Paystack in Ghana cedis

The website takes gifts two ways. **Paystack** (card and mobile money) charges in **Ghana cedis
(GH₵)**. **Stripe** (international cards) stays in **US dollars**. Every donation records its own
currency, and the admin shows cedis and dollars side by side, for example
"GH₵4,250 · $1,200". It never adds them together.

Donors pay on Paystack's own secure checkout page: the website sends them there and Paystack sends
them back to `https://impactafricaalliance.org/donate/complete`, where the API confirms the payment
with Paystack before thanking them.

## What you need from Paystack

Only the **secret key**, from Paystack Dashboard → **Settings → API Keys & Webhooks**:

- `sk_test_…` while you are testing (the dashboard's Test mode),
- `sk_live_…` when you go live (the dashboard's Live mode, once Paystack has activated the business).

You do **not** need:

- **the public key** (`pk_…`). It is only for Paystack's pop-up on your own page; this site uses
  Paystack's hosted checkout instead.
- **a webhook secret.** Paystack signs every webhook with your secret key, and the API checks
  that signature with the same key.

## Checklist

### 1. Put the secret key in Render

1. Render → the **iaa-api** service → **Environment**.
2. Set `PAYSTACK_SECRET_KEY` to your `sk_test_…` key.
3. Check `PAYSTACK_CURRENCY` is `GHS` and `PAYSTACK_API_URL` is `https://api.paystack.co`
   (both come from `render.yaml`; leave them as they are).
4. Save with **Save, rebuild and deploy**. A plain restart does not pick up new values.

The same push to `main` deploys all three: the API on Render, and the website and the admin on
Vercel, which usually finishes first. Until the API's deploy is live, the website's donation form
cannot start a gift (the old API turns the new form away) and the admin shows the old dollar totals.
Nothing breaks; give Render a few minutes, or deploy the API first.

### 2. Paste the webhook URL in Paystack

Paystack Dashboard → **Settings → API Keys & Webhooks**:

- **Test Webhook URL:** `https://iaa-api.onrender.com/api/payments/webhooks/paystack`
- **Test Callback URL:** leave it empty. Each checkout already tells Paystack to bring the donor
  back to `/donate/complete` on the website.

If the API's Render address is not `iaa-api.onrender.com`, use the real one with the same
`/api/payments/webhooks/paystack` path.

### 3. Turn Paystack on in the admin

Admin → **Dashboard → Payment providers** → switch **Paystack** on. The row reads
"Secret key configured · charges in GHS" once the key is in place; the switch stays greyed out
until it is.

### 4. Test with the test key

1. On the website, open **Get Involved → Donate**, choose **Card / Mobile money**, pick an amount
   (the buttons read GH₵50, GH₵100, GH₵200 and GH₵500) and press **Donate GH₵… via Paystack**.
2. On Paystack's test checkout, pay with one of the test cards or mobile money numbers on
   Paystack's [Test Payments](https://paystack.com/docs/payments/test-payments/) page.
3. You land back on the website, which shows "We have received your donation of GH₵…".
4. In the admin, **Donations** lists the gift in GH₵ as succeeded, and the dashboard shows the
   cedi total next to any dollar total.

The donor's return to the website confirms the gift with Paystack directly; the webhook covers a
donor who closes the page before getting back. If paid gifts stay "pending", check the webhook URL
in step 2, then Render's logs: a failed call to Paystack is logged as "Paystack could not process
the request" with Paystack's own status and reason (for example 401, "Invalid key"). The key itself
is never written to the logs.

### 5. Go live

1. Render: replace `PAYSTACK_SECRET_KEY` with your `sk_live_…` key, then **Save, rebuild and
   deploy**.
2. Paystack Dashboard (Live mode) → **Settings → API Keys & Webhooks** → **Live Webhook URL:**
   the same `https://iaa-api.onrender.com/api/payments/webhooks/paystack`.
3. Make one small real donation (GH₵1 is enough) and check it reaches the admin as succeeded. You
   can refund it from the Paystack dashboard.

## Good to know

- **Amounts.** The smallest cedi gift is GH₵0.10, the least Paystack accepts; the form offers
  GH₵50, GH₵100, GH₵200 and GH₵500 as one-tap amounts. Stripe keeps its $25, $50, $100 and $500.
- **Transaction fees.** Either setting of Paystack's "Who should be charged transaction fees?"
  works. If donors pay the fee, Paystack charges them the gift plus the fee, and the admin
  records the gift they chose (GH₵100, not GH₵101.95).
- **Mobile money that lands late.** A donor sent back before approving the payment on their phone
  sees "We could not confirm your donation", and the gift reads as failed. If the payment goes
  through afterwards, Paystack's webhook confirms it and the gift becomes succeeded.
- **Older records.** Donations saved before this change have only a dollar amount and are read as
  US dollars. Nothing in the database needs migrating.
- **Changing the currency.** `PAYSTACK_CURRENCY` also accepts `USD`, if Paystack has enabled
  dollars on the account; Paystack takes dollar gifts from $2. A donor who loaded the form before
  such a change is asked to try again rather than charged in a currency they did not see.
