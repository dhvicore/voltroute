/* ===================== VoltRoute Frontend — API-integrated ===================== */

const API = ''; // same origin
let authToken = localStorage.getItem('vr_token') || null;
let currentUser = null;
let DB_STATIONS = []; // filled from API

function apiHeaders(){ const h = {'Content-Type':'application/json'}; if(authToken) h['Authorization']='Bearer '+authToken; return h; }
async function api(path,opts={}){ opts.headers = apiHeaders(); const r = await fetch(API+path,opts); return r.json(); }

/* ===================== AUTH — auto-login demo user on first visit ===================== */
async function ensureAuth(){
  if(authToken){
    try{ const d = await api('/api/auth/me'); if(d.user){ currentUser=d.user; return; } } catch(e){}
  }
  // auto-login as demo user
  const d = await api('/api/auth/login',{method:'POST',body:JSON.stringify({email:'riya@voltroute.app',password:'user123'})});
  if(d.token){ authToken=d.token; localStorage.setItem('vr_token',authToken); currentUser=d.user; }
}

/* ===================== LOAD STATIONS FROM DB ===================== */
async function loadStations(){
  const d = await api('/api/stations');
  if(!d.stations) return;
  // Map DB rows to frontend shape the UI expects
  DB_STATIONS = d.stations.map((s,i)=>{
    const maxPow = s.max_power||60;
    const speedLabel = maxPow>=120?'Ultra Fast · '+maxPow+'kW':maxPow>=50?'Fast · '+maxPow+'kW':'Slow · '+maxPow+'kW';
    const avail = s.available_chargers||0;
    const total = s.total_chargers||1;
    const st = avail>0?'available':total>avail&&avail===0?'busy':'full';
    const amenIcons = (s.amenities||[]).map(a=>{
      if(a.includes('Café')||a.includes('Coffee'))return 'Café';
      if(a.includes('Food'))return 'Food';
      if(a.includes('Restroom'))return 'Restroom';
      if(a.includes('Wi-Fi')||a.includes('WiFi'))return 'Wi-Fi';
      if(a.includes('Shopping'))return 'Shopping';
      if(a.includes('Parking'))return 'Parking';
      return a;
    });
    // VoltScore: blend of price, speed, rating, availability
    const priceScore = Math.max(0,100-(s.min_price||15-12)*8);
    const speedScore = maxPow>=120?95:maxPow>=50?70:40;
    const ratingScore = (s.rating||3)*20;
    const availScore = st==='available'?95:st==='busy'?60:25;
    const score = Math.round((priceScore+speedScore+ratingScore+availScore)/4);
    // SVG map coords: project lat/lng to 0-100 box (Mumbai region)
    const latMin=18.9, latMax=19.25, lngMin=72.8, lngMax=73.05;
    const x = Math.max(5,Math.min(95,((s.longitude-lngMin)/(lngMax-lngMin))*100));
    const y = Math.max(5,Math.min(95,100-((s.latitude-latMin)/(latMax-latMin))*100));
    return {
      id:s.id, dbId:s.id, name:s.name, area:s.address+', '+s.city,
      x, y, status:st, rating:s.rating||0, price:s.min_price||15,
      speed:speedLabel, connectors:[], score, queue:0,
      amenities:amenIcons, dist:0, latitude:s.latitude, longitude:s.longitude,
      operator:s.operator, available_chargers:avail, total_chargers:total,
      opening_hours:s.opening_hours, contact_phone:s.contact_phone,
    };
  });
}

/* ===================== NAV ===================== */
const NAV = [
  {id:'dashboard',label:'Home'},{id:'map',label:'Map'},{id:'route',label:'Route'},
  {id:'vehicle',label:'Vehicle'},{id:'bookings',label:'Bookings'},
  {id:'rewards',label:'Rewards'},{id:'community',label:'Community'}
];
const BOTTOMNAV = [
  {id:'dashboard',label:'Home',icon:'<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;flex-shrink:0"><path d="m3 10 9-8 9 8v11h-6v-8H9v8H3V10Z"/></svg>'},{id:'map',label:'Map',icon:'<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;flex-shrink:0"><path d="m3 5 6-3 6 3 6-3v17l-6 3-6-3-6 3V5Zm6-3v17m6-14v17"/></svg>'},
  {id:'route',label:'Route',icon:'<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;flex-shrink:0"><circle cx="12" cy="12" r="10"/><path d="m16 8-3 5-5 3 3-5 5-3Z"/></svg>'},{id:'profile',label:'You',icon:'<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;flex-shrink:0"><circle cx="12" cy="7" r="4"/><path d="M4 22v-3a8 8 0 0 1 16 0v3"/></svg>'}
];
const statusColor = {available:'#39ff14',busy:'#ffb020',full:'#ff3b5c',offline:'#5f6572'};
const statusClass = {available:'st-available',busy:'st-busy',full:'st-full',offline:'st-offline'};

function renderNav(){
  document.getElementById('navlinks').innerHTML = NAV.map(n=>`<button data-p="${n.id}" onclick="go('${n.id}')">${n.label}</button>`).join('');
  document.getElementById('bottomnav').innerHTML = BOTTOMNAV.map(n=>`<button data-p="${n.id}" onclick="go('${n.id}')"><span class="bi">${n.icon}</span>${n.label}</button>`).join('');
}
renderNav();

let currentPage = 'landing';
function go(id){
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  const target = document.getElementById('page-'+id);
  if(target) target.classList.add('active');
  currentPage = id;
  document.querySelectorAll('#navlinks button, #bottomnav button').forEach(b=>{ b.classList.toggle('active', b.dataset.p===id); });
  window.scrollTo({top:0,behavior:'smooth'});
  if(id==='map') setTimeout(function(){ applyMapFilters(); },30);
  if(id==='vehicle') loadVehiclesPage();
  if(id==='bookings') loadBookingsPage();

  if(id==='rewards') loadRewardsPage();
  if(id==='subscriptions') loadSubscriptionsPage();
  if(id==='community') loadCommunityPage();
  if(id==='route') loadRouteVehicles();
  if(id==='profile') loadProfilePage();
}
document.addEventListener('scroll',()=>{ document.getElementById('navbar').classList.toggle('scrolled', window.scrollY>10); });

