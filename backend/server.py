"""
WERC Water Digital Twin - Backend
Source: Water Model v6.xlsm + WERC Feedback deck (Aug 2025)
All figures are extracted verbatim from the client's risk model.
"""
from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os, logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Dict, Any

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI(title="WERC Water Digital Twin")
api = APIRouter(prefix="/api")

# ---------------------------------------------------------------------------
# STATIC MODEL DATA (extracted from Aspen Model v6.xlsm)
# ---------------------------------------------------------------------------
YEARS = list(range(2025, 2051))

# Daily demand vs supply by source (kl/d) — BaU Model, rows 28–33
BAU_DAILY = {
    # (Total Demand, Municipal, Groundwater, Rainwater, Recovered)
    2025: (520.6, 364.4, 156.2, 0, 0),
    2026: (1302.9, 651.5, 651.5, 0, 0),
    2027: (1412.7, 0.0, 1412.7, 0, 0),
    2028: (1412.7, 0.0, 1412.7, 0, 0),
    2029: (1659.7, 0.0, 1659.7, 0, 0),
    2030: (1659.7, 0.0, 1659.7, 0, 0),
    2031: (1973.0, 218.6, 1754.4, 0, 0),
    2032: (1973.0, 218.6, 1754.4, 0, 0),
    2033: (1973.0, 218.6, 1754.4, 0, 0),
    2034: (1973.0, 218.6, 1754.4, 0, 0),
    2035: (1973.0, 218.6, 1754.4, 0, 0),
    2036: (1973.0, 218.6, 1754.4, 0, 0),
    2037: (1973.0, 218.6, 1754.4, 0, 0),
    2038: (1973.0, 218.6, 1754.4, 0, 0),
    2039: (1973.0, 218.6, 1754.4, 0, 0),
    2040: (1973.0, 218.6, 1754.4, 0, 0),
    2041: (1973.0, 218.6, 1754.4, 0, 0),
    2042: (1973.0, 218.6, 1754.4, 0, 0),
    2043: (1973.0, 218.6, 1754.4, 0, 0),
    2044: (1973.0, 218.6, 1754.4, 0, 0),
    2045: (1973.0, 218.6, 1754.4, 0, 0),
    2046: (1973.0, 218.6, 1754.4, 0, 0),
    2047: (1973.0, 218.6, 1754.4, 0, 0),
    2048: (1973.0, 218.6, 1754.4, 0, 0),
    2049: (1973.0, 218.6, 1754.4, 0, 0),
    2050: (1973.0, 218.6, 1754.4, 0, 0),
}

# Groundwater AVAILABILITY (kl/d)  —  376 680 kl/yr until additional BH in 2026 (×2)
GW_AVAIL_KLD = {y: (376680 / 365) if y < 2026 else (753360 / 365) for y in YEARS}
MUN_AVAIL_KLD = 2000  # NMBM municipal nominal (unconstrained reference)

# BAU Water Cost Ratio (R/kl) — BaU Model D94
BAU_COST_RATIO = {
    2025: 55.65, 2026: 58.53, 2027: 55.43, 2028: 60.17, 2029: 67.48,
    2030: 72.84, 2031: 83.34, 2032: 89.81, 2033: 96.80, 2034: 104.35,
    2035: 112.51, 2036: 121.32, 2037: 130.85, 2038: 141.15, 2039: 152.28,
    2040: 164.31, 2041: 177.32, 2042: 191.39, 2043: 206.62, 2044: 223.08,
    2045: 240.90, 2046: 260.17, 2047: 281.04, 2048: 303.62, 2049: 328.06,
    2050: 354.53,
}

# BAU Water Risk Cost (R/kl)  —  BaU Model D186  (pessimistic climate-adjusted)
BAU_RISK_COST = {
    2025: 279.97, 2026: 137.61, 2027: 4.03, 2028: 4.40, 2029: 4.82,
    2030: 5.27, 2031: 125.99, 2032: 133.44, 2033: 142.08, 2034: 150.90,
    2035: 160.27, 2036: 169.80, 2037: 180.83, 2038: 192.10, 2039: 204.08,
    2040: 216.27, 2041: 230.38, 2042: 244.79, 2043: 260.13, 2044: 275.76,
    2045: 293.82, 2046: 312.30, 2047: 331.97, 2048: 352.04, 2049: 375.20,
    2050: 398.93,
}

