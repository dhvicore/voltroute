// Markup of the VoltRoute UI, taken verbatim from voltroute.html (<body> contents).
// Interactivity is provided by /public/voltroute.js, which is loaded by app/page.tsx.
export const voltrouteMarkup = String.raw`
<div class="bg-grid"></div>

<!-- NAVBAR -->
<nav id="navbar" class="glass">
  <div class="brand" onclick="go('landing')"><div class="bolt"><svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;flex-shrink:0"><path d="m13 2-9 12h7l-1 8 10-12h-7l1-8Z"/></svg></div>VoltRoute</div>
  <div class="nav-links" id="navlinks"></div>
  <div class="nav-right">
    <div class="icon-btn" onclick="go('bookings')"><svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;flex-shrink:0"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></svg><span class="dot-badge"></span></div>
    <div class="ai-fab-nav" onclick="toggleAI(true)"><svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;flex-shrink:0"><path d="m12 3 2.7 6.3L21 12l-6.3 2.7L12 21l-2.7-6.3L3 12l6.3-2.7L12 3ZM20 2v4m-2-2h4"/></svg> Ask AI</div>
    <div class="avatar" onclick="go('profile')">RA</div>
  </div>
</nav>

<div id="bottomnav" class="glass"></div>

<!-- ================= LANDING ================= -->
<section class="page" id="page-landing">
  <div class="hero">
    <div>
      <div class="eyebrow"><span class="pulse"></span> 2,400+ live stations · India</div>
      <h1>Charge Smarter.<br>Drive <span class="grad">Further.</span></h1>
      <p>VoltRoute finds compatible chargers, predicts wait times, and plans multi-stop routes so you never think about range anxiety again.</p>
      <div class="btn-row">
        <button class="btn btn-primary" onclick="go('map')">Find a Charger</button>
        <button class="btn btn-ghost" onclick="go('dashboard')">Explore VoltRoute</button>
      </div>
    </div>
    <div class="glass hero-card">
      <div class="glow"></div>
      <div class="ai-teaser">
        <div class="av"><svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;flex-shrink:0"><path d="m12 3 2.7 6.3L21 12l-6.3 2.7L12 21l-2.7-6.3L3 12l6.3-2.7L12 3ZM20 2v4m-2-2h4"/></svg></div>
        <p><strong>Good evening, Riya.</strong> Your battery is at 32%. I found 3 compatible chargers along your route to Pune — the nearest is 4.2km away and free right now.</p>
      </div>
      <div class="stat-row">
        <div class="stat-mini"><div class="n c-cyan">1,842</div><div class="l">Available now</div></div>
        <div class="stat-mini"><div class="n c-green">₹14.2<span style="font-size:12px;">/kWh</span></div><div class="l">Avg. off-peak rate</div></div>
        <div class="stat-mini"><div class="n c-amber">6 min</div><div class="l">Avg. wait, DC fast</div></div>
        <div class="stat-mini"><div class="n">312t</div><div class="l">CO₂ avoided today</div></div>
      </div>
    </div>
  </div>

  <div class="section-title"><h2>Everything for the road ahead</h2><span>37 tools · one app</span></div>
  <div class="feature-grid" id="landing-features"></div>
</section>

<!-- ================= DASHBOARD ================= -->
<section class="page" id="page-dashboard">
  <div class="dash-top">
    <div><h1>Good evening, Riya </h1><p>Your Tata Nexon EV is parked at Bandra West · last synced 2 min ago</p></div>
    <button class="btn btn-primary btn-sm" onclick="go('vehicle')">Manage Vehicle</button>
  </div>

  <div class="dash-grid">
    <div class="glass ev-card">
      <div class="ring-wrap">
        <div class="score-ring-wrap" style="width:120px;height:120px;">
          <svg class="ring" width="120" height="120">
            <circle cx="60" cy="60" r="50" stroke="rgba(255,255,255,0.08)" stroke-width="10" fill="none"/>
            <circle cx="60" cy="60" r="50" stroke="url(#battGrad)" stroke-width="10" fill="none" stroke-linecap="round" stroke-dasharray="314" stroke-dashoffset="107" id="battRingFill"/>
            <defs><linearGradient id="battGrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#00f0ff"/><stop offset="100%" stop-color="#39ff14"/></linearGradient></defs>
          </svg>
          <div class="num"><div class="n c-cyan">66%</div><div class="l">SoC</div></div>
        </div>
        <div class="ev-info">
          <h3>Tata Nexon EV Max</h3>
          <div class="sub">CCS2 · 40.5 kWh · Range 210 km</div>
          <span class="charge-badge"><svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;flex-shrink:0"><rect x="2" y="6" width="18" height="12" rx="2"/><path d="M23 10v4M6 10v4m4-4v4m4-4v4"/></svg> Battery health 96%</span>
        </div>
      </div>
      <div class="ev-meta">
        <div class="ev-meta-item"><div class="l">Est. Range</div><div class="v">138 km</div></div>
        <div class="ev-meta-item"><div class="l">Charge Limit</div><div class="v">80%</div></div>
        <div class="ev-meta-item"><div class="l">Status</div><div class="v c-green">Idle</div></div>
        <div class="ev-meta-item"><div class="l">Odometer</div><div class="v">12,480 km</div></div>
      </div>
      <button class="optimize-btn" onclick="runOptimize()">
        <div class="l"><div class="t"><svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;flex-shrink:0"><path d="m13 2-9 12h7l-1 8 10-12h-7l1-8Z"/></svg> Optimize My Charge</div><div class="d">Analyzes battery, route, price & queue in real time</div></div>
        <div class="arrow">→</div>
      </button>
    </div>

    <div>
      <div class="qa-grid" id="qa-grid"></div>
      <div class="glass mini-list" style="margin-top:14px;">
        <h3>Nearby Stations <button onclick="go('map')">View map →</button></h3>
        <div id="dash-station-list"></div>
      </div>
    </div>
  </div>

  <div class="section-title"><h2>Recent Activity</h2><span>last 7 days</span></div>
  <div class="two-col">
    <div class="glass card-pad">
      <h2 class="pt" style="font-size:15px;">Charging Sessions</h2>
      <div id="chart-sessions" style="display:flex;align-items:flex-end;gap:8px;height:140px;"></div>
    </div>
    <div class="glass card-pad">
      <h2 class="pt" style="font-size:15px;"><svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;flex-shrink:0"><path d="M20 3C9 2 3 6 3 13a7 7 0 0 0 7 7c7 0 11-6 10-17ZM3 21l11-11"/></svg> CO₂ Avoided</h2>
      <div style="font-family:var(--mono);font-size:34px;font-weight:800;" class="c-green">184.6 kg</div>
      <p style="color:var(--text-dim);font-size:12.5px;margin-top:6px;">≈ 6 trees grown for a year <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;flex-shrink:0"><path d="M20 3C9 2 3 6 3 13a7 7 0 0 0 7 7c7 0 11-6 10-17ZM3 21l11-11"/></svg> · Keep charging off-peak to grow this number.</p>
      <div class="factor-bar" style="margin-top:16px;"><div class="fh"><span>Monthly goal</span><span>62%</span></div><div class="factor-track"><div class="factor-fill" style="width:62%;"></div></div></div>
    </div>
  </div>
</section>

<!-- ================= MAP ================= -->
<section class="page" id="page-map">
  <div class="dash-top"><div><h1>Charging Map</h1><p>1,842 stations available · sorted by VoltScore</p></div></div>
  <div class="map-layout">
    <div class="glass filter-panel" id="map-filters">
      <h3>Distance</h3>
      <div class="chip-row" id="filter-distance">
        <div class="chip on" data-v="5" onclick="selectFilterChip(this,'distance')">&lt;5km</div><div class="chip" data-v="10" onclick="selectFilterChip(this,'distance')">&lt;10km</div><div class="chip" data-v="25" onclick="selectFilterChip(this,'distance')">&lt;25km</div><div class="chip" data-v="any" onclick="selectFilterChip(this,'distance')">Any</div>
      </div>
      <h3>Connector Type</h3>
      <div class="chip-row" id="filter-connector">
        <div class="chip on" data-v="CCS2" onclick="toggleFilterChip(this)">CCS2</div><div class="chip" data-v="CHAdeMO" onclick="toggleFilterChip(this)">CHAdeMO</div><div class="chip" data-v="Type2" onclick="toggleFilterChip(this)">Type 2</div><div class="chip" data-v="NACS" onclick="toggleFilterChip(this)">NACS</div>
      </div>
      <h3>Speed</h3>
      <div class="chip-row" id="filter-speed">
        <div class="chip" data-v="slow" onclick="toggleFilterChip(this)">Slow</div><div class="chip on" data-v="fast" onclick="toggleFilterChip(this)">Fast</div><div class="chip on" data-v="ultra" onclick="toggleFilterChip(this)">Ultra Fast</div>
      </div>
      <h3>Availability</h3>
      <div class="chip-row" id="filter-availability">
        <div class="chip on" data-v="available" onclick="toggleFilterChip(this)">Available now</div><div class="chip" data-v="24/7" onclick="toggleFilterChip(this)">24/7</div>
      </div>
      <h3>Amenities</h3>
      <div class="chip-row" id="filter-amenities">
        <div class="chip" data-v="Café" onclick="toggleFilterChip(this)"><svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;flex-shrink:0"><path d="M4 8h12v8a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4V8ZM16 9h2a3 3 0 0 1 0 6h-2M7 2v3m5-3v3M2 23h18"/></svg> Cafe</div><div class="chip" data-v="Food" onclick="toggleFilterChip(this)"><svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;flex-shrink:0"><path d="M4 2v7a3 3 0 0 0 6 0V2M7 2v20M20 22V2c-4 2-4 9 0 10"/></svg> Food</div><div class="chip" data-v="Restroom" onclick="toggleFilterChip(this)"><svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;flex-shrink:0"><circle cx="7" cy="4" r="2"/><circle cx="17" cy="4" r="2"/><path d="M4 9h6l-1 8H5L4 9ZM7 17v5m7-13h6l2 8H12l2-8Zm3 8v5"/></svg> Restroom</div><div class="chip" data-v="Wi-Fi" onclick="toggleFilterChip(this)"><svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;flex-shrink:0"><path d="M2 8a16 16 0 0 1 20 0M5 12a11 11 0 0 1 14 0m-11 4a6 6 0 0 1 8 0"/><circle cx="12" cy="20" r="1"/></svg> Wi-Fi</div>
      </div>
      <div id="compat-toggle" style="margin-top:8px;padding:12px;border-radius:13px;background:rgba(0,240,255,0.06);border:1px solid var(--border-bright);font-size:12px;display:flex;justify-content:space-between;align-items:center;cursor:pointer;" onclick="toggleCompat()">
        <span><svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;flex-shrink:0"><path d="m5 12 4 4L20 5"/></svg> Only compatible</span>
        <div id="compat-switch" style="width:34px;height:19px;border-radius:99px;background:var(--cyan);position:relative;"><div style="width:15px;height:15px;border-radius:50%;background:#04141a;position:absolute;top:2px;right:2px;transition:all .2s;" id="compat-knob"></div></div>
      </div>
    </div>
    <div>
      <div class="map-canvas" id="mapCanvas"></div>
      <div class="glass card-pad" style="margin-top:16px;">
        <h2 class="pt" style="font-size:15px;" id="map-station-count">Stations</h2>
        <div id="map-station-list"></div>
      </div>
    </div>
  </div>
</section>

<!-- ================= STATION DETAIL ================= -->
<section class="page" id="page-station">
  <div class="back-link" onclick="go('map')">← Back to map</div>
  <div id="station-detail-content"></div>
</section>

<!-- ================= BOOKING ================= -->
<section class="page" id="page-booking">
  <div class="back-link" onclick="go('map')">← Back</div>
  <h1 style="font-size:26px;font-weight:800;margin-bottom:20px;">Book a Charging Slot</h1>
  <div class="two-col">
    <div class="glass card-pad">
      <div class="field"><label>Station</label><select id="bk-station"></select></div>
      <div class="two-col" style="margin-bottom:0;">
        <div class="field"><label>Date</label><input type="date" value="2026-08-10"></div>
        <div class="field"><label>Time</label><input type="time" value="18:30"></div>
      </div>
      <div class="field"><label>Duration: <span id="bk-dur-val">30</span> min</label><input type="range" min="10" max="90" value="30" class="slider" style="width:100%;" oninput="document.getElementById('bk-dur-val').textContent=this.value; updateBookingCost();"></div>
      <div class="field"><label>Connector</label><select><option>CCS2 · 60kW DC</option><option>Type 2 · 22kW AC</option></select></div>
      <div class="field"><label>Pay with</label>
        <div class="chip-row"><div class="chip on">UPI</div><div class="chip">Stripe Card</div></div>
      </div>
      <button class="btn btn-primary" style="width:100%;" onclick="confirmBooking()">Reserve Slot</button>
    </div>
    <div class="glass card-pad">
      <h2 class="pt" style="font-size:15px;">Booking Summary</h2>
      <div class="ev-meta-item" style="margin-bottom:10px;"><div class="l">Estimated Energy</div><div class="v" id="bk-energy">18 kWh</div></div>
      <div class="ev-meta-item" style="margin-bottom:10px;"><div class="l">Estimated Cost</div><div class="v c-cyan" id="bk-cost">₹324</div></div>
      <div class="ev-meta-item"><div class="l">Payment method</div><div class="v" id="bk-after">UPI</div></div>
      <div style="margin-top:20px;padding:16px;border-radius:14px;background:rgba(255,255,255,0.03);border:1px dashed var(--border);text-align:center;">
        <div style="font-size:34px;">▦</div>
        <div style="font-size:11px;color:var(--text-dimmer);margin-top:6px;">QR check-in code generates after confirmation</div>
      </div>
    </div>
  </div>
</section>

<!-- ================= CHARGING SESSION ================= -->
<section class="page" id="page-charging">
  <div class="dash-top"><div><h1>Live Charging Session</h1><p>Tata Power EV Station · Bandra West · Charger #04</p></div>
    <span class="tag" style="background:rgba(57,255,20,0.12);color:var(--green);border:1px solid rgba(57,255,20,.3);">● CHARGING</span>
  </div>
  <div class="glass charge-hero">
    <div class="batt-ring-outer">
      <svg width="260" height="260" style="transform:rotate(-90deg);">
        <circle cx="130" cy="130" r="112" stroke="rgba(255,255,255,0.07)" stroke-width="16" fill="none"/>
        <circle cx="130" cy="130" r="112" stroke="url(#chargeGrad)" stroke-width="16" fill="none" stroke-linecap="round"
          stroke-dasharray="703.7" stroke-dashoffset="422" id="chargeRing" style="transition:stroke-dashoffset 1s linear;"/>
        <defs><linearGradient id="chargeGrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#00f0ff"/><stop offset="100%" stop-color="#39ff14"/></linearGradient></defs>
      </svg>
      <div class="batt-center"><div class="pct" id="chargePct">40%</div><div class="lbl">charging</div></div>
    </div>
    <div class="session-stats">
      <div class="sstat"><div class="v c-cyan" id="s-power">58.2 kW</div><div class="l">Power</div></div>
      <div class="sstat"><div class="v" id="s-energy">9.4 kWh</div><div class="l">Delivered</div></div>
      <div class="sstat"><div class="v" id="s-time">00:12:40</div><div class="l">Elapsed</div></div>
      <div class="sstat"><div class="v c-green" id="s-cost">₹169</div><div class="l">Cost so far</div></div>
    </div>
    <div style="display:flex;gap:12px;margin-top:28px;">
      <button class="btn btn-ghost" onclick="notify('info','Minimized to floating widget')">Minimize</button>
      <button class="btn" style="background:rgba(255,59,92,0.15);border:1px solid rgba(255,59,92,.4);color:var(--red);" onclick="stopCharging()">Stop Charging</button>
    </div>
  </div>
</section>


<!-- ================= REWARDS ================= -->
<section class="page" id="page-rewards">
  <h1 style="font-size:26px;font-weight:800;margin-bottom:6px;">VoltRewards <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;flex-shrink:0"><path d="M20 3C9 2 3 6 3 13a7 7 0 0 0 7 7c7 0 11-6 10-17ZM3 21l11-11"/></svg></h1>
  <p style="color:var(--text-dim);font-size:13.5px;margin-bottom:24px;" id="rewards-subtitle">Loading...</p>
  <div class="glass card-pad" style="margin-bottom:26px;" id="rewards-progress">
    <div class="factor-bar"><div class="fh"><span>—</span><span>Loading...</span></div><div class="factor-track"><div class="factor-fill" style="width:0%;"></div></div></div>
  </div>
  <div class="section-title" style="margin-top:0;"><h2>Achievements</h2></div>
  <div class="badge-grid" id="badge-grid"></div>
  <div class="section-title"><h2>Redeem Points</h2></div>
  <div class="feature-grid">

    <div class="glass feature-card" style="cursor:pointer;" onclick="redeemReward('free_fast_charge')"><div class="ic"><svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;flex-shrink:0"><path d="m13 2-9 12h7l-1 8 10-12h-7l1-8Z"/></svg></div><h3>Free Fast-Charge Session</h3><p>1,200 points</p></div>
    <div class="glass feature-card" style="cursor:pointer;" onclick="redeemReward('volt_plus_month')"><div class="ic"><svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;flex-shrink:0"><path d="m2 5 5 4 5-7 5 7 5-4-3 14H5L2 5Zm3 17h14"/></svg></div><h3>1 Month Volt Plus</h3><p>2,000 points</p></div>
  </div>
</section>

<!-- ================= ROUTE PLANNER ================= -->
<section class="page" id="page-route">
  <h1 style="font-size:26px;font-weight:800;margin-bottom:20px;">Smart Route Planner</h1>
  <div class="two-col">
    <div class="glass card-pad">
      <div class="two-col" style="margin-bottom:0;">
        <div class="field"><label>From</label><input id="route-from" value="Mumbai, Bandra West"></div>
        <div class="field"><label>To</label><input id="route-to" value="Pune, Hinjewadi"></div>
      </div>
      <div class="two-col" style="margin-bottom:0;">
        <div class="field"><label>Vehicle</label><select id="route-vehicle"></select></div>
        <div class="field"><label>Current battery</label><input id="route-battery" value="34%"></div>
      </div>
      <div class="field"><label>Budget priority</label>
        <div class="chip-row" id="route-priority"><div class="chip on" data-p="fastest" onclick="selectPriority(this)">Fastest</div><div class="chip" data-p="cheapest" onclick="selectPriority(this)">Cheapest</div><div class="chip" data-p="fewest" onclick="selectPriority(this)">Fewest stops</div></div>
      </div>
      <button class="btn btn-primary" style="width:100%;" onclick="planRoute()">Plan Route</button>
    </div>
    <div class="glass card-pad">
      <h2 class="pt" style="font-size:15px;" id="route-summary">Route Timeline</h2>
      <div class="route-timeline" id="route-timeline"></div>
    </div>
  </div>
  <div class="glass card-pad" style="margin-top:20px;">
    <h2 class="pt" style="font-size:15px;">Route Map</h2>
    <div id="route-map" style="width:100%;height:420px;border-radius:12px;overflow:hidden;background:#1a1a2e;"></div>
  </div>
</section>

<!-- ================= VEHICLE GARAGE ================= -->
<section class="page" id="page-vehicle">
  <h1 style="font-size:26px;font-weight:800;margin-bottom:20px;">My Garage</h1>
  <div class="feature-grid" id="garage-grid"></div>
</section>

<!-- ================= BOOKINGS LIST / NOTIFICATIONS ================= -->
<section class="page" id="page-bookings">
  <h1 style="font-size:26px;font-weight:800;margin-bottom:20px;">Bookings & Notifications</h1>
  <div class="two-col">
    <div class="glass card-pad">
      <h2 class="pt" style="font-size:15px;">Upcoming Bookings</h2>
      <div id="upcoming-bookings"></div>
    </div>
    <div class="glass card-pad">
      <h2 class="pt" style="font-size:15px;">Notifications</h2>
      <div id="notif-list"></div>
    </div>
  </div>
</section>

<!-- ================= SUBSCRIPTIONS ================= -->
<section class="page" id="page-subscriptions">
  <h1 style="font-size:26px;font-weight:800;margin-bottom:20px;">Plans</h1>
  <div class="feature-grid" id="plans-grid" style="grid-template-columns:repeat(3,1fr);">Loading...</div>
</section>

<!-- ================= COMMUNITY ================= -->
<section class="page" id="page-community">
  <div class="dash-top"><div><h1>Community Reports</h1><p>Help keep the network accurate</p></div>
    <button class="btn btn-primary btn-sm" onclick="showReportForm()">+ Report an Issue</button></div>
  <div class="glass card-pad" id="report-form-wrap" style="display:none;margin-bottom:16px;">
    <div class="field"><label>Station</label><select id="report-station"></select></div>
    <div class="field"><label>Category</label><select id="report-category"><option value="broken">Broken equipment</option><option value="icing">ICEing</option><option value="pricing">Pricing issue</option><option value="safety">Safety concern</option><option value="other">Other</option></select></div>
    <div class="field"><label>Title</label><input id="report-title" placeholder="Short description"></div>
    <div class="field"><label>Details</label><input id="report-desc" placeholder="What happened?"></div>
    <button class="btn btn-primary btn-sm" style="width:100%;" onclick="submitReport()">Submit Report</button>
  </div>
  <div class="glass card-pad" id="community-list"></div>
</section>

<!-- ================= PROFILE ================= -->
<section class="page" id="page-profile">
  <h1 style="font-size:26px;font-weight:800;margin-bottom:20px;">Profile & Settings</h1>
  <div class="two-col">
    <div class="glass card-pad" style="text-align:center;">
      <div class="avatar" id="profile-avatar" style="width:80px;height:80px;font-size:26px;border-radius:22px;margin:0 auto 14px;">—</div>
      <h3 style="font-size:17px;" id="profile-name">Loading...</h3>
      <p style="color:var(--text-dimmer);font-size:12.5px;margin-top:4px;" id="profile-email">—</p>
      <button class="btn btn-ghost btn-sm" style="margin-top:16px;">Edit Profile</button>
    </div>
    <div class="glass card-pad">
      <h2 class="pt" style="font-size:15px;">Quick Links</h2>
      <div class="station-row" onclick="go('vehicle')"><div class="l"><span><svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;flex-shrink:0"><path d="m5 6 2-3h10l2 3 2 5v7H3v-7l2-5ZM3 11h18M6 18v3m12-3v3M6 14h2m8 0h2"/></svg></span><div class="name">My Vehicles</div></div><span>›</span></div>

      <div class="station-row" onclick="go('subscriptions')"><div class="l"><span><svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;flex-shrink:0"><path d="m2 5 5 4 5-7 5 7 5-4-3 14H5L2 5Zm3 17h14"/></svg></span><div class="name">Subscription</div></div><span>›</span></div>
      <div class="station-row"><div class="l"><span><svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;flex-shrink:0"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/></svg></span><div class="name">Favorite Stations</div></div><span>›</span></div>
      <div class="station-row"><div class="l"><span><svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;flex-shrink:0"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></svg></span><div class="name">Notification Preferences</div></div><span>›</span></div>
    </div>
  </div>
</section>

<!-- AI FAB + PANEL -->
<button id="ai-fab" onclick="toggleAI()"><svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;flex-shrink:0"><path d="m12 3 2.7 6.3L21 12l-6.3 2.7L12 21l-2.7-6.3L3 12l6.3-2.7L12 3ZM20 2v4m-2-2h4"/></svg></button>
<div id="ai-panel" class="glass">
  <div class="ai-head">
    <div class="l"><div class="av"><svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;flex-shrink:0"><path d="m12 3 2.7 6.3L21 12l-6.3 2.7L12 21l-2.7-6.3L3 12l6.3-2.7L12 3ZM20 2v4m-2-2h4"/></svg></div><div><div class="t">VoltRoute AI</div><div class="s">● online</div></div></div>
    <button onclick="toggleAI(false)">✕</button>
  </div>
  <div class="ai-body" id="ai-body"></div>
  <div class="ai-suggest" id="ai-suggest"></div>
  <div class="ai-input-row">
    <input id="ai-input" placeholder="Ask about chargers, routes, cost…" onkeydown="if(event.key==='Enter')sendAI()">
    <button onclick="sendAI()">➤</button>
  </div>
</div>

<div id="toast-wrap"></div>
`;
