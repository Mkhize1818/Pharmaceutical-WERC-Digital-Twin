# WERC Water Digital Twin — Generic Demo

## Original Problem Statement
Client wants a digital-twin demo (similar to the previous Liquid Ops twin) that incorporates
the data and calculations from an internal water-risk model + WERC feedback deck
(15 August 2025). Five required views: BAU risk profile, current true cost of water,
strategic simulator, long-term projection, cumulative savings.

**Subsequent rebranding**: all client-identifying names removed. Rebranded to a neutral
**"Pharmaceutical Company"** placeholder so the same demo can be shown to multiple
prospects. Talbot logo added top-left and "WERC Digital Twin" title centered in the header.

## User Choices (verbatim)
- Aspen corporate styling
- Priority order = as listed above (5 views)
- Extract numbers from the Excel model + PPT (no runtime upload)
- Tech stack: React + FastAPI + MongoDB
- Simple password gate + standalone HTML demo (like the Liquid Ops twin)

## Architecture
| Layer      | Tech                                                                 |
|------------|----------------------------------------------------------------------|
| Frontend   | React 19 + Recharts, Tailwind, Manrope + Fraunces fonts              |
| Backend    | FastAPI, in-code static model data from Aspen Model v6 sheets        |
| Standalone | Single-file `/standalone.html` using Chart.js + vanilla JS           |
| Auth       | Simple password gate (`aspen2050`) via `POST /api/auth/login`        |

Model data is extracted verbatim from:
- **BaU Model** sheet rows 22-33 (daily/annual consumption by source)
- **BaU Model** rows 94, 186, 192 (water cost ratio, risk cost, true value of water)
- **Strategic Model** row 111 (strategic cost ratio)
- **Inputs** rows 42-61 (tariffs + escalation rates)
- **Inputs** rows 156-200 (five initiatives with CAPEX / impact years)
- **Sheet2** rows 14-16 (cumulative 25-yr totals)

## Key Data Points
- **2025 true cost of water**: 335.62 R/kl (Municipal 30.24 + Discharge 26.82 + Treatment 24.80 + Climate 253.76)
- **2050 BaU true cost**: 753.46 R/kl (+124%)
- **2050 Strategic true cost** (full stack): 335.07 R/kl
- **Full strategy 25-yr savings**: R 3.8 bn (BaU R 6.6 bn → Strategic R 2.8 bn)
- **Default slider cumulative savings**: R 2.61 bn
- **Demand growth**: 520.6 → 1,973.0 kl/day (+279%)

## What's Implemented (Jan 2026)
- [x] Password gate (passphrase `aspen2050`) — backend `/api/auth/login`
- [x] Overview tab — hero + 4 KPI strip + site processes + catchment risks
- [x] BAU supply/demand tab — stacked bar + demand line + GW-availability dashed
- [x] True cost tab — 4-component pie + tariff reference grid
- [x] Strategic simulator — 3 sliders + 2 toggles + live BaU-vs-Strategic area chart + 4 KPI cards + initiative detail
- [x] Cumulative savings tab — annual bar + cumulative area + 3 summary cards
- [x] Standalone HTML `/standalone.html` — same 5 tabs in a single file (Chart.js)
- [x] Corporate styling — forest green (#006838), Aspen lime (#8DC63F), water blue (#0891B2)
- [x] **Rebrand (Jan 2026)**: all client names replaced with "Pharmaceutical Company"; Talbot logo added top-left; "WERC Digital Twin" title centered in header; no visible "Aspen" text anywhere
- [x] **PDF export (Jan 2026)**: "Download PDF" button in header (both React + standalone) → 6-page landscape A4 PDF presentation (cover + 5 view slides) via `html2canvas` + `jsPDF`, filename pattern `WERC-Water-Digital-Twin-YYYY-MM-DD.pdf`
- [x] Backend test suite (9 pytest cases, 100% pass)

## Test Credentials
See `/app/memory/test_credentials.md`.

## Backlog / Future Enhancements
- P1: Runtime Excel upload so the operator can feed an updated `Aspen Model v*.xlsm`.
- P1: PDF export of a scenario (useful for WERC committee packs).
- P2: CAPEX-vs-savings ROI module per initiative, payback-year chart.
- P2: Climate scenario selector (RCP 4.5 / 8.5) driving risk cost escalation.
- P2: Per-site extension — allow comparison across multiple Aspen facilities.
- P3: Move toggle `data-testid` to the outer label (minor accessibility fix, no functional impact).

## Endpoints Reference
| Method | Path                                 | Purpose                                        |
|--------|--------------------------------------|------------------------------------------------|
| POST   | `/api/auth/login`                    | Password gate                                  |
| GET    | `/api/aspen/site`                    | Site info + catchment flags                    |
| GET    | `/api/aspen/bau-supply-demand`       | BAU daily supply/demand rows 2025-2050         |
| GET    | `/api/aspen/true-cost-breakdown`     | 2025 true-cost pie + tariff reference          |
| GET    | `/api/aspen/bau-projection`          | BAU R/kl projection to 2050                    |
| POST   | `/api/aspen/scenario`                | Live scenario calculator (sliders + toggles)   |
| GET    | `/api/aspen/initiatives`             | 5 initiative cards + 25-yr strategy totals     |
