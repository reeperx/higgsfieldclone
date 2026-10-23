/**
 * Money formatting for customer-facing amounts. Vendo prices in South African
 * rand (ZAR): the plan and top-up amounts stored in `lib/billing/plans.ts`,
 * the Bachs products in the dashboard, and everything a card is charged, are
 * all rand. Round amounts print without cents ("R199"); fractional amounts
 * pad to two ("R159,20" — the en-ZA decimal comma).
 */
export function zar(amount: number): string {
  return `R${amount.toLocaleString("en-ZA", {
    minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  })}`
}
