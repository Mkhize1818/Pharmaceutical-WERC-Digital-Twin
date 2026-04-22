import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
    AreaChart, Area, LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    ReferenceLine, ComposedChart,
} from "recharts";
import {
    Droplets, Gauge, TrendingDown, TrendingUp, Shield, Building2,
    Factory, ArrowRight, Waves, Sun, Recycle, Wrench, LockKeyhole,
    LogOut, AlertTriangle, CheckCircle2, BarChart3,
} from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const zar = (n, dp = 1) => {
    if (!isFinite(n)) return "–";
    if (Math.abs(n) >= 1e9) return `R ${(n / 1e9).toFixed(dp)} bn`;
    if (Math.abs(n) >= 1e6) return `R ${(n / 1e6).toFixed(dp)} m`;
    if (Math.abs(n) >= 1e3) return `R ${(n / 1e3).toFixed(0)} k`;
    return `R ${n.toFixed(0)}`;
};
const n0 = (n) => isFinite(n) ? Math.round(n).toLocaleString("en-ZA") : "–";
const n1 = (n) => isFinite(n) ? n.toFixed(1) : "–";

// ---------------------------------------------------------------------------
// PASSWORD GATE
// ---------------------------------------------------------------------------
const Gate = ({ onUnlock }) => {
    const [pwd, setPwd] = useState("");
    const [err, setErr] = useState("");
    const [loading, setLoading] = useState(false);

    const submit = async (e) => {
        e.preventDefault();
        setLoading(true); setErr("");
        try {
            const r = await axios.post(`${API}/auth/login`, { password: pwd });
            if (r.data.ok) {
                localStorage.setItem("aspen_token", r.data.token);
                onUnlock();
            }
        } catch {
            setErr("Invalid password. Please contact your WERC facilitator.");
        } finally { setLoading(false); }
    };

    return (
        <div className="min-h-screen hero-gradient flex items-center justify-center px-6" data-testid="password-gate">
            <div className="max-w-md w-full">
                <div className="mb-10 fade-up">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-[var(--aspen-green)] flex items-center justify-center">
                            <Droplets className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <div className="text-[11px] uppercase tracking-[0.2em] text-slate-500">WERC Digital Twin</div>
                            <div className="font-display text-xl font-semibold">Aspen Gqeberha</div>
                        </div>
                    </div>
                    <h1 className="font-display text-4xl font-medium leading-tight mb-3">
                        Water risk, <span className="italic text-[var(--aspen-green)]">quantified.</span>
                    </h1>
                    <p className="text-slate-600 text-sm leading-relaxed">
                        A live scenario model for Aspen SA Operations (Port Elizabeth), built from the WERC
                        feedback study of 15&nbsp;August&nbsp;2025. Explore business-as-usual exposure and run
                        strategic interventions from 2025 to 2050.
                    </p>
                </div>

                <form onSubmit={submit} className="card p-6 fade-up-delay-1" data-testid="login-form">
                    <label className="metric-label flex items-center gap-2 mb-2">
                        <LockKeyhole className="w-3.5 h-3.5" /> Demo access passphrase
                    </label>
                    <input
                        data-testid="password-input"
                        type="password"
                        autoFocus
                        value={pwd}
                        onChange={(e) => setPwd(e.target.value)}
                        placeholder="••••••••"
                        className="w-full px-4 py-3 border border-[#e8e8e1] rounded-lg text-base focus:outline-none focus:border-[var(--aspen-green)] focus:ring-2 focus:ring-[var(--aspen-green)]/20"
                    />
                    {err && (
                        <div className="mt-3 text-sm text-[var(--danger)] flex items-center gap-2" data-testid="login-error">
                            <AlertTriangle className="w-4 h-4" /> {err}
                        </div>
                    )}
                    <button
                        data-testid="login-submit"
                        type="submit"
                        disabled={loading || !pwd}
                        className="btn-primary w-full mt-4 flex items-center justify-center gap-2"
                    >
                        {loading ? "Verifying…" : <>Enter Digital Twin <ArrowRight className="w-4 h-4" /></>}
                    </button>
                    <div className="text-[11px] text-slate-400 mt-3 text-center">
                        Confidential · Prepared for Aspen Pharmacare · DWFM &times; KfW-IPEX
                    </div>
                </form>
            </div>
        </div>
    );
};