/* ===================== LANDING ===================== */
const LANDING_FEATURES = [
  ['<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;flex-shrink:0"><path d="m12 3 2.7 6.3L21 12l-6.3 2.7L12 21l-2.7-6.3L3 12l6.3-2.7L12 3ZM20 2v4m-2-2h4"/></svg>','AI EV Assistant','Ask in plain language — "cheapest charger near me right now?"'],
  ['<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;flex-shrink:0"><path d="m3 5 6-3 6 3 6-3v17l-6 3-6-3-6 3V5Zm6-3v17m6-14v17"/></svg>','Live Charging Map','Real-time availability with animated markers and clustering.'],
  ['<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;flex-shrink:0"><circle cx="12" cy="12" r="10"/><path d="m7 12 3 3 7-7"/></svg>','VoltScore™','A 0–100 score blending distance, price, speed & reliability.'],
  ['<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;flex-shrink:0"><circle cx="12" cy="12" r="10"/><path d="m16 8-3 5-5 3 3-5 5-3Z"/></svg>','Smart Route Planner','Multi-stop routes optimized for your battery and budget.'],
  ['<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;flex-shrink:0"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>','Virtual Queueing','Reserve your place in line and get notified when it is your turn.'],
  ['<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;flex-shrink:0"><path d="M8 2v5m8-5v5M5 7h14v5a7 7 0 0 1-14 0V7Zm7 12v3"/></svg>','Plug & Charge','ISO 15118 auto-detection — plug in and billing starts itself.'],
  ['<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;flex-shrink:0"><rect x="2" y="4" width="20" height="16" rx="3"/><path d="M2 10h20M6 16h4"/></svg>','Dynamic Pricing','See peak vs off-peak rates and save by shifting your charge.'],
  ['<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;flex-shrink:0"><path d="M20 3C9 2 3 6 3 13a7 7 0 0 0 7 7c7 0 11-6 10-17ZM3 21l11-11"/></svg>','Green Rewards','Earn points for eco-driving, off-peak charging & reporting.'],
  ['<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;flex-shrink:0"><rect x="4" y="2" width="16" height="20" rx="2"/><path d="M8 6h2m4 0h2M8 10h2m4 0h2m-8 4h2m4 0h2m-6 8v-4h4v4"/></svg>','Fleet Dashboard','Track vehicles, cost and utilization for business accounts.'],
];
document.getElementById('landing-features').innerHTML = LANDING_FEATURES.map(f=>`
  <div class="glass feature-card" onclick="go('dashboard')"><div class="ic">${f[0]}</div><h3>${f[1]}</h3><p>${f[2]}</p></div>`).join('');

/* ===================== DASHBOARD ===================== */
const QUICK_ACTIONS = [
  ['<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;flex-shrink:0"><path d="m13 2-9 12h7l-1 8 10-12h-7l1-8Z"/></svg>','Find Charger','map'],['<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;flex-shrink:0"><circle cx="12" cy="12" r="10"/><path d="m16 8-3 5-5 3 3-5 5-3Z"/></svg>','Plan Route','route'],['<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;flex-shrink:0"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M7 2v4m10-4v4M3 10h18"/></svg>','Book Slot','booking'],
  ['<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;flex-shrink:0"><path d="m5 6 2-3h10l2 3 2 5v7H3v-7l2-5ZM3 11h18M6 18v3m12-3v3M6 14h2m8 0h2"/></svg>','My Vehicle','vehicle'],['<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;flex-shrink:0"><path d="M20 3C9 2 3 6 3 13a7 7 0 0 0 7 7c7 0 11-6 10-17ZM3 21l11-11"/></svg>','Rewards','rewards']
];
document.getElementById('qa-grid').innerHTML = QUICK_ACTIONS.map(a=>`
  <div class="glass qa-card" onclick="go('${a[2]}')"><span class="ic">${a[0]}</span><div class="t">${a[1]}</div></div>`).join('');

function scoreColor(s){return s>=85?'#39ff14':s>=65?'#00f0ff':s>=45?'#ffb020':'#ff3b5c';}
function scoreBg(s){return s>=85?'rgba(57,255,20,0.12)':s>=65?'rgba(0,240,255,0.12)':s>=45?'rgba(255,176,32,0.12)':'rgba(255,59,92,0.12)';}

function renderDashStations(){
  const top = [...DB_STATIONS].sort((a,b)=>b.score-a.score).slice(0,4);
  document.getElementById('dash-station-list').innerHTML = top.map(s=>`
    <div class="station-row" onclick="openStation('${s.id}')">
      <div class="l"><span class="status-dot ${statusClass[s.status]}"></span>
        <div><div class="name">${s.name}</div><div class="meta">${s.operator||''} · ${s.speed}</div></div>
      </div>
      <div class="r"><span class="volt-score-pill" style="background:${scoreBg(s.score)};color:${scoreColor(s.score)};">${s.score}</span></div>
    </div>`).join('');
}

// sessions mini chart
const sessData=[3,5,2,7,4,6,8];
document.getElementById('chart-sessions').innerHTML = sessData.map((v,i)=>`
  <div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:6px;">
    <div style="width:100%;height:${v*14}px;border-radius:8px 8px 0 0;background:linear-gradient(180deg,var(--cyan),rgba(57,255,20,0.5));"></div>
    <span style="font-size:10px;color:var(--text-dimmer);">${['M','T','W','T','F','S','S'][i]}</span>
  </div>`).join('');

function runOptimize(){
  toggleAI(true);
  setTimeout(()=>{
    pushMsg('user','Optimize my charge');
    showTyping(()=>{
      // find best station from DB
      const best = [...DB_STATIONS].sort((a,b)=>b.score-a.score).find(s=>s.status==='available')||DB_STATIONS[0];
      pushCard(' Optimize Result', `
        <div style="display:flex;justify-content:space-between;margin-bottom:4px;"><span>Recommended</span><strong style="color:var(--text)">${best.name}</strong></div>
        <div style="display:flex;justify-content:space-between;margin-bottom:4px;"><span>VoltScore</span><strong class="c-green">${best.score} · ${best.score>=85?'Excellent':best.score>=65?'Good':'Fair'}</strong></div>
        <div style="display:flex;justify-content:space-between;margin-bottom:4px;"><span>Price</span><strong>₹${best.price}/kWh</strong></div>
        <div style="display:flex;justify-content:space-between;"><span>Speed</span><strong>${best.speed}</strong></div>
        <button class="btn btn-primary btn-sm" style="width:100%;margin-top:10px;" onclick="openStation('${best.id}');toggleAI(false);">View Station</button>
      `);
    });
  },300);
}

/* ===================== MAP WITH FILTERS ===================== */
var mapFiltered = [];
var compatMode = true;

function selectFilterChip(el, group){
  document.querySelectorAll('#filter-'+group+' .chip').forEach(function(c){c.classList.remove('on');});
  el.classList.add('on');
  applyMapFilters();
}
function toggleFilterChip(el){
  el.classList.toggle('on');
  applyMapFilters();
}
function toggleCompat(){
  compatMode = !compatMode;
  var knob = document.getElementById('compat-knob');
  var sw = document.getElementById('compat-switch');
  if(compatMode){ sw.style.background='var(--cyan)'; knob.style.right='2px'; knob.style.left=''; }
  else { sw.style.background='rgba(255,255,255,0.15)'; knob.style.right=''; knob.style.left='2px'; }
  applyMapFilters();
}

function getActiveFilters(groupId){
  return [...document.querySelectorAll('#'+groupId+' .chip.on')].map(function(c){return c.dataset.v;});
}

function applyMapFilters(){
  var distVals = getActiveFilters('filter-distance');
  var connVals = getActiveFilters('filter-connector');
  var speedVals = getActiveFilters('filter-speed');
  var availVals = getActiveFilters('filter-availability');
  var amenVals = getActiveFilters('filter-amenities');

  var maxDist = distVals[0]==='any'||!distVals.length ? 9999 : parseInt(distVals[0])||5;

  mapFiltered = DB_STATIONS.filter(function(s){
    var dist = haversineDist(19.076, 72.8777, s.latitude, s.longitude);
    if(dist > maxDist) return false;

    if(connVals.length){
      var stConns = s.connectors && s.connectors.length ? s.connectors : [];
      if(!stConns.length){
        var speedStr = s.speed||'';
        if(speedStr.includes('120')||speedStr.includes('150')||speedStr.includes('180')||speedStr.includes('60')) stConns.push('CCS2');
        if(speedStr.includes('22')||speedStr.includes('7.4')) stConns.push('Type2');
      }
      if(!connVals.some(function(c){return stConns.indexOf(c)>=0;})) return false;
    }

    if(speedVals.length){
      var power = parseInt((s.speed||'').match(/\d+/)||[0]);
      var matchSpeed = false;
      if(speedVals.indexOf('slow')>=0 && power<50) matchSpeed=true;
      if(speedVals.indexOf('fast')>=0 && power>=50 && power<120) matchSpeed=true;
      if(speedVals.indexOf('ultra')>=0 && power>=120) matchSpeed=true;
      if(!matchSpeed) return false;
    }

    if(availVals.indexOf('available')>=0 && s.status!=='available') return false;
    if(availVals.indexOf('24/7')>=0 && s.opening_hours!=='24/7') return false;

    if(amenVals.length){
      if(!amenVals.every(function(a){return s.amenities.indexOf(a)>=0;})) return false;
    }

    return true;
  });

  renderMap(mapFiltered);
  renderMapStationList(mapFiltered);
}

