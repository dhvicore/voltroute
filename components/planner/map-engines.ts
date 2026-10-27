// Two interchangeable map engines behind one small interface, so the
// VoltRoute map looks and behaves the same on OpenStreetMap or Google Maps.
type LatLng = [number, number];

export interface HtmlMarker {
  point: LatLng;
  html: string;
  className?: string;
  zIndex?: number;
  title?: string;
  onClick?: () => void;
}

export interface MapEngine {
  setTheme(theme: "dark" | "light"): void;
  setRoute(coords: LatLng[] | null, ends: HtmlMarker[]): void;
  setMarkers(markers: HtmlMarker[]): void;
  /** Pixel position, used to group pins that would overlap. */
  project(point: LatLng): { x: number; y: number };
  fit(points: LatLng[] | null, padding: { top: number; left: number; bottom: number; right: number }): void;
  zoomIn(): void;
  zoomOut(): void;
  destroy(): void;
}

export const indiaCenter: LatLng = [22.5, 79];

// ---------------- OpenStreetMap (Leaflet) ----------------
// Each engine draws into its own child element, so a quick remount never reuses a half-built map.
function mountPoint(parent: HTMLElement) {
  const el = document.createElement("div");
  el.style.position = "absolute";
  el.style.inset = "0";
  parent.appendChild(el);
  return el;
}

export async function createLeafletEngine(parent: HTMLElement, onZoom: () => void): Promise<MapEngine> {
  const L = await import("leaflet");
  const el = mountPoint(parent);
  const map = L.map(el, { zoomControl: false, attributionControl: false }).setView(indiaCenter, 5);
  L.control.attribution({ position: "bottomleft", prefix: false }).addTo(map);
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "© OpenStreetMap contributors",
  }).addTo(map);
  const routeLayer = L.layerGroup().addTo(map);
  const markerLayer = L.layerGroup().addTo(map);
  map.on("zoomend", onZoom);
  const toMarker = (m: HtmlMarker) => {
    const marker = L.marker(m.point, {
      keyboard: !!m.onClick,
      interactive: !!m.onClick,
      title: m.title,
      zIndexOffset: m.zIndex || 0,
      icon: L.divIcon({ className: m.className || "", iconSize: [0, 0], html: m.html }),
    });
    if (m.onClick) marker.on("click", m.onClick);
    return marker;
  };
  return {
    setTheme() {},
    setRoute(coords, ends) {
      routeLayer.clearLayers();
      if (!coords || coords.length < 2) return;
      L.polyline(coords, { color: "#8be4b8", weight: 18, opacity: 0.16, className: "vr-live-glow", interactive: false }).addTo(routeLayer);
      L.polyline(coords, { color: "#315d47", weight: 9, interactive: false }).addTo(routeLayer);
      L.polyline(coords, { color: "#9ae7bf", weight: 3.5, className: "vr-live-draw", interactive: false }).addTo(routeLayer);
      L.polyline(coords, { color: "#dbfce9", weight: 3, opacity: 0.7, dashArray: "2 22", className: "vr-live-flow", interactive: false }).addTo(routeLayer);
      ends.forEach((m) => toMarker({ ...m, zIndex: 2000 }).addTo(routeLayer));
    },
    setMarkers(markers) {
      markerLayer.clearLayers();
      markers.forEach((m) => toMarker(m).addTo(markerLayer));
    },
    project(point) {
      return map.latLngToLayerPoint(point);
    },
    fit(points, p) {
      if (points && points.length > 1)
        map.fitBounds(L.latLngBounds(points), {
          paddingTopLeft: [p.left, p.top],
          paddingBottomRight: [p.right, p.bottom],
          maxZoom: 16,
        });
      else map.setView(indiaCenter, 5);
    },
    zoomIn: () => map.zoomIn(),
    zoomOut: () => map.zoomOut(),
    destroy: () => {
      map.remove();
      el.remove();
    },
  };
}