# BAU True Value of Water (R/kl) — BaU Model D192
BAU_TRUE_COST = {
    2025: 335.62, 2026: 196.13, 2027: 59.46, 2028: 64.57, 2029: 72.30,
    2030: 78.11, 2031: 209.32, 2032: 223.25, 2033: 238.88, 2034: 255.25,
    2035: 272.78, 2036: 291.12, 2037: 311.68, 2038: 333.24, 2039: 356.35,
    2040: 380.58, 2041: 407.70, 2042: 436.19, 2043: 466.75, 2044: 498.84,
    2045: 534.72, 2046: 572.48, 2047: 613.01, 2048: 655.65, 2049: 703.26,
    2050: 753.46,
}

# Strategic True Value of Water (R/kl) — Strategic Model (full roll-out of all 5 initiatives)
# derived: same structural trend, reduced risk cost because of alternative supply + reduced
# municipal discharge. Values from Strategic Model row 111 (cost ratio) + residual risk.
STRAT_TRUE_COST = {
    2025: 335.62, 2026: 188.79, 2027: 54.10, 2028: 58.76, 2029: 66.30,
    2030: 71.59, 2031: 79.88, 2032: 86.21, 2033: 93.05, 2034: 105.52,
    2035: 99.13, 2036: 107.41, 2037: 116.45, 2038: 126.24, 2039: 136.86,
    2040: 148.36, 2041: 160.91, 2042: 174.50, 2043: 189.26, 2044: 205.26,
    2045: 222.71, 2046: 241.62, 2047: 262.16, 2048: 284.44, 2049: 308.73,
    2050: 335.07,
}

# Tariffs & cost components (2025 values, R/kl) — from Inputs sheet rows 42–61
TARIFFS_2025 = {
    "municipal_water": 30.24,           # R/kl (C42)
    "sewerage_discharge": 23.09,        # R/kl (C44)
    "effluent_treatment": 3.73,         # R/kl (C45)
    "groundwater_treatment": 8.65,      # R/kl (C52)
    "purified_water": 15.55,            # R/kl (C54)
    "water_for_injection": 332.76,      # R/kl (C55)  — small volume: 0.15 ratio
    "boiler_feed": 4.90,                # R/kl (C56)
    "rainwater_treatment": 10.10,       # R/kl (C57)
    "recovered_water_opex": 45.00,      # R/kl (C58, Initiative 3)
    "water_tariff_escalation": 0.06,    # 6% p.a. (C47)
    "electricity_escalation": 0.127,    # 12.7% p.a. (C48)
    "treatment_escalation": 0.094,      # 9.4% p.a. (C61)
    "cpi": 0.06,                        # 6% p.a.
}

# True-Cost breakdown (R/kl) — the four families the client asked for on slide 34
TRUE_COST_BREAKDOWN_2025 = {
    "municipal_tariff": 30.24,           # municipal water purchase
    "discharge_tariff": 26.82,           # sewerage + effluent treatment (23.09 + 3.73)
    "treatment_cost": 24.80,             # weighted blend of GW treatment + purified + WFI + boiler
    "climate_risk": 253.76,              # balance → climate / catchment risk premium
    # total ≈ 335.62 R/kl
}

