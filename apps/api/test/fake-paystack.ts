import { once } from 'node:events';
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';

/** A transaction as Paystack's verify endpoint would report it. */
export interface FakeTransaction {
  status:
    | 'success'
    | 'failed'
    | 'abandoned'
    | 'ongoing'
    | 'pending'
    | 'processing'
    | 'queued'
    | 'reversed';
  /** What the donor paid: the gift, plus Paystack's fee when the donor bears it. */
  amount: number;
  /** The gift the transaction was opened for; Paystack reports it next to `amount`. */
  requested_amount?: number;
  currency: string;
  /** The reference verify reports; the one it was asked about unless set. */
  reference?: string;
  /**
   * The metadata verify reports; what initialize was sent unless set. Paystack now and then
   * answers with it as a JSON string.
   */
  metadata?: unknown;
}

export interface RecordedRequest {
  method: string;
  path: string;
  authorization?: string;
  body?: Record<string, unknown>;
}

export interface FakePaystackOptions {
  /** The port to listen on; any free one unless set. */
  port?: number;
  /**
   * Leave each new transaction unpaid ('abandoned', as Paystack reports one) until the donor
   * pays on the fake checkout page. Unset, a transaction is paid as soon as it is opened.
   */
  payAtCheckout?: boolean;
}

export interface FakePaystack {
  url: string;
  /** The API calls the gateway made: everything but the checkout pages a browser opens. */
  requests: RecordedRequest[];
  /** What verify reports for a reference; by default the initialised charge. */
  setTransaction: (reference: string, transaction: FakeTransaction) => void;
  /**
   * Answer the next call, whatever it is, with this status and message, as Paystack fails; or
   * the next `times` calls (Infinity: every one, as for a key it no longer accepts).
   */
  failNext: (status: number, message: string, times?: number) => void;
  /** Answer every call normally again. */
  recover: () => void;
  close: () => Promise<void>;
}

/** What Paystack accepts in a reference. */
const REFERENCE = /^[A-Za-z0-9.=-]+$/;

const readJson = async (req: IncomingMessage): Promise<Record<string, unknown> | undefined> => {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(chunk as Buffer);
  }
  const text = Buffer.concat(chunks).toString('utf8');
  return text ? (JSON.parse(text) as Record<string, unknown>) : undefined;
};

const sendJson = (res: ServerResponse, status: number, body: unknown): void => {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
};

const redirect = (res: ServerResponse, location: string): void => {
  res.statusCode = 302;
  res.setHeader('Location', location);
  res.end();
};

/** Where Paystack sends the donor after paying: the callback, with the reference twice. */
const callbackWith = (callback: string, reference: string): string => {
  const target = new URL(callback);
  target.searchParams.set('trxref', reference);
  target.searchParams.set('reference', reference);
  return target.toString();
};

