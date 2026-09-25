const multipliers: Record<string, number> = {
  천: 1000,
  만: 10000,
  억: 100000000,
  조: 1000000000000,
};
export const formatUsd = (n: number) =>
  `${n < 0 ? "-" : ""}$${new Intl.NumberFormat("en-US", { maximumFractionDigits: 8 }).format(Math.abs(n))}`;
/** Validate currency notation without changing its numeric value. */
export function displayCurrencyErrors(text: string): string[] {
  return /[\d영공일이삼사오육칠팔구십백천만억조][\d.,영공일이삼사오육칠팔구십백천만억조\s]*달러/u.test(
    text,
  )
    ? [
        "USD display still contains a spoken amount; use verified $ notation without changing its value",
      ]
    : [];
}
export function displayUsdAmounts(text: string): string {
  return text.replace(
    /(?<![\w가-힣.,])((?:\d+(?:,\d{3})*(?:\.\d+)?\s*[천만억조]?\s*)+)달러/gu,
    (full, amount: string) => {
      const terms = [
        ...amount.matchAll(/(\d+(?:,\d{3})*(?:\.\d+)?)\s*([천만억조]?)/g),
      ];
      let previous = Infinity,
        value = 0;
      for (const [, n, unit] of terms) {
        const scale = multipliers[unit] ?? 1;
        if (scale >= previous) return full;
        previous = scale;
        value += Number(n.replaceAll(",", "")) * scale;
      }
      return Number.isFinite(value) && Number.isSafeInteger(Math.trunc(value))
        ? formatUsd(value)
        : full;
    },
  );
}