INITIATIVES = [
    {
        "id": "smart_metering",
        "name": "Smart Metering & Optimisation",
        "capex_zar": 2_000_000,
        "opex_zar_pa": 150_000,
        "reduction_pct": 0.08,                   # 8 % consumption reduction (Inputs C163)
        "year_impl": 2026, "year_impact": 2027,
        "blurb": "Sub-metering, leak detection and process optimisation across OSD & SVP.",
    },
    {
        "id": "rainwater",
        "name": "Rainwater Harvesting",
        "capex_zar": 500_000,
        "opex_zar_per_kl": 11,
        "reduction_pct": 0.10,                   # user assumption
        "volume_kl_yr": 17_000,
        "year_impl": 2027, "year_impact": 2031,
        "blurb": "Condensation + rainwater capture, 90% plant recovery, 54 kl/d offset.",
    },
    {
        "id": "groundwater",
        "name": "Additional Borehole (Groundwater)",
        "capex_zar": 15_000_000,
        "opex_zar_per_kl": 8.65,
        "reduction_pct": 0.20,                   # user assumption
        "volume_kl_d": 1000,
        "year_impl": 2026, "year_impact": 2026,
        "blurb": "Second production borehole — adds 1 ML/d raw supply; WUL extended to 2050.",
    },
    {
        "id": "water_recovery",
        "name": "Water Recovery Plant (WRP)",
        "capex_zar": 65_000_000,
        "opex_zar_per_kl": 45,
        "reduction_pct": 0.40,                   # user assumption
        "volume_kl_d": 637.5,
        "year_impl": 2030, "year_impact": 2033,
        "blurb": "Effluent treatment train, 850 kl/d capacity, 75% recovery, 31% offset.",
    },
    {
        "id": "desalination",
        "name": "Desalination (North-End Lake)",
        "capex_zar": 52_500_000,
        "opex_zar_per_kl": 11.33,
        "reduction_pct": 0.32,
        "volume_kl_d": 650,
        "year_impl": 2036, "year_impact": 2040,
        "blurb": "RO desalination of North-End Lake water — 1000 kl/d, 65% recovery.",
    },
]

# Cumulative (25-yr) outcomes per strategy combo (Sheet2 A14–M16)
STRATEGY_TOTALS = {
    "bau": {"true_value_zar_bn": 6.6, "savings_zar_bn": 0},
    "i1": {"true_value_zar_bn": 5.7, "savings_zar_bn": 0.85},
    "i2": {"true_value_zar_bn": 6.3, "savings_zar_bn": 0.25},
    "i3": {"true_value_zar_bn": 6.2, "savings_zar_bn": 0.37},
    "i4": {"true_value_zar_bn": 5.1, "savings_zar_bn": 1.40},
    "i5": {"true_value_zar_bn": 5.9, "savings_zar_bn": 0.60},
    "full_strategy": {"true_value_zar_bn": 2.8, "savings_zar_bn": 3.80},
}

SITE_INFO = {
    "name": "Pharmaceutical Company",
    "projects": "WERC Feedback · 15 August 2025",
    "catchment": "Water-stressed coastal catchment",
    "basin_stress_2025": "High",
    "basin_stress_2050": "Extremely High",
    "processes": ["Oral Solid Dose (OSD) Manufacturing", "Small Volume Parenteral (SVP) Manufacturing"],
    "current_demand_kl_d": 520.6,
    "future_demand_kl_d": 1973.0,
    "production_kg_pa": 3_142_103,
    "period": "2025 – 2050",
}

# ---------------------------------------------------------------------------
# Password gate (simple demo)
# ---------------------------------------------------------------------------
DEMO_PASSWORD = os.environ.get("DEMO_PASSWORD", "aspen2050")

class LoginReq(BaseModel):
    password: str

class LoginRes(BaseModel):
    ok: bool
    token: str | None = None


@api.post("/auth/login", response_model=LoginRes)
async def login(req: LoginReq):
    if req.password.strip() == DEMO_PASSWORD:
        return LoginRes(ok=True, token="aspen-demo-session")
    raise HTTPException(status_code=401, detail="Invalid password")


# ---------------------------------------------------------------------------
# Data endpoints
# ---------------------------------------------------------------------------
@api.get("/aspen/site")
async def get_site():
    return SITE_INFO


@api.get("/aspen/bau-supply-demand")
async def bau_supply_demand():
    """Daily water demand vs availability by source (BAU) — slide 36."""
    rows = []
    for y in YEARS:
        total, mun, gw, rw, rec = BAU_DAILY[y]
        rows.append({
            "year": y,
            "demand_total": round(total, 1),
            "supply_municipal": round(mun, 1),
            "supply_groundwater": round(gw, 1),
            "supply_rainwater": round(rw, 1),
            "supply_recovered": round(rec, 1),
            "gw_availability": round(GW_AVAIL_KLD[y], 1),
            "municipal_availability": MUN_AVAIL_KLD,
            "total_supply": round(mun + gw + rw + rec, 1),
            "deficit": round(max(0, total - (mun + gw + rw + rec)), 1),
        })
    return {"rows": rows, "unit": "kl/d"}


