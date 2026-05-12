"""
Backend tests for the WERC Aspen Scenario endpoint - covers the four new
assumption inputs added to ScenarioReq:
  wur_kl_per_kg, max_production_kt, tariff_escalation, treatment_escalation
"""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/") or \
           "https://aqua-savings-sim.preview.emergentagent.com"
SCENARIO_URL = f"{BASE_URL}/api/aspen/scenario"


def _post(payload):
    return requests.post(SCENARIO_URL, json=payload, timeout=30)


# -- Auth ----------------------------------------------------------------------
def test_login_success():
    r = requests.post(f"{BASE_URL}/api/auth/login", json={"password": "aspen2050"}, timeout=15)
    assert r.status_code == 200
    data = r.json()
    assert data["ok"] is True
    assert data["token"]


def test_login_failure():
    r = requests.post(f"{BASE_URL}/api/auth/login", json={"password": "wrong"}, timeout=15)
    assert r.status_code == 401


# -- Defaults ------------------------------------------------------------------
def test_scenario_defaults_full_strategy():
    """Pure defaults should give ~R1.19 bn cumulative savings, BAU 2050 ~778, Strategic 2050 ~467."""
    r = _post({})
    assert r.status_code == 200
    data = r.json()
    s = data["summary"]

    # Cumulative savings around R 1.19bn (allow ±25% tolerance for any rounding)
    cum_bn = s["cumulative_savings_zar_bn"]
    assert 0.8 <= cum_bn <= 1.6, f"cumulative_savings_zar_bn={cum_bn}, expected ~1.19"

    # 2050 BAU ~778 R/kl
    assert 700 <= s["final_true_cost_2050_bau"] <= 850
    # 2050 Strategic ~467 R/kl
    assert 400 <= s["final_true_cost_2050_strategic"] <= 520

    # Settings echoed back
    settings = data["settings"]
    assert settings["wur_kl_per_kg"] == 0.064
    assert settings["max_production_kt"] == 5.1
    assert settings["tariff_escalation"] == 0.06
    assert abs(settings["treatment_escalation"] - 0.0936) < 1e-6


# -- WUR multiplier wired through ---------------------------------------------
def test_scenario_high_wur_increases_savings():
    """WUR=0.5 (≈8× default) should drive cumulative savings ≥ R 5bn (cap kicks in)."""
    r = _post({
        "rainwater_pct": 0.10,
        "groundwater_pct": 0.20,
        "water_recovery_pct": 0.40,
        "smart_metering_on": True,
        "desalination_on": True,
        "wur_kl_per_kg": 0.5,
        "max_production_kt": 5.1,
    })
    assert r.status_code == 200
    data = r.json()
    cum_bn = data["summary"]["cumulative_savings_zar_bn"]
    assert cum_bn >= 5.0, f"cumulative_savings_zar_bn={cum_bn}, expected >= 5 bn"


# -- Tariff escalation = 0 lowers BAU 2050 -------------------------------------
def test_scenario_zero_tariff_escalation_lowers_bau_cost_ratio():
    base = _post({}).json()
    flat = _post({"tariff_escalation": 0.0}).json()
    assert flat["rows"][-1]["bau_true_cost"] < base["rows"][-1]["bau_true_cost"]
    # The cost-ratio component should be much lower under flat tariffs
    # We can compare via summary's final_true_cost_2050_bau as a proxy
    assert flat["summary"]["final_true_cost_2050_bau"] < base["summary"]["final_true_cost_2050_bau"]


# -- High treatment escalation raises BAU 2050 true-cost -----------------------
def test_scenario_high_treatment_escalation_raises_bau_2050():
    base = _post({}).json()
    high = _post({"treatment_escalation": 0.20}).json()
    assert high["rows"][-1]["bau_true_cost"] > base["rows"][-1]["bau_true_cost"]
    assert high["summary"]["final_true_cost_2050_bau"] > base["summary"]["final_true_cost_2050_bau"]


# -- Validation ----------------------------------------------------------------
def test_scenario_validation_out_of_bounds():
    """tariff_escalation > 0.15 should 422."""
    r = _post({"tariff_escalation": 0.5})
    assert r.status_code == 422

    r = _post({"wur_kl_per_kg": 5.0})
    assert r.status_code == 422


# -- Row schema sanity ---------------------------------------------------------
def test_scenario_rows_schema():
    r = _post({})
    assert r.status_code == 200
    rows = r.json()["rows"]
    assert len(rows) == 26  # 2025..2050 inclusive
    for row in rows[:3]:
        for k in ("year", "bau_true_cost", "strategic_true_cost",
                  "reduction_pct", "annual_savings_zar",
                  "cumulative_savings_zar", "annual_consumption_kl"):
            assert k in row
