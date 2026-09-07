// ─── Sri Lankan public holidays ───────────────────────────────────────────

export interface HolidayInfo {
  name: string;
  date: string; // YYYY-MM-DD
  type: 'poya' | 'public' | 'observance';
}

// Curated per-year dataset. Lunar-based holidays (Poya full-moon days, Vesak,
// Eid, Good Friday, Deepavali) cannot be computed reliably and are taken from
// published gazette lists (verified via officeholidays.com, 2026-09-07).
// Only national/public holidays are included (not "Government Holiday" extras
// or special bank holidays).
// ── LK_2025 ──
const LK_2025: HolidayInfo[] = [
  { name: 'Duruthu Full Moon Poya', date: '2025-01-13', type: 'poya' },
  { name: 'Tamil Thai Pongal Day', date: '2025-01-14', type: 'public' },
  { name: 'National Day', date: '2025-02-04', type: 'public' },
  { name: 'Navam Full Moon Poya', date: '2025-02-12', type: 'poya' },
  { name: 'Mahasivarathri Day', date: '2025-02-26', type: 'public' },
  { name: 'Madin Full Moon Poya', date: '2025-03-13', type: 'poya' },
  { name: 'Id-Ul-Fitr (Ramazan Festival Day)', date: '2025-03-31', type: 'public' },
  { name: 'Bak Full Moon Poya', date: '2025-04-12', type: 'poya' },
  { name: 'Sinhala and Tamil New Year Eve', date: '2025-04-13', type: 'public' },
  { name: 'Sinhala and Tamil New Year', date: '2025-04-14', type: 'public' },
  { name: 'Good Friday', date: '2025-04-18', type: 'public' },
  { name: 'Labour Day', date: '2025-05-01', type: 'public' },
  { name: 'Vesak Full Moon Poya', date: '2025-05-12', type: 'poya' },
  { name: 'Day following Vesak Full Moon Poya', date: '2025-05-13', type: 'public' },
  { name: 'Idul Adha (Hajjhi Festival Day)', date: '2025-06-07', type: 'public' },
  { name: 'Poson Full Moon Poya', date: '2025-06-10', type: 'poya' },
  { name: 'Esala Full Moon Poya', date: '2025-07-10', type: 'poya' },
  { name: 'Nikini Full Moon Poya', date: '2025-08-08', type: 'poya' },
  { name: 'Milad-Un-Nabi', date: '2025-09-05', type: 'public' },
  { name: 'Binara Full Moon Poya', date: '2025-09-07', type: 'poya' },
  { name: 'Vap Full Moon Poya', date: '2025-10-06', type: 'poya' },
  { name: 'Deepavali Festival Day', date: '2025-10-20', type: 'public' },
  { name: 'Ill Full Moon Poya', date: '2025-11-05', type: 'poya' },
];

// ── LK_2026 ──
const LK_2026: HolidayInfo[] = [
  { name: 'Duruthu Full Moon Poya', date: '2026-01-03', type: 'poya' },
  { name: 'Tamil Thai Pongal Day', date: '2026-01-15', type: 'public' },
  { name: 'Navam Full Moon Poya', date: '2026-02-01', type: 'poya' },
  { name: 'National Day', date: '2026-02-04', type: 'public' },
  { name: 'Mahasivarathri Day', date: '2026-02-15', type: 'public' },
  { name: 'Madin Full Moon Poya', date: '2026-03-02', type: 'poya' },
  { name: 'Id-Ul-Fitr (Ramazan Festival Day)', date: '2026-03-21', type: 'public' },
  { name: 'Bak Full Moon Poya', date: '2026-04-01', type: 'poya' },
  { name: 'Good Friday', date: '2026-04-03', type: 'public' },
  { name: 'Sinhala and Tamil New Year Eve', date: '2026-04-13', type: 'public' },
  { name: 'Sinhala and Tamil New Year', date: '2026-04-14', type: 'public' },
  { name: 'Labour Day', date: '2026-05-01', type: 'public' },
  { name: 'Idul Adha (Hajjhi Festival Day)', date: '2026-05-28', type: 'public' },
  { name: 'Vesak Full Moon Poya', date: '2026-05-30', type: 'poya' },
  { name: 'Day following Vesak Full Moon Poya', date: '2026-05-31', type: 'public' },
  { name: 'Poson Full Moon Poya', date: '2026-06-29', type: 'poya' },
  { name: 'Esala Full Moon Poya', date: '2026-07-29', type: 'poya' },
  { name: 'Milad-Un-Nabi', date: '2026-08-26', type: 'public' },
  { name: 'Nikini Full Moon Poya', date: '2026-08-27', type: 'poya' },
  { name: 'Binara Full Moon Poya', date: '2026-09-26', type: 'poya' },
  { name: 'Vap Full Moon Poya', date: '2026-10-25', type: 'poya' },
  { name: 'Deepavali Festival Day', date: '2026-11-08', type: 'public' },
  { name: 'Ill Full Moon Poya', date: '2026-11-24', type: 'poya' },
  { name: 'Unduvap Full Moon Poya', date: '2026-12-23', type: 'poya' },
  { name: 'Christmas Day', date: '2026-12-25', type: 'public' },
];

