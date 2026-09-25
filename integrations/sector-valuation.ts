export const SECTORS = [
  ["XLC", "커뮤니케이션", "communication-services"],
  ["XLY", "경기소비재", "consumer-discretionary"],
  ["XLP", "필수소비재", "consumer-staples"],
  ["XLE", "에너지", "energy"],
  ["XLF", "금융", "financial"],
  ["XLV", "헬스케어", "health-care"],
  ["XLI", "산업재", "industrial"],
  ["XLK", "정보기술", "technology"],
  ["XLB", "소재", "materials"],
  ["XLRE", "부동산", "real-estate"],
  ["XLU", "유틸리티", "utilities"],
] as const;

export const sectorUrl = (slug: string, ticker: string) =>
  `https://www.ssga.com/us/en/individual/etfs/state-street-${slug}-select-sector-spdr-etf-${ticker.toLowerCase()}`;
export function parseSectorPage(html: string, ticker: string) {
  const pageTicker = html.match(
    /<span class="fund-header__ticker">\s*([A-Z]+)\s*<\/span>/,
  )?.[1];
  if (pageTicker !== ticker) throw Error(`${ticker}: wrong fund page`);
  const sections = [
    ...html.matchAll(
      /<section[^>]*>\s*<h2[^>]*>\s*Index Characteristics\s*<span class="date">as of ([A-Za-z]{3} \d{1,2} \d{4})<\/span>[\s\S]*?<\/section>/g,
    ),
  ];
  if (sections.length !== 1)
    throw Error(`${ticker}: one Index Characteristics section required`);
  const section = sections[0];
  const date = new Date(`${section[1]} 00:00:00 GMT`);
  if (Number.isNaN(date.getTime()))
    throw Error(`${ticker}: invalid source date`);
  if (
    date
      .toUTCString()
      .slice(5, 16)
      .replace(/^(\d{2}) ([A-Za-z]{3}) (\d{4})$/, "$2 $1 $3")
      .replace(/ 0(\d) /, " $1 ") !== section[1]
  )
    throw Error(`${ticker}: invalid source date`);
  const values = [
    ...section[0].matchAll(
      /<tr>\s*<th[^>]*>\s*Price\/Earnings Ratio FY1\s*<\/th>\s*<td class="data">\s*([^<]+)\s*<\/td>\s*<\/tr>/g,
    ),
  ];
  if (values.length !== 1) throw Error(`${ticker}: ambiguous index FY1 P/E`);
  const value = Number(values[0][1].trim());
  if (!Number.isFinite(value) || value <= 0 || value > 500)
    throw Error(`${ticker}: invalid index FY1 P/E`);
  return { asOfDate: date.toISOString().slice(0, 10), value };
}

export async function fetchSectorValuation(
  ticker: (typeof SECTORS)[number][0],
) {
  const sector = SECTORS.find(([symbol]) => symbol === ticker);
  if (!sector) throw Error("Unknown sector ticker");
  const sourceUrl = sectorUrl(sector[2], ticker);
  const response = await fetch(sourceUrl, {
    signal: AbortSignal.timeout(15000),
    redirect: "error",
  });
  if (!response.ok) throw Error(`HTTP ${response.status}: www.ssga.com`);
  return {
    ticker,
    sector: sector[1],
    ...parseSectorPage(await response.text(), ticker),
    sourceUrl,
    retrievedAt: new Date().toISOString(),
  };
}
