export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { ensureInit } from "@/lib/init";

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function pointToSegmentDistance(px: number, py: number, ax: number, ay: number, bx: number, by: number) {
  const dx = bx - ax, dy = by - ay;
  if (dx === 0 && dy === 0) return haversineKm(px, py, ax, ay);
  let t = ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy);
  t = Math.max(0, Math.min(1, t));
  return haversineKm(px, py, ax + t * dx, ay + t * dy);
}

async function geocode(query: string): Promise<{ lat: number; lng: number; display: string } | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query + ", India")}&format=json&limit=1&countrycodes=in`;
    const res = await fetch(url, {
      headers: { "User-Agent": "VoltRoute-EV-App/1.0" },
      signal: AbortSignal.timeout(8000),
    });
    const data = await res.json();
    if (data.length > 0) {
      return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon), display: data[0].display_name.split(",").slice(0, 2).join(",").trim() };
    }
  } catch (e) { console.error("[geocode]", e); }
  return null;
}

async function getRoute(fromLat: number, fromLng: number, toLat: number, toLng: number) {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${fromLng},${fromLat};${toLng},${toLat}?overview=full&geometries=geojson&steps=false`;
    const res = await fetch(url, {
      headers: { "User-Agent": "VoltRoute-EV-App/1.0" },
      signal: AbortSignal.timeout(15000),
    });
    const data = await res.json();
    if (data.code === "Ok" && data.routes?.length > 0) {
      const route = data.routes[0];
      return {
        distance_km: Math.round(route.distance / 1000),
        duration_minutes: Math.round(route.duration / 60),
        geometry: route.geometry,
      };
    }
  } catch (e) { console.error("[osrm]", e); }
  return null;
}

interface StationRow {
  id: string; name: string; city: string; state: string; latitude: number; longitude: number;
  min_price: number; max_power: number; available_chargers: number;
}