// ---------------------------------------------------------------------------
// METRIC CARD
// ---------------------------------------------------------------------------
const Metric = ({ label, value, unit, tone = "default", icon: Icon, delta, testId }) => (
    <div className="card p-5" data-testid={testId}>
        <div className="flex items-start justify-between">
            <div className="metric-label">{label}</div>
            {Icon && (
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    tone === "danger" ? "bg-red-50 text-red-600"
                    : tone === "warn" ? "bg-amber-50 text-amber-600"
                    : tone === "ok" ? "bg-emerald-50 text-[var(--aspen-green)]"
                    : "bg-cyan-50 text-[var(--water-blue-deep)]"
                }`}>
                    <Icon className="w-4 h-4" />
                </div>
            )}
        </div>
        <div className="mt-3 flex items-baseline gap-2">
            <div className="metric-value">{value}</div>
            {unit && <div className="text-slate-500 text-sm font-medium">{unit}</div>}
        </div>
        {delta && <div className="text-xs text-slate-500 mt-1">{delta}</div>}
    </div>
);

// ---------------------------------------------------------------------------
// OVERVIEW TAB
// ---------------------------------------------------------------------------
const Overview = ({ site, bau, tc, onGoTo }) => {
    if (!site || !bau || !tc) return null;
    const r2025 = bau.rows.find(r => r.year === 2025);
    const r2050 = bau.rows.find(r => r.year === 2050);

    return (
        <div className="space-y-8" data-testid="overview-tab">
            {/* Hero */}
            <div className="card-dark p-8 md:p-10 fade-up" data-testid="overview-hero">
                <div className="flex flex-wrap items-start justify-between gap-6">
                    <div className="max-w-2xl">
                        <div className="flex items-center gap-2 mb-3">
                            <span className="chip" style={{ background: "rgba(255,255,255,0.12)", color: "#a7f3d0" }}>
                                WERC · 1002727 · 15 Aug 2025
                            </span>
                            <span className="chip chip-warn">Water-stressed Catchment</span>
                        </div>
                        <h2 className="font-display text-3xl md:text-4xl font-medium leading-tight">
                            {site.name}
                        </h2>
                        <p className="text-emerald-100/80 mt-3 text-sm md:text-base leading-relaxed">
                            Sondags (Sundays) Catchment &middot; Mzimbvubu-Tsitsikamma WMA.
                            Basin water stress is projected to rise from <b>High</b> today to
                            <b className="text-white"> Extremely High</b> by 2050.
                            This twin models the real cost & risk of every litre of water used on-site.
                        </p>
                    </div>
                    <div className="flex gap-6 text-right">
                        <div>
                            <div className="text-[11px] uppercase tracking-widest text-emerald-200/70">Today demand</div>
                            <div className="font-display text-3xl">{n1(site.current_demand_kl_d)}</div>
                            <div className="text-xs text-emerald-100/60">kl / day</div>
                        </div>
                        <div>
                            <div className="text-[11px] uppercase tracking-widest text-emerald-200/70">2050 demand</div>
                            <div className="font-display text-3xl text-[var(--aspen-lime)]">{n1(site.future_demand_kl_d)}</div>
                            <div className="text-xs text-emerald-100/60">kl / day (+279%)</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* KPI strip */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 fade-up-delay-1">
                <Metric testId="kpi-tcw-2025" label="True Cost of Water · 2025" value={n1(r2025.true_cost)} unit="R/kl" icon={Gauge} tone="default" />
                <Metric testId="kpi-tcw-2050" label="BAU True Cost · 2050" value={n1(r2050.true_cost)} unit="R/kl" icon={TrendingUp} tone="danger" delta={`+${Math.round((r2050.true_cost/r2025.true_cost-1)*100)}% vs 2025`} />
                <Metric testId="kpi-mun-share" label="Municipal dependency 2025" value="70%" unit="" icon={Building2} tone="warn" delta="Drops to 0% post-2026 (2× BH)" />
                <Metric testId="kpi-savings" label="Full-strategy cumulative savings" value="R 3.8" unit="bn" icon={Shield} tone="ok" delta="BaU R 6.6 bn → Strategic R 2.8 bn" />
            </div>

            {/* Process + Risk split */}
            <div className="grid md:grid-cols-3 gap-6 fade-up-delay-2">
                <div className="card p-6 md:col-span-2">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <div className="metric-label">Site processes</div>
                            <h3 className="font-display text-xl font-medium mt-1">Pharmaceutical manufacturing</h3>
                        </div>
                        <Factory className="w-6 h-6 text-[var(--aspen-green)]" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        {site.processes.map((p, i) => (
                            <div key={i} className="border border-[#e8e8e1] rounded-lg p-4">
                                <div className="metric-label text-[10px]">{i === 0 ? "76% of output" : "24% of output"}</div>
                                <div className="font-medium mt-1">{p}</div>
                            </div>
                        ))}
                    </div>
                    <div className="mt-5 text-sm text-slate-600 leading-relaxed">
                        Production pipeline includes NH<sub>3</sub> condensation (+827 kl/d), SVP3 expansion (+33%)
                        and WTP upgrade (75% recovery). Annual production today: <b>{n0(site.production_kg_pa)} kg</b>.
                    </div>
                </div>

                <div className="card p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="metric-label">Key catchment risks</div>
                        <Shield className="w-5 h-5 text-[var(--water-blue-deep)]" />
                    </div>
                    <div className="space-y-3 text-sm">
                        {[
                            ["Baseline water stress", "High", "chip-warn"],
                            ["Inter-annual variability", "High", "chip-warn"],
                            ["Riverine flood risk", "High", "chip-danger"],
                            ["Coastal eutrophication", "High", "chip-warn"],
                            ["Groundwater quality", "Good", ""],
                        ].map(([k, v, cls]) => (
                            <div key={k} className="flex justify-between items-center">
                                <span className="text-slate-600">{k}</span>
                                <span className={`chip ${cls}`}>{v}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* CTA rail */}
            <div className="grid md:grid-cols-3 gap-4 fade-up-delay-3">
                {[
                    { k: "bau", label: "Explore BAU demand vs supply", icon: BarChart3, copy: "Daily water supply/demand by source, 2025 – 2050." },
                    { k: "simulator", label: "Run the strategic simulator", icon: Wrench, copy: "Tune rainwater, groundwater & recovery assumptions." },
                    { k: "savings", label: "View cumulative savings", icon: TrendingDown, copy: "Year-on-year savings trajectory." },
                ].map(({ k, label, icon: Ic, copy }) => (
                    <button key={k} onClick={() => onGoTo(k)} className="card p-5 text-left group" data-testid={`cta-${k}`}>
                        <div className="flex items-center justify-between mb-3">
                            <Ic className="w-5 h-5 text-[var(--aspen-green)]" />
                            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-[var(--aspen-green)] group-hover:translate-x-1 transition-transform" />
                        </div>
                        <div className="font-medium">{label}</div>
                        <div className="text-sm text-slate-500 mt-1">{copy}</div>
                    </button>
                ))}
            </div>
        </div>
    );
};

// ---------------------------------------------------------------------------
// BAU TAB — Supply vs Demand (slide 36)
// ---------------------------------------------------------------------------
const BauTab = ({ bau }) => {
    if (!bau) return null;
    const data = bau.rows;
    return (
        <div className="space-y-6 fade-up" data-testid="bau-tab">
            <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                    <span className="chip chip-warn mb-2">Business as Usual · Scenario 4</span>
                    <h2 className="font-display text-3xl font-medium mt-2">Daily water demand vs availability</h2>
                    <p className="text-slate-600 max-w-2xl mt-2 text-sm">
                        Consumption stacked by source against total demand. Municipal reliance ends with the second
                        borehole in 2026; groundwater carries the site until WUL renewal in 2050.
                    </p>
                </div>
                <div className="text-right">
                    <div className="metric-label">Model period</div>
                    <div className="font-display text-2xl">2025 &ndash; 2050</div>
                </div>
            </div>

            <div className="card p-6" data-testid="bau-chart">
                <ResponsiveContainer width="100%" height={440}>
                    <ComposedChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                        <defs>
                            <linearGradient id="gMun" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#0891b2" stopOpacity={0.95} />
                                <stop offset="100%" stopColor="#0891b2" stopOpacity={0.75} />
                            </linearGradient>
                            <linearGradient id="gGw" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#006838" stopOpacity={0.95} />
                                <stop offset="100%" stopColor="#006838" stopOpacity={0.7} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="year" tickLine={false} axisLine={{ stroke: "#cbd5e1" }} />
                        <YAxis tickLine={false} axisLine={false} label={{ value: "kl/day", angle: -90, position: "insideLeft", fill: "#64748b", fontSize: 12 }} />
                        <Tooltip formatter={(v) => `${Number(v).toFixed(0)} kl/d`} />
                        <Legend iconType="circle" wrapperStyle={{ paddingTop: 8 }} />
                        <Bar dataKey="supply_municipal" name="Municipal" stackId="a" fill="url(#gMun)" />
                        <Bar dataKey="supply_groundwater" name="Groundwater" stackId="a" fill="url(#gGw)" />
                        <Bar dataKey="supply_rainwater" name="Rainwater" stackId="a" fill="#8dc63f" />
                        <Bar dataKey="supply_recovered" name="Recovered" stackId="a" fill="#a16207" />
                        <Line type="monotone" dataKey="demand_total" name="Total demand" stroke="#0b1f18" strokeWidth={2.5} dot={{ r: 2 }} />
                        <Line type="monotone" dataKey="gw_availability" name="GW availability" stroke="#b91c1c" strokeDasharray="5 4" strokeWidth={1.5} dot={false} />
                        <ReferenceLine x={2026} stroke="#94a3b8" strokeDasharray="2 4" label={{ value: "2nd BH + NH₃", position: "top", fill: "#64748b", fontSize: 11 }} />
                        <ReferenceLine x={2029} stroke="#94a3b8" strokeDasharray="2 4" label={{ value: "SVP3", position: "top", fill: "#64748b", fontSize: 11 }} />
                    </ComposedChart>
                </ResponsiveContainer>
            </div>

            <div className="grid md:grid-cols-4 gap-4">
                <Metric testId="bau-2025-demand" label="2025 daily demand" value={n1(data[0].demand_total)} unit="kl/d" icon={Droplets} />
                <Metric testId="bau-2050-demand" label="2050 daily demand" value={n1(data[data.length-1].demand_total)} unit="kl/d" icon={TrendingUp} tone="warn" />
                <Metric testId="bau-mun-today" label="2025 Municipal share" value="70%" unit="" icon={Building2} tone="warn" />
                <Metric testId="bau-gw-2050" label="2050 Groundwater share" value="89%" unit="" icon={Waves} tone="ok" />
            </div>
        </div>
    );
};

// ---------------------------------------------------------------------------
// TRUE COST TAB
// ---------------------------------------------------------------------------
const TrueCostTab = ({ tc, projection }) => {
    if (!tc || !projection) return null;
    const pieData = [
        { name: "Municipal tariff", value: tc.breakdown.municipal_tariff, colour: "#0891b2" },
        { name: "Discharge tariff", value: tc.breakdown.discharge_tariff, colour: "#7c3aed" },
        { name: "Treatment cost", value: tc.breakdown.treatment_cost, colour: "#006838" },
        { name: "Climate risk premium", value: tc.breakdown.climate_risk, colour: "#b91c1c" },
    ];
    const total = tc.total;

    return (
        <div className="space-y-6 fade-up" data-testid="truecost-tab">
            <div>
                <span className="chip chip-blue">Current state · 2025</span>
                <h2 className="font-display text-3xl font-medium mt-2">True cost of water</h2>
                <p className="text-slate-600 max-w-3xl mt-2 text-sm">
                    The real cost per kilolitre blends municipal tariffs, discharge and treatment costs
                    with an adjusted climate-risk premium reflecting Day-Zero exposure in the Sondags catchment.
                </p>
            </div>

            <div className="grid lg:grid-cols-5 gap-6">
                <div className="card p-6 lg:col-span-3" data-testid="truecost-chart">
                    <div className="flex items-center justify-between mb-4">
                        <div className="metric-label">Composition · R/kl</div>
                        <div className="font-display text-3xl">
                            <span className="text-[var(--aspen-green)]">R {total.toFixed(0)}</span>
                            <span className="text-slate-400 text-base font-sans ml-2">per kl</span>
                        </div>
                    </div>
                    <ResponsiveContainer width="100%" height={320}>
                        <PieChart>
                            <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={70} outerRadius={130} paddingAngle={2}>
                                {pieData.map((e, i) => <Cell key={i} fill={e.colour} />)}
                            </Pie>
                            <Tooltip formatter={(v) => `R ${Number(v).toFixed(2)}/kl`} />
                            <Legend iconType="circle" />
                        </PieChart>
                    </ResponsiveContainer>
                </div>

                <div className="space-y-3 lg:col-span-2">
                    {pieData.map((d) => {
                        const pct = (d.value / total) * 100;
                        return (
                            <div key={d.name} className="card p-4" data-testid={`tc-${d.name.replace(/\s+/g,'-').toLowerCase()}`}>
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-3">
                                        <span className="droplet" style={{ background: d.colour }} />
                                        <div>
                                            <div className="font-medium">{d.name}</div>
                                            <div className="text-xs text-slate-500">{pct.toFixed(1)}% of true cost</div>
                                        </div>
                                    </div>
                                    <div className="font-display text-2xl">R {d.value.toFixed(1)}</div>
                                </div>
                                <div className="h-1 bg-slate-100 rounded-full mt-3 overflow-hidden">
                                    <div className="h-full" style={{ width: `${pct}%`, background: d.colour }} />
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Tariff table */}
            <div className="card p-6" data-testid="tariff-table">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-display text-xl font-medium">Underlying tariffs &amp; escalation (2025)</h3>
                    <span className="chip">Source · Aspen Model v6 · Inputs</span>
                </div>
                <div className="grid md:grid-cols-3 gap-4 text-sm">
                    {[
                        ["Municipal water", tc.tariffs_reference.municipal_water, "R/kl", "+6% p.a."],
                        ["Sewerage discharge", tc.tariffs_reference.sewerage_discharge, "R/kl", "+6% p.a."],
                        ["Effluent treatment", tc.tariffs_reference.effluent_treatment, "R/kl", "+6% p.a."],
                        ["Groundwater treatment", tc.tariffs_reference.groundwater_treatment, "R/kl", "+9.4% p.a."],
                        ["Purified water", tc.tariffs_reference.purified_water, "R/kl", "+9.4% p.a."],
                        ["Water for injection", tc.tariffs_reference.water_for_injection, "R/kl", "+7.9% p.a."],
                    ].map(([k, v, u, esc]) => (
                        <div key={k} className="border border-[#e8e8e1] rounded-lg p-4">
                            <div className="metric-label text-[10px]">{k}</div>
                            <div className="mt-1 font-display text-xl">R {v.toFixed(2)} <span className="text-xs text-slate-500 font-sans">{u}</span></div>
                            <div className="text-xs text-slate-500 mt-1">{esc}</div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

// ---------------------------------------------------------------------------
// SIMULATOR TAB
// ---------------------------------------------------------------------------
const SimulatorTab = ({ initiatives, onResult }) => {
    const [rw, setRw] = useState(10);
    const [gw, setGw] = useState(20);
    const [wr, setWr] = useState(40);
    const [sm, setSm] = useState(true);
    const [desal, setDesal] = useState(false);
    const [scenario, setScenario] = useState(null);
    const [loading, setLoading] = useState(false);

    const run = async () => {
        setLoading(true);
        try {
            const r = await axios.post(`${API}/aspen/scenario`, {
                rainwater_pct: rw/100,
                groundwater_pct: gw/100,
                water_recovery_pct: wr/100,
                smart_metering_on: sm,
                desalination_on: desal,
            });
            setScenario(r.data);
            onResult(r.data);
        } finally { setLoading(false); }
    };

    useEffect(() => { run(); /* eslint-disable-next-line */ }, []);
    useEffect(() => { const t = setTimeout(run, 250); return () => clearTimeout(t); /* eslint-disable-next-line */ }, [rw, gw, wr, sm, desal]);

    const sliderStyle = (v, max = 50) => ({ "--pct": `${(v/max)*100}%` });

    return (
        <div className="space-y-6 fade-up" data-testid="simulator-tab">
            <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                    <span className="chip">Strategic outlook simulator</span>
                    <h2 className="font-display text-3xl font-medium mt-2">Design your water strategy</h2>
                    <p className="text-slate-600 max-w-2xl mt-2 text-sm">
                        Adjust each intervention to reduce incoming municipal volume.
                        The twin recomputes true cost, risk exposure and cumulative savings instantly.
                    </p>
                </div>
                {scenario && (
                    <div className="card-dark px-6 py-4 text-right" data-testid="scenario-summary-pill">
                        <div className="text-[10px] uppercase tracking-widest text-emerald-200/70">Cumulative savings 2025–2050</div>
                        <div className="font-display text-3xl text-[var(--aspen-lime)]">{zar(scenario.summary.cumulative_savings_zar, 2)}</div>
                        <div className="text-xs text-emerald-100/70">vs BaU R {scenario.summary.cumulative_bau_cost_zar_bn.toFixed(1)} bn</div>
                    </div>
                )}
            </div>

            <div className="grid lg:grid-cols-3 gap-6">
                {/* Controls */}
                <div className="space-y-4">
                    {[
                        { id: "rw", label: "Rainwater harvesting", desc: "Condensation + roof capture · 54 kl/d offset", icon: Sun, v: rw, set: setRw, max: 30, colour: "#8dc63f", assumption: "Client assumption: 10%" },
                        { id: "gw", label: "Additional groundwater", desc: "2× borehole, WUL extended to 2050", icon: Waves, v: gw, set: setGw, max: 50, colour: "#006838", assumption: "Client assumption: 20%" },
                        { id: "wr", label: "Water recovery plant", desc: "Effluent reuse, 75% recovery · 637 kl/d offset", icon: Recycle, v: wr, set: setWr, max: 70, colour: "#0891b2", assumption: "Client assumption: 40%" },
                    ].map(({ id, label, desc, icon: Ic, v, set, max, colour, assumption }) => (
                        <div key={id} className="card p-5" data-testid={`slider-card-${id}`}>
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: `${colour}15` }}>
                                        <Ic className="w-4 h-4" style={{ color: colour }} />
                                    </div>
                                    <div>
                                        <div className="font-medium">{label}</div>
                                        <div className="text-xs text-slate-500">{desc}</div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="font-display text-2xl" style={{ color: colour }}>{v}<span className="text-sm font-sans text-slate-400">%</span></div>
                                </div>
                            </div>
                            <input
                                data-testid={`slider-${id}`}
                                type="range"
                                min={0} max={max} value={v}
                                onChange={(e) => set(parseInt(e.target.value))}
                                style={sliderStyle(v, max)}
                                className="mt-4"
                            />
                            <div className="text-[11px] text-slate-400 mt-2">{assumption}</div>
                        </div>
                    ))}

                    <div className="card p-5 space-y-3" data-testid="toggles-card">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="font-medium flex items-center gap-2"><Wrench className="w-4 h-4 text-[var(--aspen-green)]" /> Smart metering &amp; optimisation</div>
                                <div className="text-xs text-slate-500">8% consumption reduction from 2027</div>
                            </div>
                            <label className="switch">
                                <input data-testid="toggle-smart-metering" type="checkbox" checked={sm} onChange={(e) => setSm(e.target.checked)} />
                                <span className="track" />
                            </label>
                        </div>
                        <div className="flex items-center justify-between pt-3 border-t border-[#e8e8e1]">
                            <div>
                                <div className="font-medium flex items-center gap-2"><Droplets className="w-4 h-4 text-[var(--water-blue-deep)]" /> Desalination (North-End Lake)</div>
                                <div className="text-xs text-slate-500">R52.5m CAPEX · 1000 kl/d · adds 32% from 2040</div>
                            </div>
                            <label className="switch">
                                <input data-testid="toggle-desalination" type="checkbox" checked={desal} onChange={(e) => setDesal(e.target.checked)} />
                                <span className="track" />
                            </label>
                        </div>
                    </div>
                </div>

                {/* Projection + outcomes */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="card p-6" data-testid="projection-chart">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <div className="metric-label">True cost of water · R/kl</div>
                                <h3 className="font-display text-xl font-medium mt-1">BaU vs Strategic · 2025–2050</h3>
                            </div>
                            {scenario && (
                                <div className="text-right text-sm">
                                    <div className="text-slate-500">2050 reduction</div>
                                    <div className="font-display text-2xl text-[var(--aspen-green)]">
                                        {((1 - scenario.summary.final_true_cost_2050_strategic / scenario.summary.final_true_cost_2050_bau) * 100).toFixed(0)}%
                                    </div>
                                </div>
                            )}
                        </div>
                        {scenario && (
                            <ResponsiveContainer width="100%" height={320}>
                                <AreaChart data={scenario.rows} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="bauFill" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#b91c1c" stopOpacity={0.35} />
                                            <stop offset="100%" stopColor="#b91c1c" stopOpacity={0.02} />
                                        </linearGradient>
                                        <linearGradient id="stratFill" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#006838" stopOpacity={0.35} />
                                            <stop offset="100%" stopColor="#006838" stopOpacity={0.02} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="year" tickLine={false} />
                                    <YAxis tickLine={false} axisLine={false} />
                                    <Tooltip formatter={(v) => `R ${Number(v).toFixed(0)}/kl`} />
                                    <Legend iconType="circle" />
                                    <Area type="monotone" dataKey="bau_true_cost" name="Business as Usual" stroke="#b91c1c" fill="url(#bauFill)" strokeWidth={2} />
                                    <Area type="monotone" dataKey="strategic_true_cost" name="Strategic" stroke="#006838" fill="url(#stratFill)" strokeWidth={2} />
                                </AreaChart>
                            </ResponsiveContainer>
                        )}
                    </div>

                    {scenario && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <Metric testId="sim-red-2050" label="Volume reduction · 2050" value={`${scenario.summary.reduction_pct_2050}%`} unit="" icon={TrendingDown} tone="ok" />
                            <Metric testId="sim-tcw-2050" label="Strategic true cost · 2050" value={n1(scenario.summary.final_true_cost_2050_strategic)} unit="R/kl" icon={Gauge} tone="ok" delta={`BaU: R ${n1(scenario.summary.final_true_cost_2050_bau)}/kl`} />
                            <Metric testId="sim-bau-total" label="BaU 25-yr cost" value={zar(scenario.summary.cumulative_bau_cost_zar_bn*1e9, 1)} unit="" icon={AlertTriangle} tone="warn" />
                            <Metric testId="sim-savings" label="Cumulative savings" value={zar(scenario.summary.cumulative_savings_zar, 2)} unit="" icon={CheckCircle2} tone="ok" />
                        </div>
                    )}
                </div>
            </div>

            {/* Initiatives */}
            {initiatives && (
                <div className="card p-6" data-testid="initiatives-detail">
                    <h3 className="font-display text-xl font-medium mb-4">Initiative detail · CAPEX &amp; impact</h3>
                    <div className="grid md:grid-cols-3 lg:grid-cols-5 gap-4 text-sm">
                        {initiatives.map(i => (
                            <div key={i.id} className="border border-[#e8e8e1] rounded-lg p-4">
                                <div className="metric-label text-[10px]">Initiative</div>
                                <div className="font-medium mt-1 leading-tight">{i.name}</div>
                                <div className="mt-3 text-xs text-slate-500">CAPEX</div>
                                <div className="font-display text-lg">{zar(i.capex_zar, 1)}</div>
                                <div className="text-xs text-slate-500 mt-2">Impact year</div>
                                <div>{i.year_impact}</div>
                                <div className="text-xs text-slate-600 mt-3 leading-snug">{i.blurb}</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

// ---------------------------------------------------------------------------
// SAVINGS TAB
// ---------------------------------------------------------------------------
const SavingsTab = ({ scenario }) => {
    if (!scenario) return (<div className="card p-10 text-center text-slate-500" data-testid="savings-empty">Run the simulator first to see cumulative savings.</div>);
    return (
        <div className="space-y-6 fade-up" data-testid="savings-tab">
            <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                    <span className="chip" style={{ background: "rgba(141,198,63,0.15)", color: "#4d7c0f" }}>Financial outcome</span>
                    <h2 className="font-display text-3xl font-medium mt-2">Cumulative savings</h2>
                    <p className="text-slate-600 max-w-2xl mt-2 text-sm">
                        Year-on-year savings accrue as each initiative comes online.
                        Hover the chart for any year to see the exact figure.
                    </p>
                </div>
                <div className="card-dark px-6 py-4 text-right">
                    <div className="text-[10px] uppercase tracking-widest text-emerald-200/70">25-yr savings</div>
                    <div className="font-display text-4xl text-[var(--aspen-lime)]">{zar(scenario.summary.cumulative_savings_zar, 2)}</div>
                </div>
            </div>

            <div className="card p-6" data-testid="savings-chart">
                <ResponsiveContainer width="100%" height={420}>
                    <ComposedChart data={scenario.rows} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                        <defs>
                            <linearGradient id="cumFill" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#006838" stopOpacity={0.45} />
                                <stop offset="100%" stopColor="#006838" stopOpacity={0.02} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="year" tickLine={false} />
                        <YAxis yAxisId="l" tickLine={false} axisLine={false} tickFormatter={(v) => zar(v, 0)} />
                        <YAxis yAxisId="r" orientation="right" tickLine={false} axisLine={false} tickFormatter={(v) => zar(v, 0)} />
                        <Tooltip formatter={(v) => zar(Number(v), 2)} />
                        <Legend iconType="circle" />
                        <Bar yAxisId="l" dataKey="annual_savings_zar" name="Annual savings" fill="#8dc63f" />
                        <Area yAxisId="r" type="monotone" dataKey="cumulative_savings_zar" name="Cumulative savings" stroke="#006838" fill="url(#cumFill)" strokeWidth={2.5} />
                    </ComposedChart>
                </ResponsiveContainer>
            </div>

            {/* Summary cards */}
            <div className="grid md:grid-cols-3 gap-6">
                <div className="card p-6 text-center">
                    <div className="metric-label">BaU 25-yr operational cost</div>
                    <div className="font-display text-4xl mt-2 text-[var(--danger)]">R {scenario.summary.cumulative_bau_cost_zar_bn.toFixed(1)}<span className="text-lg text-slate-400 font-sans"> bn</span></div>
                    <div className="text-xs text-slate-500 mt-2">if no initiatives are implemented</div>
                </div>
                <div className="card p-6 text-center">
                    <div className="metric-label">Strategic 25-yr cost</div>
                    <div className="font-display text-4xl mt-2 text-[var(--aspen-green)]">R {scenario.summary.cumulative_strategic_cost_zar_bn.toFixed(1)}<span className="text-lg text-slate-400 font-sans"> bn</span></div>
                    <div className="text-xs text-slate-500 mt-2">with active initiatives</div>
                </div>
                <div className="card-dark p-6 text-center">
                    <div className="text-[10px] uppercase tracking-widest text-emerald-200/70">Net benefit</div>
                    <div className="font-display text-4xl mt-2 text-[var(--aspen-lime)]">{zar(scenario.summary.cumulative_savings_zar, 2)}</div>
                    <div className="text-xs text-emerald-100/70 mt-2">cumulative savings over 25 years</div>
                </div>
            </div>
        </div>
    );
};

// ---------------------------------------------------------------------------
// MAIN APP
// ---------------------------------------------------------------------------
const TABS = [
    { k: "overview", label: "Overview" },
    { k: "bau", label: "BAU supply/demand" },
    { k: "truecost", label: "True cost" },
    { k: "simulator", label: "Strategic simulator" },
    { k: "savings", label: "Cumulative savings" },
];

function Dashboard() {
    const [authed, setAuthed] = useState(() => !!localStorage.getItem("aspen_token"));
    const [tab, setTab] = useState("overview");
    const [site, setSite] = useState(null);
    const [bau, setBau] = useState(null);
    const [tc, setTc] = useState(null);
    const [projection, setProjection] = useState(null);
    const [initiatives, setInitiatives] = useState(null);
    const [scenario, setScenario] = useState(null);

    useEffect(() => {
        if (!authed) return;
        (async () => {
            const [a, b, c, d, e] = await Promise.all([
                axios.get(`${API}/aspen/site`),
                axios.get(`${API}/aspen/bau-supply-demand`),
                axios.get(`${API}/aspen/true-cost-breakdown`),
                axios.get(`${API}/aspen/bau-projection`),
                axios.get(`${API}/aspen/initiatives`),
            ]);
            setSite(a.data); setBau(b.data); setTc(c.data); setProjection(d.data); setInitiatives(e.data.initiatives);
        })();
    }, [authed]);

    if (!authed) return <Gate onUnlock={() => setAuthed(true)} />;

    return (
        <div className="min-h-screen bg-paper">
            {/* Header */}
            <header className="sticky top-0 z-20 bg-white/90 backdrop-blur-md border-b border-[#e8e8e1]" data-testid="header">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-[var(--aspen-green)] flex items-center justify-center">
                            <Droplets className="w-4 h-4 text-white" />
                        </div>
                        <div>
                            <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500">WERC Digital Twin</div>
                            <div className="font-display font-semibold text-lg leading-tight">Aspen Gqeberha</div>
                        </div>
                    </div>
                    <button onClick={() => { localStorage.removeItem("aspen_token"); setAuthed(false); }} className="btn-ghost flex items-center gap-2 text-sm" data-testid="logout-btn">
                        <LogOut className="w-3.5 h-3.5" /> Sign out
                    </button>
                </div>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-3 flex gap-1 overflow-x-auto" data-testid="tab-bar">
                    {TABS.map(t => (
                        <button key={t.k} onClick={() => setTab(t.k)} className={`tab ${tab===t.k?"active":""}`} data-testid={`tab-${t.k}`}>{t.label}</button>
                    ))}
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
                {tab === "overview" && <Overview site={site} bau={projection} tc={tc} onGoTo={setTab} />}
                {tab === "bau" && <BauTab bau={bau} />}
                {tab === "truecost" && <TrueCostTab tc={tc} projection={projection} />}
                {tab === "simulator" && <SimulatorTab initiatives={initiatives} onResult={setScenario} />}
                {tab === "savings" && <SavingsTab scenario={scenario} />}
            </main>

            <footer className="border-t border-[#e8e8e1] py-6 text-center text-xs text-slate-400 mt-16">
                Aspen Gqeberha Water Digital Twin · Model data: Aspen Model v6 (Aug 2025) · Demo build
            </footer>
        </div>
    );
}

export default function App() {
    return <Dashboard />;
}