function haversineDist(lat1,lon1,lat2,lon2){
  var R=6371, dLat=(lat2-lat1)*Math.PI/180, dLon=(lon2-lon1)*Math.PI/180;
  var a=Math.sin(dLat/2)*Math.sin(dLat/2)+Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)*Math.sin(dLon/2);
  return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
}

function renderMap(stations){
  stations = stations || DB_STATIONS;
  var c = document.getElementById('mapCanvas');
  c.dataset.rendered='';
  var svg = '<svg viewBox="0 0 100 100" preserveAspectRatio="none">';
  svg += '<g class="map-roads">';
  for(var i=1;i<6;i++){ svg+='<line x1="0" y1="'+(i*16)+'" x2="100" y2="'+(i*16+6)+'"/>'; svg+='<line x1="'+(i*16)+'" y1="0" x2="'+(i*16-6)+'" y2="100"/>'; }
  svg += '</g>';
  svg += '<circle cx="50" cy="50" r="6" fill="none" class="user-dot" stroke="#00f0ff" stroke-width="1.5"/>';
  svg += '<circle cx="50" cy="50" r="2.6" fill="#00f0ff"/>';
  stations.forEach(function(s){
    var col = statusColor[s.status]||statusColor.available;
    svg += '<g class="map-marker" onclick="openStation(\''+s.id+'\')">';
    svg += '<circle cx="'+s.x+'" cy="'+s.y+'" r="8" fill="'+col+'" opacity="0.18" class="pulse-ring"/>';
    svg += '<circle cx="'+s.x+'" cy="'+s.y+'" r="3.4" fill="'+col+'" stroke="#0a0a0f" stroke-width="1"/>';
    svg += '</g>';
  });
  svg += '</svg>';
  c.innerHTML = svg;

  var countEl = document.getElementById('map-station-count');
  if(countEl) countEl.textContent = stations.length+' Station'+(stations.length!==1?'s':'');

  var headerP = document.querySelector('#page-map .dash-top p');
  if(headerP) headerP.textContent = stations.length+' stations available · sorted by VoltScore';
}

function renderMapStationList(stations){
  stations = stations || DB_STATIONS;
  var el = document.getElementById('map-station-list');
  if(!el) return;
  var sorted = [...stations].sort(function(a,b){return b.score-a.score;});
  el.innerHTML = sorted.map(function(s){
    var dist = haversineDist(19.076, 72.8777, s.latitude, s.longitude).toFixed(1);
    return '<div class="station-row" onclick="openStation(\''+s.id+'\')">'+
      '<div class="l"><span class="status-dot '+statusClass[s.status]+'"></span>'+
      '<div><div class="name">'+s.name+'</div><div class="meta">'+(s.operator||'')+' · '+s.speed+' · '+dist+'km</div></div></div>'+
      '<div class="r"><span class="volt-score-pill" style="background:'+scoreBg(s.score)+';color:'+scoreColor(s.score)+';">'+s.score+'</span></div></div>';
  }).join('') || '<p style="color:var(--text-dimmer);padding:12px;">No stations match your filters.</p>';
}

async function openStation(id){
  const s = DB_STATIONS.find(x=>x.id===id);
  if(!s) return;
  // Fetch full detail + chargers from API
  let chargers = [];
  let reviews = [];
  try {
    const d = await api('/api/stations/'+id);
    if(d.chargers) chargers = d.chargers;
    if(d.reviews) reviews = d.reviews;
    // update connectors from actual charger data
    s.connectors = [...new Set(chargers.map(c=>c.connector_type))];
  } catch(e){}

  const panelHtml = stationCardHtml(s, currentPage==='map', chargers, reviews);
  if(currentPage==='map'){
    let existing = document.getElementById('mapStationPanel');
    if(existing) existing.remove();
    const div = document.createElement('div');
    div.id='mapStationPanel'; div.className='glass station-panel';
    div.innerHTML = panelHtml + `<button class="icon-btn" style="position:absolute;top:14px;right:14px;" onclick="document.getElementById('mapStationPanel').remove()">✕</button>`;
    document.getElementById('mapCanvas').appendChild(div);
  } else {
    document.getElementById('station-detail-content').innerHTML = panelHtml;
    go('station');
  }
}

function stationCardHtml(s, compact, chargers, reviews){
  chargers = chargers||[];
  reviews = reviews||[];
  let chargersHtml = '';
  if(chargers.length){
    chargersHtml = `<div style="margin-top:16px;"><h3 style="font-size:13px;font-weight:700;margin-bottom:10px;">Chargers (${chargers.length})</h3>
      ${chargers.map(c=>`<div class="station-row" style="padding:8px 0;">
        <div class="l"><span class="status-dot ${statusClass[c.status]||'st-available'}"></span>
          <div><div class="name">${c.connector_type} · ${c.power_kw}kW ${c.charging_type}</div>
          <div class="meta">₹${c.price_per_kwh}/kWh · Session fee ₹${c.session_fee} · ${c.status}</div></div>
        </div>
      </div>`).join('')}</div>`;
  }
  let reviewsHtml = '';
  if(reviews.length && !compact){
    reviewsHtml = `<div style="margin-top:16px;"><h3 style="font-size:13px;font-weight:700;margin-bottom:10px;">Reviews</h3>
      ${reviews.map(r=>`<div style="padding:8px 0;border-bottom:1px solid var(--border);">
        <div style="display:flex;justify-content:space-between;"><strong style="font-size:12px;">${r.user_name}</strong><span style="color:var(--amber);font-size:12px;">${'<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;flex-shrink:0"><path d="m12 2 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1 3-6Z"/></svg>'.repeat(r.rating)}</span></div>
        <p style="font-size:12px;color:var(--text-dim);margin-top:4px;">${r.comment||''}</p>
      </div>`).join('')}</div>`;
  }
  return `
  <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:14px;flex-wrap:wrap;">
    <div>
      <div style="display:flex;align-items:center;gap:8px;"><span class="status-dot ${statusClass[s.status]}"></span><h2 style="font-size:19px;font-weight:800;">${s.name}</h2></div>
      <p style="color:var(--text-dim);font-size:12.5px;margin-top:4px;">${s.area} ·  ${s.rating} · ${s.available_chargers||0}/${s.total_chargers||0} available</p>
      <p style="color:var(--text-dimmer);font-size:11px;margin-top:2px;">${s.opening_hours||'24/7'}${s.contact_phone?' · '+s.contact_phone:''}</p>
    </div>
    <div class="score-ring-wrap" style="width:64px;height:64px;flex-shrink:0;">
      <svg width="64" height="64"><circle cx="32" cy="32" r="26" stroke="rgba(255,255,255,0.08)" stroke-width="7" fill="none"/>
      <circle cx="32" cy="32" r="26" stroke="${scoreColor(s.score)}" stroke-width="7" fill="none" stroke-linecap="round"
        stroke-dasharray="163" stroke-dashoffset="${163-(163*s.score/100)}" style="transform:rotate(-90deg);transform-origin:32px 32px;"/></svg>
      <div class="num"><div class="n" style="font-size:16px;color:${scoreColor(s.score)}">${s.score}</div></div>
    </div>
  </div>
  <div class="ev-meta" style="margin-top:16px;">
    <div class="ev-meta-item"><div class="l">Speed</div><div class="v" style="font-size:13.5px;">${s.speed}</div></div>
    <div class="ev-meta-item"><div class="l">Price</div><div class="v" style="font-size:13.5px;">₹${s.price}/kWh</div></div>
    <div class="ev-meta-item"><div class="l">Connectors</div><div class="v" style="font-size:13.5px;">${(s.connectors||[]).join(', ')||'—'}</div></div>
    <div class="ev-meta-item"><div class="l">Operator</div><div class="v" style="font-size:13.5px;">${s.operator||'—'}</div></div>
  </div>
  ${s.amenities.length?`<div style="margin-top:12px;font-size:13px;color:var(--text-dim);">Amenities: ${s.amenities.join(' ')}</div>`:''}
  ${chargersHtml}
  ${!compact?volScoreBreakdown(s):''}
  ${reviewsHtml}
  <div class="btn-row" style="margin-top:16px;">
    <button class="btn btn-primary btn-sm" onclick="event.stopPropagation();goToBooking('${s.id}')">${s.status==='full'?'Join Queue':'Book Slot'}</button>
    <button class="btn btn-ghost btn-sm" onclick="event.stopPropagation();notify('info','Navigation started to ${s.name.replace(/'/g,"\\'")}')">Navigate</button>
    <button class="btn btn-ghost btn-sm" onclick="event.stopPropagation();addFavorite('${s.id}')">♡</button>
  </div>`;
}

