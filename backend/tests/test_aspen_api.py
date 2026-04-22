"""Aspen Gqeberha Water Digital Twin - backend API tests."""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://aqua-savings-sim.preview.emergentagent.com").rstrip("/")


@pytest.fixture
def client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


# --- Auth gate ---
class TestAuth:
    def test_login_wrong_password(self, client):
        r = client.post(f"{BASE_URL}/api/auth/login", json={"password": "wrong"})
        assert r.status_code == 401

    def test_login_correct_password(self, client):
        r = client.post(f"{BASE_URL}/api/auth/login", json={"password": "aspen2050"})
        assert r.status_code == 200
        data = r.json()
        assert data["ok"] is True
        assert isinstance(data.get("token"), str) and len(data["token"]) > 0


# --- Site ---
class TestSite:
    def test_site_info(self, client):
        r = client.get(f"{BASE_URL}/api/aspen/site")
        assert r.status_code == 200
        d = r.json()
        assert "name" in d and "Aspen" in d["name"]
        assert d["current_demand_kl_d"] == 520.6
        assert d["future_demand_kl_d"] == 1973.0
        assert isinstance(d.get("processes"), list) and len(d["processes"]) >= 2


# --- BAU supply/demand ---
class TestBau:
    def test_supply_demand(self, client):
        r = client.get(f"{BASE_URL}/api/aspen/bau-supply-demand")
        assert r.status_code == 200
        d = r.json()
        rows = d["rows"]
        assert len(rows) == 26  # 2025..2050
        row0 = rows[0]
        for k in ["year", "supply_municipal", "supply_groundwater", "demand_total"]:
            assert k in row0
        assert rows[0]["year"] == 2025
        assert rows[-1]["year"] == 2050
        assert rows[0]["demand_total"] == 520.6

    def test_bau_projection(self, client):
        r = client.get(f"{BASE_URL}/api/aspen/bau-projection")
        assert r.status_code == 200
        d = r.json()
        rows = d["rows"]
        assert len(rows) == 26
        for k in ["year", "water_cost_ratio", "risk_cost", "true_cost"]:
            assert k in rows[0]
        # model validation: 2025 ~335, 2050 ~753
        assert abs(rows[0]["true_cost"] - 335.62) < 0.1
        assert abs(rows[-1]["true_cost"] - 753.46) < 0.5


# --- True cost breakdown ---
class TestTrueCost:
    def test_breakdown(self, client):
        r = client.get(f"{BASE_URL}/api/aspen/true-cost-breakdown")
        assert r.status_code == 200
        d = r.json()
        b = d["breakdown"]
        for k in ["municipal_tariff", "discharge_tariff", "treatment_cost", "climate_risk"]:
            assert k in b
        total = sum(b.values())
        assert abs(total - 335.62) < 1.0
        assert abs(d["total"] - total) < 0.1


# --- Scenario simulator ---
class TestScenario:
    def test_default_scenario(self, client):
        payload = {
            "rainwater_pct": 0.10,
            "groundwater_pct": 0.20,
            "water_recovery_pct": 0.40,
            "smart_metering_on": True,
            "desalination_on": False,
        }
        r = client.post(f"{BASE_URL}/api/aspen/scenario", json=payload)
        assert r.status_code == 200
        d = r.json()
        rows = d["rows"]
        summary = d["summary"]
        assert len(rows) == 26
        # cumulative savings > 1bn
        assert summary["cumulative_savings_zar"] > 1_000_000_000
        # expected 2.5-3bn range per requirement (defaults, no desal)
        assert summary["cumulative_savings_zar_bn"] > 1.0
        # row check
        r2050 = rows[-1]
        assert r2050["year"] == 2050
        assert r2050["bau_true_cost"] > r2050["strategic_true_cost"]

    def test_increased_rainwater_increases_savings(self, client):
        base = {
            "rainwater_pct": 0.10, "groundwater_pct": 0.20,
            "water_recovery_pct": 0.40, "smart_metering_on": True, "desalination_on": False,
        }
        high = {**base, "rainwater_pct": 0.25}
        s1 = client.post(f"{BASE_URL}/api/aspen/scenario", json=base).json()["summary"]["cumulative_savings_zar"]
        s2 = client.post(f"{BASE_URL}/api/aspen/scenario", json=high).json()["summary"]["cumulative_savings_zar"]
        assert s2 > s1


# --- Initiatives ---
class TestInitiatives:
    def test_initiatives(self, client):
        r = client.get(f"{BASE_URL}/api/aspen/initiatives")
        assert r.status_code == 200
        d = r.json()
        ids = {i["id"] for i in d["initiatives"]}
        assert ids == {"smart_metering", "rainwater", "groundwater", "water_recovery", "desalination"}
        assert len(d["initiatives"]) == 5
