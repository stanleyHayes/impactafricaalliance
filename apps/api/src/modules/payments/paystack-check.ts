import type { DependencyContainer } from 'tsyringe';

import type { AppLogger } from '../../config/logger.js';
import { PaystackGateway } from '../../providers/payment/paystack.gateway.js';

import { DonationRepository } from './donation.repository.js';
import { PaymentService } from './payment.service.js';

/**
 * Paystack gifts whose donors never came back.
 *
 * The Paystack account is shared with the owner's other apps, and its one webhook URL is
 * theirs, so Paystack never tells this site that a payment went through. A donor who pays and
 * closes the tab, or approves mobile money after leaving the checkout, leaves a pending gift
 * that only asking Paystack can settle. The scheduled run (/api/automations/run, hourly) asks
 * here: a paid gift is confirmed, a failed one marked failed, and one still unpaid a day after
 * it was started is closed as failed. A gift failed within the last day is asked about too,
 * since a declined first try can still be paid, and only a success changes it.
 */

/**
 * A gift is left alone until this long after its last look: its start, a donor's return, a
 * webhook or an earlier run. A new gift's donor is likely still at the checkout, and a gift
 * Paystack was just asked about needs no asking again, however often the run is called.
 */
export const CHECK_AFTER_MS = 10 * 60_000;

/** A gift unpaid this long after it was started is closed as failed. */
export const GIVE_UP_AFTER_MS = 24 * 3_600_000;

/** Gifts checked in one run, so a backlog cannot outlast the request. */
export const CHECK_BATCH = 25;

/**
 * The run answers the scheduler within 120 seconds, and the jobs run side by side. Each call
 * to Paystack can take up to 15 seconds, so stopping here leaves room for the last one.
 */
const RUN_BUDGET_MS = 60_000;

export interface PaystackCheckDeps {
  paystack: Pick<PaystackGateway, 'isConfigured'>;
  donations: Pick<DonationRepository, 'dueForPaystackCheck'>;
  payments: Pick<PaymentService, 'recheckPaystack'>;
  logger: AppLogger;
}

/** What one run did: the gifts it asked Paystack about, counted by what each is now. */
export interface PaystackCheckRun {
  /** Gifts asked about in this run. */
  checked: number;
  /** Paid: confirmed by this run, or by a donor's return or a webhook while it ran. */
  succeeded: number;
  /** Failed by Paystack's word or a day unpaid, now or before, and not paid since. */
  failed: number;
  /** Not paid yet, and less than a day old: asked about again in a later run. */
  pending: number;
  /** Could not be checked, Paystack being out of reach: asked about again in a later run. */
  errors: number;
}

/**
 * Whether a run could ask Paystack about none of the gifts it tried: the key refused (rotated
 * for one of the other apps, say), or Paystack out of reach. The scheduled run then shows as
 * failed, as surely as if the check had not run at all.
 */
export const paystackCheckFailed = (run: PaystackCheckRun): boolean =>
  run.errors > 0 && run.errors === run.checked;

/**
 * One pass over the Paystack gifts due a look, the longest unlooked-at first, until the batch
 * or the time runs out. Each gift is stamped as it is asked about, so whatever is left over, or
 * failed, waits its turn next run instead of holding the others up.
 */
export const checkPendingPaystackDonations = async (
  deps: PaystackCheckDeps,
  now: Date = new Date(),
  deadline: number = Date.now() + RUN_BUDGET_MS,
): Promise<PaystackCheckRun> => {
  const run: PaystackCheckRun = { checked: 0, succeeded: 0, failed: 0, pending: 0, errors: 0 };
  // Without the key there is nothing to ask Paystack with.
  if (!deps.paystack.isConfigured()) {
    return run;
  }
  const giveUpBefore = new Date(now.getTime() - GIVE_UP_AFTER_MS);
  const due = await deps.donations.dueForPaystackCheck(
    new Date(now.getTime() - CHECK_AFTER_MS),
    giveUpBefore,
    CHECK_BATCH,
  );
  for (const donation of due) {
    if (Date.now() >= deadline) {
      deps.logger.info(
        { left: due.length - run.checked },
        'Paystack donations left for the next run',
      );
      break;
    }
    run.checked += 1;
    try {
      run[await deps.payments.recheckPaystack(donation, giveUpBefore)] += 1;
    } catch (error) {
      // One gift Paystack could not answer for must not cost the others their check.
      run.errors += 1;
      deps.logger.warn(
        { err: error, reference: donation.reference },
        'A Paystack donation could not be checked',
      );
    }
  }
  return run;
};

/**
 * The check as the scheduled run calls it, with its dependencies from the container. Async, so
 * a dependency that cannot be built fails the check alone, as a rejection the run catches.
 */
export const runPaystackCheck = async (
  container: DependencyContainer,
  logger: AppLogger,
): Promise<PaystackCheckRun> =>
  checkPendingPaystackDonations({
    paystack: container.resolve(PaystackGateway),
    donations: container.resolve(DonationRepository),
    payments: container.resolve(PaymentService),
    logger,
  });