async function addFavorite(stationId){
  const d = await api('/api/favorites',{method:'POST',body:JSON.stringify({station_id:stationId})});
  if(d.message) notify('success','Saved to favorites ');
  else notify('info', d.error||'Already in favorites');
}

function volScoreBreakdown(s){
  const factors=[['Availability',s.status==='available'?95:s.status==='busy'?60:25],['Price',Math.max(20,100-(s.price-12)*8)],['Speed',s.speed.includes('Ultra')?95:s.speed.includes('Fast')?70:40],['Rating',(s.rating||3)*20]];
  return `<div style="margin-top:20px;"><h3 style="font-size:13px;font-weight:700;margin-bottom:12px;">VoltScore Breakdown</h3>${factors.map(f=>`
    <div class="factor-bar"><div class="fh"><span>${f[0]}</span><span>${Math.round(f[1])}</span></div><div class="factor-track"><div class="factor-fill" style="width:${Math.max(5,Math.min(100,f[1]))}%;"></div></div></div>`).join('')}</div>`;
}

/* ===================== BOOKING ===================== */
async function goToBooking(id){
  // fetch chargers for station
  const s = DB_STATIONS.find(x=>x.id===id);
  if(!s) return;
  let chargers = [];
  try { const d = await api('/api/stations/'+id+'/chargers'); chargers = d.chargers||[]; } catch(e){}

  // populate station selector
  document.getElementById('bk-station').innerHTML = DB_STATIONS.map(x=>`<option value="${x.id}" ${x.id===id?'selected':''}>${x.name} — ${x.area}</option>`).join('');

  // store chargers for booking
  window._bkChargers = chargers;
  window._bkStationId = id;

  // add charger selector if not present
  let chargerSelect = document.getElementById('bk-charger');
  if(!chargerSelect){
    const field = document.createElement('div');
    field.className='field';
    field.innerHTML = `<label>Charger</label><select id="bk-charger"></select>`;
    const connField = document.querySelector('#page-booking .field:has(select:not(#bk-station))');
    if(connField) connField.replaceWith(field);
  }
  chargerSelect = document.getElementById('bk-charger');
  if(chargerSelect){
    chargerSelect.innerHTML = chargers.map(c=>`<option value="${c.id}">${c.connector_type} · ${c.power_kw}kW ${c.charging_type} — ₹${c.price_per_kwh}/kWh (${c.status})</option>`).join('');
  }

  updateBookingCost();
  go('booking');
}

function updateBookingCost(){
  const dur = parseInt(document.getElementById('bk-dur-val').textContent)||30;
  const chargers = window._bkChargers||[];
  const chargerSelect = document.getElementById('bk-charger');
  let pricePerKwh = 15, powerKw = 60, sessionFee = 20;
  if(chargerSelect && chargers.length){
    const sel = chargers.find(c=>c.id===chargerSelect.value);
    if(sel){ pricePerKwh=sel.price_per_kwh; powerKw=sel.power_kw; sessionFee=sel.session_fee||0; }
  }
  const energy = Math.round((powerKw*dur/60)*10)/10;
  const cost = Math.round(energy*pricePerKwh+sessionFee);
  document.getElementById('bk-energy').textContent = energy+' kWh';
  document.getElementById('bk-cost').textContent = '₹'+cost;
  document.getElementById('bk-after').textContent = '₹'+(1240-cost);
}

async function confirmBooking(){
  const stationId = window._bkStationId;
  const chargerSelect = document.getElementById('bk-charger');
  const chargerId = chargerSelect?chargerSelect.value:null;
  if(!stationId||!chargerId){ notify('error','Select a station and charger'); return; }

  const dateEl = document.querySelector('#page-booking input[type="date"]');
  const timeEl = document.querySelector('#page-booking input[type="time"]');
  const dur = parseInt(document.getElementById('bk-dur-val').textContent)||30;

  const d = await api('/api/bookings',{method:'POST',body:JSON.stringify({
    station_id:stationId, charger_id:chargerId,
    booking_date: dateEl?dateEl.value:'2026-10-10',
    start_time: timeEl?timeEl.value:'09:00',
    duration_minutes: dur
  })});

  if(d.booking){
    notify('success','Booking confirmed! ID: '+d.booking.id.slice(0,8));
    setTimeout(()=>go('bookings'),700);
  } else {
    notify('error', d.error||'Booking failed');
  }
}

