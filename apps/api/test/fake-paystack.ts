import { once } from 'node:events';
import { createServer, type IncomingMessage, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';

/** A transaction as Paystack's verify endpoint would report it. */
export interface FakeTransaction {
  status: 'success' | 'failed' | 'abandoned' | 'ongoing';
  /** What the donor paid: the gift, plus Paystack's fee when the donor bears it. */
  amount: number;
  /** The gift the transaction was opened for; Paystack reports it next to `amount`. */
  requested_amount?: number;
  currency: string;
}

export interface RecordedRequest {
  method: string;
  path: string;
  authorization?: string;
  body?: Record<string, unknown>;
}

export interface FakePaystack {
  url: string;
  requests: RecordedRequest[];
  /** What verify reports for a reference; by default the initialised charge, succeeded. */
  setTransaction: (reference: string, transaction: FakeTransaction) => void;
  /** Answer the next call, whatever it is, with this status and message, as Paystack fails. */
  failNext: (status: number, message: string) => void;
  close: () => Promise<void>;
}

const readJson = async (req: IncomingMessage): Promise<Record<string, unknown> | undefined> => {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(chunk as Buffer);
  }
  const text = Buffer.concat(chunks).toString('utf8');
  return text ? (JSON.parse(text) as Record<string, unknown>) : undefined;
};

/**
 * A stand-in for api.paystack.co, reached through PAYSTACK_API_URL, that answers the two
 * calls the gateway makes and records them, so tests see exactly what would have been sent.
 */
export const startFakePaystack = async (): Promise<FakePaystack> => {
  const requests: RecordedRequest[] = [];
  const transactions = new Map<string, FakeTransaction>();
  let failure: { status: number; message: string } | undefined;
  let url = '';

  const server: Server = createServer((req, res) => {
    void (async () => {
      const body = await readJson(req);
      const path = req.url ?? '';
      requests.push({
        method: req.method ?? '',
        path,
        authorization: req.headers.authorization,
        body,
      });
      res.setHeader('Content-Type', 'application/json');

      if (failure) {
        res.statusCode = failure.status;
        res.end(JSON.stringify({ status: false, message: failure.message }));
        failure = undefined;
        return;
      }

      if (req.method === 'POST' && path === '/transaction/initialize' && body) {
        const { reference, amount, currency } = body as {
          reference: string;
          amount: number;
          currency: string;
        };
        transactions.set(reference, {
          status: 'success',
          amount,
          requested_amount: amount,
          currency,
        });
        res.end(
          JSON.stringify({
            status: true,
            message: 'Authorization URL created',
            data: {
              authorization_url: `${url}/checkout/${reference}`,
              access_code: `access_${reference}`,
              reference,
            },
          }),
        );
        return;
      }

      const verify = /^\/transaction\/verify\/(.+)$/.exec(path);
      const transaction = verify ? transactions.get(decodeURIComponent(verify[1]!)) : undefined;
      if (req.method === 'GET' && verify && transaction) {
        res.end(
          JSON.stringify({
            status: true,
            message: 'Verification successful',
            data: { ...transaction, reference: decodeURIComponent(verify[1]!) },
          }),
        );
        return;
      }

      // Paystack answers a reference it has never seen with a 400.
      res.statusCode = 400;
      res.end(JSON.stringify({ status: false, message: 'Transaction reference not found' }));
    })();
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

  return {
    url,
    requests,
    setTransaction: (reference, transaction) => transactions.set(reference, transaction),
    failNext: (status, message) => {
      failure = { status, message };
    },
    close: async () => {
      server.closeAllConnections();
      await new Promise<void>((resolve) => server.close(() => resolve()));
    },
  };
};