// ---------------- Google Maps ----------------
const darkStyle = [
  { elementType: "geometry", stylers: [{ color: "#16221d" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#8fa79a" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#101a16" }] },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#2a3a33" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#3a4d44" }] },
  { featureType: "road", elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#0f1b1f" }] },
  { featureType: "landscape.natural", elementType: "geometry", stylers: [{ color: "#1a2a22" }] },
  { featureType: "administrative", elementType: "geometry.stroke", stylers: [{ color: "#33463d" }] },
];
const lightStyle = [
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  { featureType: "road", elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#cfe3dc" }] },
  { featureType: "landscape", elementType: "geometry", stylers: [{ color: "#eef3ef" }] },
];

let googleLoader: Promise<any> | null = null;
function loadGoogle(key: string): Promise<any> {
  const w = window as any;
  if (w.google?.maps) return Promise.resolve(w.google);
  googleLoader ??= new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&v=weekly&region=IN&language=en`;
    script.async = true;
    script.onload = () => resolve(w.google);
    script.onerror = () => reject(new Error("Google Maps failed to load"));
    document.head.appendChild(script);
  });
  return googleLoader;
}

export async function createGoogleEngine(
  parent: HTMLElement,
  key: string,
  onZoom: () => void,
  theme: "dark" | "light",
): Promise<MapEngine> {
  const google = await loadGoogle(key);
  const gm = google.maps;
  const el = mountPoint(parent);
  const map = new gm.Map(el, {
    center: { lat: indiaCenter[0], lng: indiaCenter[1] },
    zoom: 5,
    disableDefaultUI: true,
    clickableIcons: false,
    gestureHandling: "greedy",
    styles: theme === "dark" ? darkStyle : lightStyle,
    backgroundColor: theme === "dark" ? "#16221d" : "#eef3ef",
  });
  map.addListener("zoom_changed", onZoom);

  // HTML pins drawn in an overlay so they look identical to the OpenStreetMap version.
  class HtmlOverlay extends gm.OverlayView {
    div: HTMLDivElement;
    constructor(private m: HtmlMarker) {
      super();
      this.div = document.createElement("div");
      this.div.className = m.className || "";
      this.div.style.position = "absolute";
      this.div.style.zIndex = String(1000 + (m.zIndex || 0));
      this.div.innerHTML = m.html;
      if (m.title) this.div.title = m.title;
      if (m.onClick) {
        this.div.style.cursor = "pointer";
        this.div.tabIndex = 0;
        this.div.addEventListener("click", (e) => {
          e.stopPropagation();
          m.onClick!();
        });
      }
    }
    onAdd() {
      this.getPanes()[this.m.onClick ? "overlayMouseTarget" : "overlayLayer"].appendChild(this.div);
    }
    draw() {
      const p = this.getProjection().fromLatLngToDivPixel(new gm.LatLng(this.m.point[0], this.m.point[1]));
      if (p) {
        this.div.style.left = `${p.x}px`;
        this.div.style.top = `${p.y}px`;
      }
    }
    onRemove() {
      this.div.remove();
    }
  }

  let routeParts: any[] = [];
  let markers: any[] = [];
  let projector: any = null;
  // A blank overlay gives access to the map projection for grouping pins.
  const probe = new (class extends gm.OverlayView {
    onAdd() {}
    draw() {
      projector = this.getProjection();
    }
    onRemove() {}
  })();
  probe.setMap(map);

  return {
    setTheme(next) {
      map.setOptions({ styles: next === "dark" ? darkStyle : lightStyle, backgroundColor: next === "dark" ? "#16221d" : "#eef3ef" });
    },
    setRoute(coords, ends) {
      routeParts.forEach((p) => p.setMap(null));
      routeParts = [];
      if (!coords || coords.length < 2) return;
      const path = coords.map(([lat, lng]) => ({ lat, lng }));
      routeParts = [
        new gm.Polyline({ path, strokeColor: "#8be4b8", strokeOpacity: 0.18, strokeWeight: 16, clickable: false }),
        new gm.Polyline({ path, strokeColor: "#315d47", strokeOpacity: 1, strokeWeight: 8, clickable: false }),
        new gm.Polyline({ path, strokeColor: "#9ae7bf", strokeOpacity: 1, strokeWeight: 3.5, clickable: false }),
      ];
      routeParts.forEach((p) => p.setMap(map));
      ends.forEach((m) => {
        const o = new HtmlOverlay({ ...m, zIndex: 2000 });
        o.setMap(map);
        routeParts.push(o);
      });
    },
    setMarkers(next) {
      markers.forEach((m) => m.setMap(null));
      markers = next.map((m) => {
        const o = new HtmlOverlay(m);
        o.setMap(map);
        return o;
      });
    },
    project(point) {
      const p = projector?.fromLatLngToDivPixel(new gm.LatLng(point[0], point[1]));
      return p ? { x: p.x, y: p.y } : { x: 0, y: 0 };
    },
    fit(points, p) {
      if (points && points.length > 1) {
        const bounds = new gm.LatLngBounds();
        points.forEach(([lat, lng]) => bounds.extend({ lat, lng }));
        map.fitBounds(bounds, p);
      } else {
        map.setCenter({ lat: indiaCenter[0], lng: indiaCenter[1] });
        map.setZoom(5);
      }
    },
    zoomIn: () => map.setZoom((map.getZoom() || 5) + 1),
    zoomOut: () => map.setZoom((map.getZoom() || 5) - 1),
    destroy() {
      routeParts.forEach((p) => p.setMap(null));
      markers.forEach((m) => m.setMap(null));
      probe.setMap(null);
      el.remove();
    },
  };
}