/* ===================== BOOKINGS PAGE — from API ===================== */
async function loadBookingsPage(){
  try {
    const d = await api('/api/bookings');
    const bookings = d.bookings||[];
    const upcoming = bookings.filter(b=>b.status==='confirmed');
    const past = bookings.filter(b=>b.status!=='confirmed');

    document.getElementById('upcoming-bookings').innerHTML = upcoming.length ? upcoming.map(b=>`
      <div class="station-row">
        <div class="l"><span class="status-dot st-available"></span>
          <div><div class="name">${b.station_name}</div><div class="meta">${b.booking_date}, ${b.start_time} · ${b.duration_minutes} min · ${b.connector_type} ${b.power_kw}kW</div></div>
        </div>
        <div style="display:flex;align-items:center;gap:8px;">
          <span class="tag" style="background:rgba(0,240,255,0.12);color:var(--cyan);">Confirmed</span>
          <button class="btn btn-ghost btn-sm" style="font-size:11px;padding:4px 10px;" onclick="cancelBooking('${b.id}')">Cancel</button>
        </div>
      </div>`).join('') : '<p style="color:var(--text-dimmer);font-size:13px;">No upcoming bookings</p>';

    document.getElementById('notif-list').innerHTML = past.length ? past.map(b=>`
      <div class="station-row"><div class="l">${b.status==='completed'?'<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;flex-shrink:0"><path d="m5 12 4 4L20 5"/></svg>':'<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;flex-shrink:0"><path d="m6 6 12 12M6 18 18 6"/></svg>'}
        <div><div class="name">${b.station_name} · ₹${b.estimated_cost||0}</div><div class="meta">${b.booking_date} · ${b.status}</div></div>
      </div></div>`).join('') : '<p style="color:var(--text-dimmer);font-size:13px;">No past bookings</p>';
  } catch(e){
    console.error('Failed to load bookings', e);
  }
}

async function cancelBooking(id){
  const d = await api('/api/bookings/'+id+'/cancel',{method:'PATCH'});
  if(d.message){ notify('success','Booking cancelled'); loadBookingsPage(); }
  else notify('error', d.error||'Cancel failed');
}

/* ===================== VEHICLES PAGE — from API ===================== */
async function loadVehiclesPage(){
  try {
    const d = await api('/api/vehicles');
    const vehicles = d.vehicles||[];
    document.getElementById('garage-grid').innerHTML = vehicles.map(v=>`
      <div class="glass feature-card">
        <div class="ic"><svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;flex-shrink:0"><path d="m5 6 2-3h10l2 3 2 5v7H3v-7l2-5ZM3 11h18M6 18v3m12-3v3M6 14h2m8 0h2"/></svg></div><h3>${v.make} ${v.model}</h3>
        <p>${(v.connector_types||[]).join(', ')} · ${v.battery_capacity_kwh} kWh${v.year?' · '+v.year:''}<br>
        Max charge: ${v.max_charging_power_kw}kW${v.current_range_km?' · Range: '+v.current_range_km+' km':''}</p>
        <button class="btn btn-ghost btn-sm" style="margin-top:8px;font-size:11px;" onclick="deleteVehicle('${v.id}')">Remove</button>
      </div>`).join('')
      + `<div class="glass feature-card" style="display:flex;align-items:center;justify-content:center;text-align:center;color:var(--cyan);font-weight:700;cursor:pointer;" onclick="showAddVehicle()">+ Add Vehicle</div>`;
  } catch(e){
    console.error('Failed to load vehicles', e);
  }
}

async function deleteVehicle(id){
  const d = await api('/api/vehicles/'+id,{method:'DELETE'});
  if(d.message){ notify('success','Vehicle removed'); loadVehiclesPage(); }
  else notify('error', d.error||'Delete failed');
}

function showAddVehicle(){
  const html = `<div class="glass card-pad" style="max-width:400px;margin:20px auto;" id="add-vehicle-form">
    <h3 style="margin-bottom:16px;">Add Vehicle</h3>
    <div class="field"><label>Make</label><input id="av-make" placeholder="e.g. Tata"></div>
    <div class="field"><label>Model</label><input id="av-model" placeholder="e.g. Nexon EV"></div>
    <div class="field"><label>Year</label><input id="av-year" type="number" placeholder="2024"></div>
    <div class="field"><label>Battery (kWh)</label><input id="av-battery" type="number" placeholder="40.5"></div>
    <div class="field"><label>Max Charge Power (kW)</label><input id="av-power" type="number" placeholder="50"></div>
    <div class="field"><label>Connector Types</label>
      <div class="chip-row">
        <div class="chip on" onclick="this.classList.toggle('on')">CCS2</div>
        <div class="chip" onclick="this.classList.toggle('on')">Type2</div>
        <div class="chip" onclick="this.classList.toggle('on')">CHAdeMO</div>
      </div>
    </div>
    <button class="btn btn-primary" style="width:100%;margin-top:12px;" onclick="submitAddVehicle()">Add Vehicle</button>
  </div>`;
  const grid = document.getElementById('garage-grid');
  if(document.getElementById('add-vehicle-form')) return;
  grid.insertAdjacentHTML('afterend', html);
}

async function submitAddVehicle(){
  const make = document.getElementById('av-make').value;
  const model = document.getElementById('av-model').value;
  const year = parseInt(document.getElementById('av-year').value)||null;
  const battery = parseFloat(document.getElementById('av-battery').value);
  const power = parseFloat(document.getElementById('av-power').value)||50;
  const chips = document.querySelectorAll('#add-vehicle-form .chip.on');
  const connectors = [...chips].map(c=>c.textContent.trim());

  if(!make||!model||!battery){ notify('error','Make, model, and battery are required'); return; }

  const d = await api('/api/vehicles',{method:'POST',body:JSON.stringify({
    make, model, year, battery_capacity_kwh:battery, connector_types:connectors, max_charging_power_kw:power
  })});
  if(d.vehicle){
    notify('success','Vehicle added!');
    const form = document.getElementById('add-vehicle-form');
    if(form) form.remove();
    loadVehiclesPage();
  } else notify('error', d.error||'Failed to add vehicle');
}

/* ===================== CHARGING SESSION ===================== */
let chargePctVal = 40, chargeSeconds=760, chargeKwh=9.4, chargeCost=169;
const RING_CIRC = 703.7;
function tickCharge(){
  if(chargePctVal>=80) return;
  chargePctVal += 0.4; chargeSeconds += 4; chargeKwh += 0.045; chargeCost += 0.7;
  document.getElementById('chargePct').textContent = Math.round(chargePctVal)+'%';
  document.getElementById('chargeRing').setAttribute('stroke-dashoffset', RING_CIRC - (RING_CIRC*chargePctVal/100));
  document.getElementById('s-energy').textContent = chargeKwh.toFixed(1)+' kWh';
  document.getElementById('s-cost').textContent = '₹'+Math.round(chargeCost);
  const h=String(Math.floor(chargeSeconds/3600)).padStart(2,'0'), m=String(Math.floor(chargeSeconds%3600/60)).padStart(2,'0'), ss=String(Math.floor(chargeSeconds%60)).padStart(2,'0');
  document.getElementById('s-time').textContent = `${h}:${m}:${ss}`;
  document.getElementById('s-power').textContent = (55+Math.random()*6).toFixed(1)+' kW';
}
setInterval(tickCharge, 1500);
function stopCharging(){ notify('info','Charging stopped. Grace period: 5 min before idle fee.'); go('dashboard'); }


/* ===================== REWARDS — from API ===================== */
async function loadRewardsPage(){
  try {
    var d = await api('/api/rewards');
    if(d.rewards){
      var r = d.rewards;
      document.getElementById('rewards-subtitle').textContent = r.points.toLocaleString('en-IN')+' points · '+r.tier+' tier';
      var progHtml = '<div class="factor-bar"><div class="fh"><span>'+r.tier+'</span><span>'+r.points.toLocaleString('en-IN');
      if(r.next_tier) progHtml += ' / '+r.next_tier_target.toLocaleString('en-IN')+' to '+r.next_tier;
      else progHtml += ' · Max tier!';
      progHtml += '</span></div><div class="factor-track"><div class="factor-fill" style="width:'+r.progress+'%;"></div></div></div>';
      document.getElementById('rewards-progress').innerHTML = progHtml;
    }
    if(d.badges){
      document.getElementById('badge-grid').innerHTML = d.badges.map(function(b){
        return '<div class="glass badge-card '+(b.earned?'':'locked')+'"><div class="bi2">'+b.icon+'</div><div class="bt">'+b.name+'</div><div class="bd">'+b.description+'</div></div>';
      }).join('');
    }
  } catch(e){ console.error('Rewards load error',e); }
}
async function redeemReward(option){
  var d = await api('/api/rewards/redeem',{method:'POST',body:JSON.stringify({option:option})});
  if(d.message){ notify('success',d.message); loadRewardsPage(); }
  else notify('error',d.error||'Failed to redeem');
}

