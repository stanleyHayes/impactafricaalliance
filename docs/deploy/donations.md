# Donations: Paystack in Ghana cedis, on a Paystack account you share

The website takes gifts two ways. **Paystack** (card and mobile money) charges in **Ghana cedis
(GH₵)**. **Stripe** (international cards) stays in **US dollars**. Every donation records its own
currency, and the admin shows cedis and dollars side by side, for example
"GH₵4,250 · $1,200". It never adds them together.

Donors pay on Paystack's own secure checkout page. The website sends them there, and Paystack
sends them back to `https://impactafricaalliance.org/donate/complete`, where the website confirms
the payment with Paystack before thanking them.

## One Paystack account, several apps

This site uses the same Paystack account, and the same keys, as your other apps. It is built so
that nothing about it gets in their way.

**Never change the Callback URL or the Webhook URL in the Paystack dashboard** (Settings → API
Keys & Webhooks), in Test mode or in Live mode. They belong to your other apps, and this site does
not need either of them:

- **It sends its own return and cancel addresses with every payment.** Paystack brings the donor
  back to `https://impactafricaalliance.org/donate/complete` after paying. If they press Cancel on
  the checkout, they land on the same page, which tells them calmly that nothing was charged. The
  addresses come from `PUBLIC_SITE_URL` on Render and nowhere else; Paystack uses them for this
  site's payments only. (That address forwards to `www.impactafricaalliance.org` with the
  payment's reference intact, so donors still land on the right page.)
- **It confirms payments without the webhook.** When a donor comes back, the site asks Paystack
  directly whether they paid. And every hour, the scheduled run (the "Run scheduled automations"
  GitHub Action, which already sends the event emails) asks Paystack about every gift still
  waiting. So a donor who pays and closes the tab, or approves mobile money a few minutes after
  leaving the checkout, is still confirmed, usually within the hour.

If you set the Webhook URL or the Callback URL to this site's API while following an earlier
version of this page, put your other apps' own addresses back, in Test mode and in Live mode.

### Finding this site's payments in the dashboard

Your Paystack dashboard lists every app's payments together. This site's are easy to pick out:

- their **reference starts with `iaa-`** (for example `iaa-3b241101-e2bb-4255-8caf-4136c566a962`);
- each one shows **Website: Impact Africa Alliance** and its **Donation ID** in the transaction's
  details.

### What your other apps' webhooks will see

Paystack sends every event on the account to the one Webhook URL, so your other apps receive this
site's payments too, mostly `charge.success`. They should ignore them, the way they would ignore
any payment they did not start: skip an event whose `data.reference` starts with `iaa-`, or whose
`data.metadata.source` is `impact-africa-alliance`, and still answer it with a 200 so Paystack
does not keep sending it. Most handlers already skip references they do not know; step 4 below
checks that yours do.

These events carry the donor's email address and payment details (such as a card's last four
digits or a mobile money number). Your other apps should skip them without saving or logging
them: this site's donors gave their details to this site, not to those apps.

## What you need from Paystack

Only the **secret key**, from Paystack Dashboard → **Settings → API Keys & Webhooks**: the same
key your other apps use.