export async function POST(req: NextRequest) {
  ensureInit();
  try {
    const auth = requireAuth(req);
    const body = await req.json();
    const { from, to, from_lat, from_lng, to_lat, to_lng, battery_pct, battery_capacity_kwh, range_km, priority } = body;

    let startLat = from_lat, startLng = from_lng, endLat = to_lat, endLng = to_lng;
    let fromDisplay = from || "Start";
    let toDisplay = to || "Destination";

    if (from && (!from_lat || !from_lng)) {
      const geo = await geocode(from);
      if (!geo) return NextResponse.json({ error: `Could not find location: "${from}"` }, { status: 400 });
      startLat = geo.lat; startLng = geo.lng; fromDisplay = geo.display;
    }
    if (to && (!to_lat || !to_lng)) {
      const geo = await geocode(to);
      if (!geo) return NextResponse.json({ error: `Could not find location: "${to}"` }, { status: 400 });
      endLat = geo.lat; endLng = geo.lng; toDisplay = geo.display;
    }

    if (!startLat || !startLng || !endLat || !endLng) {
      return NextResponse.json({ error: "Provide 'from' and 'to' place names, or from_lat/from_lng/to_lat/to_lng" }, { status: 400 });
    }

    const batteryPct = battery_pct || 34;
    const batteryCapKwh = battery_capacity_kwh || 40.5;
    const fullRangeKm = range_km || 210;

    const routeResult = await getRoute(startLat, startLng, endLat, endLng);

    let totalDistKm: number;
    let durationMin: number;
    let geometry: any = null;
    let routeCoords: [number, number][] = [];

    if (routeResult) {
      totalDistKm = routeResult.distance_km;
      durationMin = routeResult.duration_minutes;
      geometry = routeResult.geometry;
      routeCoords = geometry.coordinates.map((c: number[]) => [c[1], c[0]]);
    } else {
      totalDistKm = Math.round(haversineKm(startLat, startLng, endLat, endLng) * 1.3);
      durationMin = Math.round(totalDistKm / 60 * 60);
      routeCoords = [[startLat, startLng], [endLat, endLng]];
    }

    const db = getDb();
    const allStations = db.prepare(`
      SELECT s.id, s.name, s.city, s.state, s.latitude, s.longitude,
        MIN(c.price_per_kwh) as min_price,
        MAX(c.power_kw) as max_power,
        SUM(CASE WHEN c.status='available' THEN 1 ELSE 0 END) as available_chargers
      FROM stations s
      JOIN chargers c ON c.station_id = s.id
      WHERE s.is_enabled = 1
      GROUP BY s.id
      HAVING available_chargers > 0
    `).all() as StationRow[];

    const searchRadiusKm = Math.max(25, totalDistKm * 0.1);

    const stationsNearRoute = allStations
      .map(station => {
        let minDist = Infinity;
        if (routeCoords.length > 1) {
          for (let i = 0; i < routeCoords.length - 1; i += Math.max(1, Math.floor(routeCoords.length / 200))) {
            const d = pointToSegmentDistance(
              station.latitude, station.longitude,
              routeCoords[i][0], routeCoords[i][1],
              routeCoords[Math.min(i + 1, routeCoords.length - 1)][0],
              routeCoords[Math.min(i + 1, routeCoords.length - 1)][1]
            );
            if (d < minDist) minDist = d;
          }
        } else {
          minDist = haversineKm(station.latitude, station.longitude, startLat, startLng);
        }

        const distFromStart = haversineKm(startLat, startLng, station.latitude, station.longitude);
        const distToEnd = haversineKm(station.latitude, station.longitude, endLat, endLng);

        return { ...station, distFromRoute: minDist, distFromStart, distToEnd };
      })
      .filter(s => s.distFromRoute < searchRadiusKm)
      .filter(s => s.distFromStart > 10 && s.distToEnd > 10)
      .sort((a, b) => a.distFromStart - b.distFromStart);

    const stops: any[] = [];
    let batteryKm = (batteryPct / 100) * fullRangeKm;
    let distanceCovered = 0;

    const roadDistFactor = routeResult ? totalDistKm / haversineKm(startLat, startLng, endLat, endLng) : 1.3;

    for (const station of stationsNearRoute) {
      const segDistStraight = haversineKm(
        stops.length > 0 ? stationsNearRoute[stops.length > 0 ? stops[stops.length - 1]._idx || 0 : 0].latitude : startLat,
        stops.length > 0 ? stationsNearRoute[stops.length > 0 ? stops[stops.length - 1]._idx || 0 : 0].longitude : startLng,
        station.latitude, station.longitude
      );
      const segDist = segDistStraight * roadDistFactor;
      const batteryAfterSegment = batteryKm - segDist;
      const remainToEnd = station.distToEnd * roadDistFactor;

      if (batteryAfterSegment < remainToEnd * 1.15 && batteryAfterSegment < fullRangeKm * 0.35) {
        const arrivalPct = Math.max(0, Math.round((batteryAfterSegment / fullRangeKm) * 100));
        const targetPct = Math.min(90, Math.max(arrivalPct + 20, Math.round(((remainToEnd * 1.2) / fullRangeKm) * 100)));
        const chargeNeededKwh = ((targetPct - arrivalPct) / 100) * batteryCapKwh;
        const chargePowerKw = station.max_power;
        const chargeMinutes = Math.round((chargeNeededKwh / chargePowerKw) * 60);
        const chargeCost = Math.round(chargeNeededKwh * station.min_price);

        stops.push({
          station_id: station.id,
          station_name: station.name,
          city: station.city,
          state: station.state,
          latitude: station.latitude,
          longitude: station.longitude,
          distance_from_start_km: Math.round(station.distFromStart * roadDistFactor),
          arrival_battery_pct: arrivalPct,
          target_battery_pct: targetPct,
          charge_minutes: chargeMinutes,
          charge_cost: chargeCost,
          power_kw: chargePowerKw,
          price_per_kwh: station.min_price,
          _idx: stationsNearRoute.indexOf(station),
        });

        batteryKm = (targetPct / 100) * fullRangeKm;
      }
    }

    const finalSegDist = stops.length > 0
      ? haversineKm(stops[stops.length - 1].latitude, stops[stops.length - 1].longitude, endLat, endLng) * roadDistFactor
      : totalDistKm;
    const arrivalPct = Math.max(0, Math.round(((batteryKm - finalSegDist) / fullRangeKm) * 100));
    const totalChargingMinutes = stops.reduce((s: number, st: any) => s + st.charge_minutes, 0);
    const totalChargingCost = stops.reduce((s: number, st: any) => s + st.charge_cost, 0);

    const cleanStops = stops.map(({ _idx, ...rest }) => rest);

    return NextResponse.json({
      route: {
        from: fromDisplay,
        to: toDisplay,
        from_lat: startLat,
        from_lng: startLng,
        to_lat: endLat,
        to_lng: endLng,
        total_distance_km: totalDistKm,
        estimated_duration_minutes: durationMin,
        start_battery_pct: batteryPct,
        arrival_battery_pct: arrivalPct,
        charging_stops: cleanStops.length,
        total_charging_minutes: totalChargingMinutes,
        total_charging_cost: totalChargingCost,
        stops: cleanStops,
        geometry,
        nearby_stations: stationsNearRoute.slice(0, 20).map(s => ({
          id: s.id, name: s.name, city: s.city, state: s.state,
          latitude: s.latitude, longitude: s.longitude,
          distance_from_route_km: Math.round(s.distFromRoute),
          max_power: s.max_power, min_price: s.min_price,
          available_chargers: s.available_chargers,
        })),
      },
    });
  } catch (e: any) {
    if (e.message === "Unauthorized") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