/* ===================== ROUTE PLANNER — real geocoding + OSRM routing ===================== */
var routeVehicles = [];
var routeMap = null;
var routeLayer = null;
var markerLayer = null;

function selectPriority(el){
  document.querySelectorAll('#route-priority .chip').forEach(function(c){c.classList.remove('on');});
  el.classList.add('on');
}
async function loadRouteVehicles(){
  var d = await api('/api/vehicles');
  if(d.vehicles){
    routeVehicles = d.vehicles;
    var sel = document.getElementById('route-vehicle');
    sel.innerHTML = d.vehicles.map(function(v){ return '<option value="'+v.id+'" data-cap="'+v.battery_capacity_kwh+'" data-range="'+(v.current_range_km||210)+'">'+v.make+' '+v.model+'</option>'; }).join('');
  }
}

function initRouteMap(){
  var container = document.getElementById('route-map');
  if(!container) return;
  if(routeMap){ routeMap.invalidateSize(); return; }
  routeMap = L.map('route-map',{zoomControl:true,attributionControl:false}).setView([20.5937,78.9629],5);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:18}).addTo(routeMap);
  routeLayer = L.layerGroup().addTo(routeMap);
  markerLayer = L.layerGroup().addTo(routeMap);
}

async function planRoute(){
  var fromInput = document.getElementById('route-from').value.trim();
  var toInput = document.getElementById('route-to').value.trim();
  if(!fromInput||!toInput){ notify('error','Enter both From and To locations'); return; }

  var batteryInput = parseInt(document.getElementById('route-battery').value)||34;
  var sel = document.getElementById('route-vehicle');
  var opt = sel.options[sel.selectedIndex];
  var cap = opt?parseFloat(opt.dataset.cap)||40.5:40.5;
  var range = opt?parseFloat(opt.dataset.range)||210:210;
  var priorityEl = document.querySelector('#route-priority .chip.on');
  var priority = priorityEl?priorityEl.dataset.p:'fastest';

  document.getElementById('route-timeline').innerHTML = '<div class="route-stop"><div class="rs-meta"> Geocoding locations and calculating road route...</div></div>';
  document.getElementById('route-summary').textContent = 'Calculating...';

  var d = await api('/api/route-planner',{method:'POST',body:JSON.stringify({
    from:fromInput, to:toInput,
    battery_pct:batteryInput, battery_capacity_kwh:cap, range_km:range, priority:priority
  })});

  if(d.error){
    document.getElementById('route-timeline').innerHTML = '<div class="route-stop"><div class="rs-meta" style="color:var(--red);">'+d.error+'</div></div>';
    document.getElementById('route-summary').textContent = 'Route failed';
    return;
  }

  if(d.route){
    var r = d.route;
    var durHrs = Math.floor(r.estimated_duration_minutes/60);
    var durMin = r.estimated_duration_minutes%60;
    var durStr = durHrs>0 ? durHrs+'h '+durMin+'m' : durMin+' min';
    document.getElementById('route-summary').textContent = 'Route · '+r.total_distance_km+' km · ~'+durStr;

    var html = '<div class="route-stop"><div class="rs-title"> Depart — '+r.from+'</div><div class="rs-meta">Battery '+r.start_battery_pct+'% · 0 km</div></div>';
    r.stops.forEach(function(s,i){
      html += '<div class="route-stop"><div class="rs-title"> Stop '+(i+1)+' · '+s.station_name+'</div>'+
        '<div class="rs-meta">'+s.city+', '+s.state+' · '+s.distance_from_start_km+' km from start</div>'+
        '<div class="rs-meta">Arrive '+s.arrival_battery_pct+'% → Charge to '+s.target_battery_pct+'% · '+s.charge_minutes+' min · ₹'+s.charge_cost+' · '+s.power_kw+'kW</div></div>';
    });
    html += '<div class="route-stop"><div class="rs-title"> Arrive — '+r.to+'</div>'+
      '<div class="rs-meta">Battery on arrival ~'+r.arrival_battery_pct+'% · Total '+r.total_distance_km+' km · '+durStr+'</div></div>';

    if(r.total_charging_cost>0){
      html += '<div style="margin-top:12px;padding:10px 14px;border-radius:10px;background:rgba(0,240,255,0.06);border:1px solid var(--border-bright);font-size:12.5px;">'+
        '<div style="display:flex;justify-content:space-between;margin-bottom:4px;"><span>Charging stops</span><strong>'+r.charging_stops+'</strong></div>'+
        '<div style="display:flex;justify-content:space-between;margin-bottom:4px;"><span>Total charging time</span><strong>'+r.total_charging_minutes+' min</strong></div>'+
        '<div style="display:flex;justify-content:space-between;"><span>Total charging cost</span><strong class="c-cyan">₹'+r.total_charging_cost+'</strong></div></div>';
    }

    document.getElementById('route-timeline').innerHTML = html;
    notify('success','Route planned — '+r.charging_stops+' charging stop'+(r.charging_stops!==1?'s':'')+' · '+r.total_distance_km+' km');

    // Render on Leaflet map
    setTimeout(function(){ initRouteMap(); renderRouteOnMap(r); },100);
  }
}