// ── LK_2027 ──
const LK_2027: HolidayInfo[] = [
  { name: 'Tamil Thai Pongal Day', date: '2027-01-15', type: 'public' },
  { name: 'Duruthu Full Moon Poya', date: '2027-01-22', type: 'poya' },
  { name: 'National Day', date: '2027-02-04', type: 'public' },
  { name: 'Navam Full Moon Poya', date: '2027-02-20', type: 'poya' },
  { name: 'Mahasivarathri Day', date: '2027-03-06', type: 'public' },
  { name: 'Id-Ul-Fitr (Ramazan Festival Day)', date: '2027-03-10', type: 'public' },
  { name: 'Madin Full Moon Poya', date: '2027-03-22', type: 'poya' },
  { name: 'Good Friday', date: '2027-03-26', type: 'public' },
  { name: 'Sinhala and Tamil New Year Eve', date: '2027-04-13', type: 'public' },
  { name: 'Sinhala and Tamil New Year', date: '2027-04-14', type: 'public' },
  { name: 'Bak Full Moon Poya', date: '2027-04-20', type: 'poya' },
  { name: 'Labour Day', date: '2027-05-01', type: 'public' },
  { name: 'Idul Adha (Hajjhi Festival Day)', date: '2027-05-17', type: 'public' },
  { name: 'Vesak Full Moon Poya', date: '2027-05-19', type: 'poya' },
  { name: 'Day following Vesak Full Moon Poya', date: '2027-05-20', type: 'public' },
  { name: 'Poson Full Moon Poya', date: '2027-06-18', type: 'poya' },
  { name: 'Esala Full Moon Poya', date: '2027-07-18', type: 'poya' },
  { name: 'Milad-Un-Nabi', date: '2027-08-15', type: 'public' },
  { name: 'Nikini Full Moon Poya', date: '2027-08-16', type: 'poya' },
  { name: 'Binara Full Moon Poya', date: '2027-09-15', type: 'poya' },
  { name: 'Vap Full Moon Poya', date: '2027-10-15', type: 'poya' },
  { name: 'Deepavali Festival Day', date: '2027-10-28', type: 'public' },
  { name: 'Ill Full Moon Poya', date: '2027-11-13', type: 'poya' },
  { name: 'Unduvap Full Moon Poya', date: '2027-12-13', type: 'poya' },
  { name: 'Christmas Day', date: '2027-12-25', type: 'public' },
];

const DATASETS: Record<number, HolidayInfo[]> = {
  2025: LK_2025,
  2026: LK_2026,
  2027: LK_2027,
};

// Fallback for years without a curated dataset: only unambiguous fixed-date
// national holidays (lunar holidays are intentionally omitted rather than
// guessed). Note: Jan 1 is not a national holiday in Sri Lanka.
function fixedDateHolidays(year: number): HolidayInfo[] {
  const p = (m: number, d: number) =>
    `${year}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  return [
    { name: 'National Day', date: p(2, 4), type: 'public' },
    { name: 'Labour Day', date: p(5, 1), type: 'public' },
    { name: 'Christmas Day', date: p(12, 25), type: 'public' },
  ];
}

const holidayMapCache = new Map<number, Map<string, HolidayInfo[]>>();

// All Sri Lankan holidays for a year as a map of date (YYYY-MM-DD) → holidays.
export function getSriLankanHolidayMap(year: number): Map<string, HolidayInfo[]> {
  const cached = holidayMapCache.get(year);
  if (cached) return cached;

  const list = DATASETS[year] ?? fixedDateHolidays(year);
  const map = new Map<string, HolidayInfo[]>();
  for (const h of list) {
    const arr = map.get(h.date);
    if (arr) arr.push(h);
    else map.set(h.date, [h]);
  }
  holidayMapCache.set(year, map);
  return map;
}