const checkoutPage = (reference: string, transaction: FakeTransaction): string => {
  const due = `${transaction.currency} ${(transaction.amount / 100).toFixed(2)}`;
  const base = `/checkout/${encodeURIComponent(reference)}`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Fake Paystack checkout</title>
<style>body{font-family:system-ui;background:#f4f6f8;display:grid;place-items:center;min-height:100vh;margin:0}
main{background:#fff;padding:32px 40px;border-radius:12px;box-shadow:0 10px 30px #0002;min-width:320px}
a{display:block;margin-top:16px;padding:12px;border-radius:6px;text-align:center;font-weight:600;text-decoration:none}
#pay{background:#09a5db;color:#fff}#cancel{color:#555}</style></head>
<body><main><p>A local stand-in for Paystack's checkout</p><h1 id="amount">Pay ${due}</h1>
<a id="pay" href="${base}/pay">Pay ${due}</a><a id="cancel" href="${base}/cancel">Cancel payment</a></main></body></html>`;
};

/**
 * A stand-in for api.paystack.co, reached through PAYSTACK_API_URL. It answers the two calls
 * the gateway makes and records them, so tests see exactly what would have been sent, and it
 * serves a checkout page whose Pay and Cancel send the browser where Paystack would.
 */
export const startFakePaystack = async (
  options: FakePaystackOptions = {},
): Promise<FakePaystack> => {
  const requests: RecordedRequest[] = [];
  const transactions = new Map<string, FakeTransaction>();
  const callbacks = new Map<string, string>();
  let failure: { status: number; message: string; times: number } | undefined;
  let url = '';

  const initialize = (res: ServerResponse, body: Record<string, unknown>): void => {
    const {
      reference,
      amount,
      currency,
      callback_url: callback,
      metadata,
    } = body as {
      reference: string;
      amount: number;
      currency: string;
      callback_url?: string;
      metadata?: unknown;
    };
    if (!REFERENCE.test(reference)) {
      sendJson(res, 400, { status: false, message: 'Invalid transaction reference' });
      return;
    }
    transactions.set(reference, {
      status: options.payAtCheckout ? 'abandoned' : 'success',
      amount,
      requested_amount: amount,
      currency,
      metadata,
    });
    if (callback) {
      callbacks.set(reference, callback);
    }
    sendJson(res, 200, {
      status: true,
      message: 'Authorization URL created',
      data: {
        authorization_url: `${url}/checkout/${reference}`,
        access_code: `access_${reference}`,
        reference,
      },
    });
  };

  const verify = (res: ServerResponse, reference: string): void => {
    const transaction = transactions.get(reference);
    if (!transaction) {
      // Paystack answers a reference it has never seen with a 400.
      sendJson(res, 400, { status: false, message: 'Transaction reference not found' });
      return;
    }
    const requested = transaction.requested_amount ?? transaction.amount;
    sendJson(res, 200, {
      status: true,
      message: 'Verification successful',
      data: {
        ...transaction,
        reference: transaction.reference ?? reference,
        fees: Math.max(transaction.amount - requested, 0),
        customer: { email: 'donor@example.org' },
      },
    });
  };

  /** The browser's side: the checkout page, and where its Pay and Cancel lead. */
  const checkout = (res: ServerResponse, reference: string, action?: string): void => {
    const transaction = transactions.get(reference);
    if (!transaction) {
      sendJson(res, 404, { status: false, message: 'Not found' });
      return;
    }
    const callback = callbacks.get(reference) ?? url;
    if (action === 'pay') {
      transaction.status = 'success';
      redirect(res, callbackWith(callback, reference));
      return;
    }
    if (action === 'cancel') {
      const cancel = (transaction.metadata as { cancel_action?: unknown } | undefined)
        ?.cancel_action;
      redirect(res, typeof cancel === 'string' ? cancel : callbackWith(callback, reference));
      return;
    }
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.end(checkoutPage(reference, transaction));
  };

  const server: Server = createServer((req, res) => {
    void (async () => {
      const path = req.url ?? '';
      const page = /^\/checkout\/([^/?]+)(?:\/(pay|cancel))?$/.exec(path);
      if (req.method === 'GET' && page) {
        checkout(res, decodeURIComponent(page[1]!), page[2]);
        return;
      }

      const body = await readJson(req);
      requests.push({
        method: req.method ?? '',
        path,
        authorization: req.headers.authorization,
        body,
      });

      if (failure) {
        sendJson(res, failure.status, { status: false, message: failure.message });
        failure.times -= 1;
        if (failure.times <= 0) {
          failure = undefined;
        }
        return;
      }
      if (req.method === 'POST' && path === '/transaction/initialize' && body) {
        initialize(res, body);
        return;
      }
      const verifying = /^\/transaction\/verify\/(.+)$/.exec(path);
      if (req.method === 'GET' && verifying) {
        verify(res, decodeURIComponent(verifying[1]!));
        return;
      }
      sendJson(res, 404, { status: false, message: 'Not found' });
    })();
  });
  server.listen(options.port ?? 0, '127.0.0.1');
  await once(server, 'listening');
  url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

  return {
    url,
    requests,
    // The metadata initialize was sent stays unless the test says otherwise.
    setTransaction: (reference, transaction) =>
      transactions.set(reference, {
        metadata: transactions.get(reference)?.metadata,
        ...transaction,
      }),
    failNext: (status, message, times = 1) => {
      failure = { status, message, times };
    },
    recover: () => {
      failure = undefined;
    },
    close: async () => {
      server.closeAllConnections();
      await new Promise<void>((resolve) => server.close(() => resolve()));
    },
  };
};