function renderRouteOnMap(r){
  if(!routeMap) return;
  routeLayer.clearLayers();
  markerLayer.clearLayers();

  var bounds = L.latLngBounds([]);

  // Draw route polyline from OSRM geometry
  if(r.geometry && r.geometry.coordinates){
    var latlngs = r.geometry.coordinates.map(function(c){return [c[1],c[0]];});
    var polyline = L.polyline(latlngs,{color:'#00f0ff',weight:4,opacity:0.8});
    routeLayer.addLayer(polyline);
    bounds.extend(polyline.getBounds());
  } else {
    // Fallback: straight line
    var line = L.polyline([[r.from_lat,r.from_lng],[r.to_lat,r.to_lng]],{color:'#00f0ff',weight:3,dashArray:'8,8'});
    routeLayer.addLayer(line);
    bounds.extend(line.getBounds());
  }

  // Start marker (green)
  var startIcon = L.divIcon({className:'',html:'<div style="width:18px;height:18px;border-radius:50%;background:#39ff14;border:3px solid #fff;box-shadow:0 0 8px rgba(57,255,20,0.6);"></div>',iconSize:[18,18],iconAnchor:[9,9]});
  L.marker([r.from_lat,r.from_lng],{icon:startIcon}).addTo(markerLayer).bindPopup('<b>Start</b><br>'+r.from);
  bounds.extend([r.from_lat,r.from_lng]);

  // End marker (red)
  var endIcon = L.divIcon({className:'',html:'<div style="width:18px;height:18px;border-radius:50%;background:#ff3b5c;border:3px solid #fff;box-shadow:0 0 8px rgba(255,59,92,0.6);"></div>',iconSize:[18,18],iconAnchor:[9,9]});
  L.marker([r.to_lat,r.to_lng],{icon:endIcon}).addTo(markerLayer).bindPopup('<b>Destination</b><br>'+r.to);
  bounds.extend([r.to_lat,r.to_lng]);

  // Charging stop markers (cyan/yellow)
  r.stops.forEach(function(s,i){
    var stopIcon = L.divIcon({className:'',html:'<div style="width:22px;height:22px;border-radius:50%;background:#00f0ff;border:3px solid #fff;box-shadow:0 0 10px rgba(0,240,255,0.6);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:bold;color:#000;"><svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;flex-shrink:0"><path d="m13 2-9 12h7l-1 8 10-12h-7l1-8Z"/></svg></div>',iconSize:[22,22],iconAnchor:[11,11]});
    L.marker([s.latitude,s.longitude],{icon:stopIcon}).addTo(markerLayer)
      .bindPopup('<b>Stop '+(i+1)+'</b><br>'+s.station_name+'<br>'+s.city+', '+s.state+'<br>'+s.power_kw+'kW · ₹'+s.price_per_kwh+'/kWh<br>Charge '+s.charge_minutes+' min · ₹'+s.charge_cost);
    bounds.extend([s.latitude,s.longitude]);
  });

  // Nearby station markers (small green dots)
  if(r.nearby_stations){
    r.nearby_stations.forEach(function(ns){
      var isStop = r.stops.some(function(st){return st.station_id===ns.id;});
      if(isStop) return;
      var nsIcon = L.divIcon({className:'',html:'<div style="width:10px;height:10px;border-radius:50%;background:rgba(57,255,20,0.6);border:1.5px solid #fff;"></div>',iconSize:[10,10],iconAnchor:[5,5]});
      L.marker([ns.latitude,ns.longitude],{icon:nsIcon}).addTo(markerLayer)
        .bindPopup(ns.name+'<br>'+ns.city+', '+ns.state+'<br>'+ns.max_power+'kW · ₹'+ns.min_price+'/kWh');
    });
  }

  routeMap.fitBounds(bounds,{padding:[30,30]});
}

/* ===================== SUBSCRIPTIONS — from API ===================== */
async function loadSubscriptionsPage(){
  try {
    var d = await api('/api/subscriptions');
    if(d.plans){
      document.getElementById('plans-grid').innerHTML = d.plans.map(function(p){
        var popular = p.id==='plus';
        var border = p.is_current?'border-color:var(--border-bright);':'';
        var priceStr = p.price===0?'₹0':'₹'+p.price;
        return '<div class="glass feature-card" style="'+border+'cursor:default;">'+
          '<h3 style="font-size:17px;">'+p.name+' '+(p.is_current?'<span class="tag" style="background:rgba(0,240,255,0.15);color:var(--cyan);">Current</span>':popular?'<span class="tag" style="background:rgba(0,240,255,0.15);color:var(--cyan);">Popular</span>':'')+'</h3>'+
          '<div style="font-family:var(--mono);font-size:26px;font-weight:800;margin:10px 0;">'+priceStr+'<span style="font-size:13px;color:var(--text-dimmer);">/month</span></div>'+
          '<ul style="list-style:none;font-size:12.5px;color:var(--text-dim);line-height:2;">'+p.features.map(function(f){return '<li>✓ '+f+'</li>';}).join('')+'</ul>'+
          '<button class="btn '+(p.is_current?'btn-ghost':popular?'btn-primary':'btn-ghost')+' btn-sm" style="width:100%;margin-top:10px;" onclick="switchPlan(\''+p.id+'\')">'+(p.is_current?'Current Plan':'Choose Plan')+'</button>'+
          '</div>';
      }).join('');
    }
  } catch(e){ console.error('Subscriptions load error',e); }
}
async function switchPlan(planId){
  var d = await api('/api/subscriptions',{method:'POST',body:JSON.stringify({plan:planId})});
  if(d.message){ notify('success',d.message); loadSubscriptionsPage(); }
  else notify('error',d.error||'Failed to switch plan');
}

/* ===================== COMMUNITY — from API ===================== */
async function loadCommunityPage(){
  try {
    var d = await api('/api/community');
    if(d.reports){
      var icons = {broken:'<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;flex-shrink:0"><path d="M14 3a6 6 0 0 0-7 8l-5 5a3 3 0 0 0 4 4l5-5a6 6 0 0 0 8-7l-4 4-3-3 4-4Z"/></svg>',icing:'<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;flex-shrink:0"><path d="m5 6 2-3h10l2 3 2 5v7H3v-7l2-5ZM3 11h18M6 18v3m12-3v3M6 14h2m8 0h2"/></svg>',pricing:'<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;flex-shrink:0"><rect x="2" y="4" width="20" height="16" rx="3"/><path d="M2 10h20M6 16h4"/></svg>',safety:'<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;flex-shrink:0"><path d="m12 2 11 20H1L12 2Zm0 6v6m0 3v1"/></svg>',other:'<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;flex-shrink:0"><path d="M14 2H4v20h16V8l-6-6Zm0 0v6h6M8 13h8m-8 4h6"/></svg>'};
      var statusColors = {submitted:'c-cyan',investigating:'c-amber',verified:'c-green',resolved:'c-cyan',dismissed:'c-red'};
      document.getElementById('community-list').innerHTML = d.reports.map(function(r,i){
        var time = new Date(r.created_at).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'});
        return '<div class="station-row" style="cursor:pointer;flex-wrap:wrap;" onclick="toggleReport('+i+')">'+
          '<div class="l" style="flex:1;"><span style="font-size:18px;">'+(icons[r.category]||'<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;flex-shrink:0"><path d="M14 2H4v20h16V8l-6-6Zm0 0v6h6M8 13h8m-8 4h6"/></svg>')+'</span><div><div class="name">'+r.title+'</div><div class="meta">'+r.station_name+' · '+r.station_city+'</div></div></div>'+
          '<span class="tag '+(statusColors[r.status]||'c-cyan')+'" style="background:rgba(255,255,255,0.06);">'+r.status.charAt(0).toUpperCase()+r.status.slice(1)+'</span>'+
          '<div id="report-detail-'+i+'" style="display:none;width:100%;padding:12px 0 4px 36px;font-size:12.5px;color:var(--text-dim);line-height:1.7;">'+
            '<div><strong>Category:</strong> '+r.category.charAt(0).toUpperCase()+r.category.slice(1)+'</div>'+
            (r.description?'<div style="margin-top:6px;"><strong>Details:</strong> '+r.description+'</div>':'')+
            '<div style="margin-top:6px;"><strong>Reported by:</strong> '+(r.reporter_name||'User')+' · '+time+'</div>'+
            '<div style="margin-top:6px;"><strong>Status:</strong> <span class="'+(statusColors[r.status]||'c-cyan')+'">'+r.status.charAt(0).toUpperCase()+r.status.slice(1)+'</span></div>'+
          '</div>'+
          '</div>';
      }).join('') || '<p style="color:var(--text-dimmer);padding:12px;">No reports yet.</p>';
    }
  } catch(e){ console.error('Community load error',e); }
}
function toggleReport(idx){
  var el = document.getElementById('report-detail-'+idx);
  if(el) el.style.display = el.style.display==='none'?'block':'none';
}
function showReportForm(){
  var wrap = document.getElementById('report-form-wrap');
  wrap.style.display = wrap.style.display==='none'?'block':'none';
  var sel = document.getElementById('report-station');
  if(sel.options.length<=1){
    sel.innerHTML = DB_STATIONS.map(function(s){ return '<option value="'+s.id+'">'+s.name+'</option>'; }).join('');
  }
}
async function submitReport(){
  var stationId = document.getElementById('report-station').value;
  var category = document.getElementById('report-category').value;
  var title = document.getElementById('report-title').value.trim();
  var desc = document.getElementById('report-desc').value.trim();
  if(!title){ notify('error','Please enter a title'); return; }
  var d = await api('/api/community',{method:'POST',body:JSON.stringify({station_id:stationId,category:category,title:title,description:desc})});
  if(d.report){
    notify('success','Report submitted — thanks for helping the community!');
    document.getElementById('report-form-wrap').style.display='none';
    document.getElementById('report-title').value='';
    document.getElementById('report-desc').value='';
    loadCommunityPage();
  } else notify('error',d.error||'Failed to submit report');
}