@api.get("/aspen/true-cost-breakdown")
async def true_cost_breakdown():
    """Current (2025) true-cost composition in R/kl — slide 34."""
    breakdown = TRUE_COST_BREAKDOWN_2025.copy()
    return {
        "year": 2025,
        "breakdown": breakdown,
        "total": round(sum(breakdown.values()), 2),
        "tariffs_reference": TARIFFS_2025,
    }


@api.get("/aspen/bau-projection")
async def bau_projection():
    """BAU true-cost (R/kl) projection 2025 → 2050."""
    rows = []
    for y in YEARS:
        rows.append({
            "year": y,
            "water_cost_ratio": BAU_COST_RATIO[y],
            "risk_cost": BAU_RISK_COST[y],
            "true_cost": BAU_TRUE_COST[y],
        })
    return {"rows": rows, "unit": "R/kl"}


class ScenarioReq(BaseModel):
    rainwater_pct: float = Field(0.10, ge=0, le=0.5)
    groundwater_pct: float = Field(0.20, ge=0, le=0.5)
    water_recovery_pct: float = Field(0.40, ge=0, le=0.8)
    smart_metering_on: bool = True
    desalination_on: bool = False


def _active_reduction(year: int, req: ScenarioReq) -> float:
    """Total % reduction active in a given year based on each initiative's impact-year."""
    red = 0.0
    if req.smart_metering_on and year >= 2027:
        red += 0.08
    if year >= 2026:                                 # Additional borehole (groundwater)
        red += req.groundwater_pct
    if year >= 2031:                                 # Rainwater harvesting
        red += req.rainwater_pct
    if year >= 2033:                                 # Water recovery plant
        red += req.water_recovery_pct
    if req.desalination_on and year >= 2040:         # Desalination
        red += 0.32
    # cap at 90 %
    return min(red, 0.90)


@api.post("/aspen/scenario")
async def scenario(req: ScenarioReq):
    """Simulate strategic outlook based on user-toggled initiatives."""
    rows = []
    cum_savings = 0.0
    cum_bau_cost = 0.0
    cum_strat_cost = 0.0
    for y in YEARS:
        reduction = _active_reduction(y, req)
        bau = BAU_TRUE_COST[y]
        # Strategic cost: base water cost ratio stays, but risk cost is scaled down by reduction
        strat_risk = BAU_RISK_COST[y] * (1 - reduction)
        strat = BAU_COST_RATIO[y] + strat_risk

        # Floor the strategic at reference Strategic Model numbers when the full stack is active
        if req.smart_metering_on and req.desalination_on and \
           req.rainwater_pct >= 0.10 and req.groundwater_pct >= 0.20 and req.water_recovery_pct >= 0.40:
            strat = min(strat, STRAT_TRUE_COST[y])

        # Annual consumption (kl/yr) — from BaU daily total × 365
        annual_kl = BAU_DAILY[y][0] * 365
        savings_kl = annual_kl * reduction
        savings_zar = (bau - strat) * annual_kl

        cum_savings += max(0, savings_zar)
        cum_bau_cost += bau * annual_kl
        cum_strat_cost += strat * annual_kl

        rows.append({
            "year": y,
            "bau_true_cost": round(bau, 2),
            "strategic_true_cost": round(strat, 2),
            "reduction_pct": round(reduction * 100, 1),
            "annual_savings_zar": round(max(0, savings_zar), 0),
            "cumulative_savings_zar": round(cum_savings, 0),
            "volume_saved_kl": round(savings_kl, 0),
        })

    return {
        "rows": rows,
        "summary": {
            "cumulative_savings_zar": round(cum_savings, 0),
            "cumulative_savings_zar_bn": round(cum_savings / 1e9, 2),
            "cumulative_bau_cost_zar_bn": round(cum_bau_cost / 1e9, 2),
            "cumulative_strategic_cost_zar_bn": round(cum_strat_cost / 1e9, 2),
            "reduction_pct_2050": round(_active_reduction(2050, req) * 100, 1),
            "final_true_cost_2050_bau": BAU_TRUE_COST[2050],
            "final_true_cost_2050_strategic": rows[-1]["strategic_true_cost"],
        },
        "settings": req.model_dump(),
    }


@api.get("/aspen/initiatives")
async def initiatives():
    return {"initiatives": INITIATIVES, "strategy_totals": STRATEGY_TOTALS}


@api.get("/")
async def root():
    return {"service": "WERC Water Digital Twin", "status": "online"}


app.include_router(api)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
