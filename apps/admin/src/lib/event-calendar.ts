/** Anchor month navigation on day one, including when navigating from the 31st. */
export const shiftMonth = (date: Date, amount: number): Date =>
  new Date(date.getFullYear(), date.getMonth() + amount, 1);