- `sk_test_…` while you are testing (the dashboard's Test mode),
- `sk_live_…` when you go live (Live mode).

You do **not** need the public key (`pk_…`), which is only for Paystack's pop-up on a page of your
own, or any webhook secret.

## Checklist

### 1. Put the test key in Render

1. Render → the **iaa-api** service → **Environment**.
2. Set `PAYSTACK_SECRET_KEY` to your `sk_test_…` key.
3. Check these, which come from `render.yaml`; leave them as they are:
   - `PUBLIC_SITE_URL` is `https://impactafricaalliance.org`. Paystack sends donors back there, so
     the API refuses to start unless it is the site's own `https` address and nothing more: not
     this machine, not a bare IP address, and no path after it.
   - `PAYSTACK_CURRENCY` is `GHS`.
   - `PAYSTACK_API_URL` is `https://api.paystack.co`. The secret key goes to this address, so the
     API refuses to start with any other.
4. Save with **Save, rebuild and deploy**. A plain restart does not pick up new values.

The same push to `main` deploys all three: the API on Render, and the website and the admin on
Vercel. Donations pause from the moment the first of the two goes live until the second does: the
old API turns the new donation form away, and the new API turns the old form away. That is
usually a few minutes. Check that both went out: Render's **Events** page for the API, and
Vercel's **Deployments** page for the website. A paused Vercel project builds nothing, and
donations stay paused until the website's deploy is live.

### 2. Check the hourly run

The hourly check needs `AUTOMATION_RUN_SECRET` set to the same value in Render and as the
repository secret of the same name in GitHub. If the event reminders and thank-you emails already
go out, it is set. On GitHub → **Actions** → **Run scheduled automations**, the latest run should
be green, and its output includes a line like
`"paystackDonations":{"checked":1,"succeeded":1,"failed":0,"pending":0,"errors":0}`: how many gifts
it asked Paystack about, and what those gifts are now.

- **A red run** means a part of it failed. For donations, that is a check that could not ask
  Paystack about any gift it tried: usually because the shared secret key was changed for one of
  your other apps (set the new one as `PAYSTACK_SECRET_KEY` in Render too), or because Paystack
  was out of reach for the whole run.
- **`errors` above 0 in a green run** means Paystack could not answer for some gifts just then.
  They are asked about again in the next run.
- **GitHub switches the run off by itself** in a public repository after 60 days without any
  activity in it, and emails a warning first. To turn it back on: GitHub → **Actions** → **Run
  scheduled automations** → **Enable workflow**. While it is off, a gift whose donor paid and
  never came back stays pending, and pending gifts are deleted after 30 days
  (`FAILED_DONATION_RETENTION_DAYS`). Turning the run back on within that time confirms them.

### 3. Turn Paystack on in the admin

Admin → **Dashboard → Payment providers** → switch **Paystack** on. Once the key is in place the
row reads:

- "Secret key configured · charges in GHS",
- "Returns donors to impactafricaalliance.org/donate/complete" (point at it for the full address),
- "Confirmed on return and hourly, so no webhook is needed."

The switch stays greyed out until the key is set. From now on, anyone on the website can start a
Paystack gift, and with the test key no real money can be paid. So do step 4 straight away, at a
quiet time, and switch Paystack off again if you stop before going live.

### 4. Test with the test key

1. On the website, open **Get Involved → Donate**, choose **Card / Mobile money**, pick an amount
   (the buttons read GH₵50, GH₵100, GH₵200 and GH₵500) and press **Donate GH₵… via Paystack**.
2. On Paystack's test checkout, pay with one of the test cards or mobile money numbers on
   Paystack's [Test Payments](https://paystack.com/docs/payments/test-payments/) page. You land
   back on the website, which shows "We have received your donation of GH₵…". The admin's
   **Donations** page lists the gift in GH₵ as succeeded.
3. Start another gift and press **Cancel** on the checkout instead. The website says "You
   cancelled the payment. Nothing was charged." The gift waits as pending, and is closed as failed
   a day later.
4. Start a third, pay, and close the tab before the website comes back. Usually within the hour,
   the admin shows it as succeeded. To see it sooner, wait ten minutes after starting the gift (the
   check leaves younger gifts alone), then run **Run scheduled automations** by hand from GitHub →
   Actions → **Run workflow**.
5. In the Paystack dashboard (Test mode), the test payments show references starting with `iaa-`
   and "Website: Impact Africa Alliance".
6. Check each of your other apps: its webhook received this site's test `charge.success` (the
   request shows in its logs, and the reference starts with `iaa-`), answered it with a 200, and
   did nothing with it: no order, no email, nothing saved.

The test gifts stay on the admin's **Donations** page, and the succeeded ones in its totals, after
you go live: the admin cannot delete them. Keep them few, and small, with the custom amount
(GH₵1 is enough).

### 5. Go live

1. Render: replace `PAYSTACK_SECRET_KEY` with your `sk_live_…` key, then **Save, rebuild and
   deploy**.
2. Leave the Live Callback URL and Live Webhook URL in Paystack exactly as they are.
3. Make one small real donation (GH₵1 is enough) and check it reaches the admin as succeeded. You
   can refund it from the Paystack dashboard.

Test gifts still pending when you switch are closed as failed a day after they were made: the live
account has never heard of them.

## Good to know

- **Transaction fees.** "Who should be charged transaction fees?" is one setting for the whole
  Paystack account, so it applies to your other apps as well. Either setting works here. If donors
  pay the fee, Paystack charges them the gift plus the fee, and the admin records the gift they
  chose (GH₵100, not GH₵101.95).
- **Mobile money that lands late.** A donor sent back before approving the payment on their phone
  sees "Your payment is being confirmed", and the gift waits as pending. When the payment goes
  through, the hourly check confirms it.
- **Gifts never paid.** A gift still unpaid a day after it was started is closed as failed. A gift
  that failed (a declined card, say) is still checked for a day after it was started, in case the
  donor paid on a second try. Failed gifts, like gifts left pending, are deleted after 30 days
  (`FAILED_DONATION_RETENTION_DAYS`).
- **Amounts.** The smallest cedi gift is GH₵0.10, the least Paystack accepts; the form offers
  GH₵50, GH₵100, GH₵200 and GH₵500 as one-tap amounts. Stripe keeps its $25, $50, $100 and $500.
- **If paid gifts stay pending for more than an hour**, check that **Run scheduled automations**
  is switched on and its latest run is green, with `errors` at 0, then Render's logs. A failed call
  to Paystack is logged as "Paystack could not process the request" with Paystack's own status and
  reason (for example 401, "Invalid key"). The key itself, and donors' email addresses, are never
  written to the logs.
- **What donors see on Paystack.** The checkout, and the donor's bank or mobile money statement,
  show your Paystack business's name: the one your other apps use.
- **Receipts.** The thank-you page tells donors a receipt is on its way by email. Whether Paystack
  sends one is a setting of the whole Paystack account, shared with your other apps: check that
  customer receipts are switched on.
- **Older records.** Donations saved before currencies have only a dollar amount and are read as US
  dollars. Nothing in the database needs migrating.
- **Changing the currency.** `PAYSTACK_CURRENCY` also accepts `USD`, if Paystack has enabled
  dollars on the account; Paystack takes dollar gifts from $2. A donor who loaded the form before
  such a change is asked to try again rather than charged in a currency they did not see.
- **A Paystack business of its own, if you ever want one.** Paystack lets one login run several
  businesses, each with its own keys, Callback URL and Webhook URL. Giving this site one would
  separate its payments and payouts from your other apps entirely. Nothing here needs it: the setup
  above works on the shared account as it is.