/* ===================== AI ASSISTANT — uses real station data ===================== */
const AI_SUGGESTIONS = ['Find a charger near me','Can I reach Pune with 25%?','Cheapest station right now?','Optimize my charging route'];
document.getElementById('ai-suggest').innerHTML = AI_SUGGESTIONS.map(s=>`<button onclick="sendAI('${s.replace(/'/g,"\\'")}')">${s}</button>`).join('');

function toggleAI(force){
  const p = document.getElementById('ai-panel');
  const open = force!==undefined ? force : !p.classList.contains('open');
  p.classList.toggle('open', open);
  if(open && !p.dataset.inited){
    p.dataset.inited='1';
    const name = currentUser?currentUser.name.split(' ')[0]:'there';
    pushMsg('bot',`Hey ${name}  I'm your VoltRoute AI. Ask me anything about chargers, routes, or costs. Data from ${DB_STATIONS.length} stations.`);
  }
}
function pushMsg(role,text){
  const body = document.getElementById('ai-body');
  const d = document.createElement('div'); d.className = 'msg '+role; d.textContent = text;
  body.appendChild(d); body.scrollTop = body.scrollHeight;
}
function pushCard(title,html){
  const body = document.getElementById('ai-body');
  const d = document.createElement('div'); d.className='msg-card';
  d.innerHTML = `<div class="mc-h"><span>${title}</span></div>${html}`;
  body.appendChild(d); body.scrollTop = body.scrollHeight;
}
function showTyping(cb){
  const body = document.getElementById('ai-body');
  const t = document.createElement('div');
  t.className='msg bot typing'; t.id='typingIndicator';
  t.innerHTML = '<span></span><span></span><span></span>';
  body.appendChild(t); body.scrollTop = body.scrollHeight;
  setTimeout(()=>{ t.remove(); cb(); }, 900+Math.random()*500);
}
function sendAI(preset){
  const input = document.getElementById('ai-input');
  const text = preset || input.value.trim();
  if(!text) return;
  pushMsg('user',text);
  input.value='';
  showTyping(()=>respondAI(text.toLowerCase()));
}
function respondAI(q){
  const available = DB_STATIONS.filter(s=>s.status==='available');
  if(q.includes('near me')||q.includes('find')){
    const top = available.sort((a,b)=>b.score-a.score).slice(0,3);
    pushMsg('bot',`Found ${top.length} available chargers. Top pick: ${top[0]?.name||'—'}, VoltScore ${top[0]?.score||0}.`);
    if(top[0]) pushCard(top[0].name,`<div style="display:flex;justify-content:space-between;"><span>VoltScore</span><strong class="c-green">${top[0].score}</strong></div><div style="display:flex;justify-content:space-between;"><span>Price</span><strong>₹${top[0].price}/kWh</strong></div><div style="display:flex;justify-content:space-between;"><span>Speed</span><strong>${top[0].speed}</strong></div><button class="btn btn-primary btn-sm" style="width:100%;margin-top:8px;" onclick="openStation('${top[0].id}');toggleAI(false);">View Station</button>`);
  } else if(q.includes('reach') || q.includes('pune') || q.includes('25%')){
    const lonavala = DB_STATIONS.find(s=>s.name.toLowerCase().includes('lonavala'));
    pushMsg('bot',`With 25% battery (≈53km range) you can reach Lonavala but not Pune directly. I recommend a stop at ${lonavala?lonavala.name:'a highway charger'} to top up.`);
  } else if(q.includes('cheapest')){
    const cheapest = [...available].sort((a,b)=>a.price-b.price)[0];
    if(cheapest){
      pushMsg('bot',`${cheapest.name} has the lowest rate at ₹${cheapest.price}/kWh and is currently available.`);
      pushCard('Cheapest Now',`<div style="display:flex;justify-content:space-between;"><span>${cheapest.name}</span><strong class="c-green">₹${cheapest.price}/kWh</strong></div>`);
    } else pushMsg('bot','No available stations found right now.');
  } else if(q.includes('optimize') || q.includes('route')){
    const best = available.sort((a,b)=>b.score-a.score)[0];
    pushMsg('bot',`Based on your battery and destination, I recommend ${best?best.name:'the nearest station'} — best balance of speed (${best?.speed||'—'}) and cost (₹${best?.price||'—'}/kWh).`);
  } else if(q.includes('café') || q.includes('cafe') || q.includes('amenities')){
    const withCafe = DB_STATIONS.filter(s=>s.amenities.includes('Café'));
    pushMsg('bot',`${withCafe.length} stations have cafés nearby: ${withCafe.slice(0,3).map(s=>s.name).join(', ')}.`);
  } else {
    pushMsg('bot',`I have data on ${DB_STATIONS.length} charging stations. Ask me to find chargers, compare prices, plan routes, or check availability!`);
  }
}

/* ===================== TOAST ===================== */
function notify(type,msg){
  const wrap = document.getElementById('toast-wrap');
  const colors = {success:['rgba(57,255,20,0.12)','var(--green)','✓'], info:['rgba(0,240,255,0.12)','var(--cyan)','ℹ'], error:['rgba(255,59,92,0.12)','var(--red)','!']};
  const c = colors[type]||colors.info;
  const t = document.createElement('div'); t.className='toast glass';
  t.style.background=c[0]; t.style.borderColor=c[1]; t.style.color='var(--text)';
  t.innerHTML = `<span style="color:${c[1]};font-weight:800;">${c[2]}</span> ${msg}`;
  wrap.appendChild(t);
  setTimeout(()=>{ t.style.opacity='0'; t.style.transform='translateX(30px)'; t.style.transition='all .3s'; setTimeout(()=>t.remove(),300); }, 3400);
}

/* ===================== PROFILE — from API ===================== */
async function loadProfilePage(){
  try {
    var d = await api('/api/profile');
    if(d.user){
      var initials = d.user.name.split(' ').map(function(w){return w[0];}).join('').toUpperCase();
      document.getElementById('profile-avatar').textContent = initials;
      document.getElementById('profile-name').textContent = d.user.name;
      document.getElementById('profile-email').textContent = d.user.email+' · Mumbai, IN';
    }
  } catch(e){ console.error('Profile load error',e); }
}

/* ===================== INIT ===================== */
async function init(){
  await ensureAuth();
  await loadStations();
  renderDashStations();
  loadRouteVehicles();
  planRoute();
  go('landing');
}
init();
