import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { getCategoryFallback } from './ranking-images.js';

const TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

export function createTileLoadCycleReporter(onStatusChange = () => {}) {
  let loaded = 0;
  let failed = 0;

  return {
    start() { loaded = 0; failed = 0; },
    success() { loaded += 1; },
    failure() { failed += 1; },
    finish() { onStatusChange({ failed: failed > 0 && loaded === 0 }); },
  };
}

function markerIcon(active = false) {
  return L.divIcon({
    className: `ranking-marker${active ? ' ranking-marker--active' : ''}`,
    html: '<span aria-hidden="true"></span>',
    iconSize: active ? [34, 42] : [26, 34],
    iconAnchor: active ? [17, 42] : [13, 34],
    popupAnchor: [0, active ? -38 : -30],
  });
}

export function createPopupContent(
  item,
  { isDesktop = globalThis.matchMedia?.('(min-width: 721px)').matches ?? true, fallbackUrl = getCategoryFallback(item.category) } = {},
) {
  const popup = document.createElement('div');
  popup.className = 'ranking-popup';
  const title = document.createElement('strong'); title.textContent = `${item.rank}위 · ${item.title}`; popup.append(title);
  if (item.address) { const address = document.createElement('p'); address.textContent = item.address; popup.append(address); }
  if (isDesktop) {
    const image = document.createElement('img');
    image.className = 'ranking-popup-image';
    image.src = item.thumbnail_url ?? item.image_url ?? fallbackUrl;
    image.alt = `${item.title} 대표 이미지`;
    image.addEventListener('error', () => { image.src = fallbackUrl; }, { once:true });
    popup.append(image);
  }
  return popup;
}

export function createLeafletAdapter(container, { onTileStatusChange = () => {} } = {}) {
  const map = L.map(container, { zoomControl: false, attributionControl: true });
  L.control.zoom({ position:'topright' }).addTo(map);
  let tileLayer;
  const markers = new Set();

  function addTiles() {
    const reporter = createTileLoadCycleReporter(onTileStatusChange);
    tileLayer = L.tileLayer(TILE_URL, { attribution: ATTRIBUTION, maxZoom: 19 });
    tileLayer.on('loading', () => reporter.start());
    tileLayer.on('tileload', () => reporter.success());
    tileLayer.on('tileerror', () => reporter.failure());
    tileLayer.on('load', () => reporter.finish());
    tileLayer.addTo(map);
  }
  addTiles();

  return {
    addMarker(item, coordinate, onClick) {
      const marker = L.marker(coordinate, { icon: markerIcon(false), title: `${item.rank}위 ${item.title}` });
      const popup = createPopupContent(item);
      marker.bindPopup(popup); marker.on('click', onClick); marker.addTo(map); markers.add(marker); return marker;
    },
    clearMarkers() { markers.forEach(marker => map.removeLayer(marker)); markers.clear(); },
    setView(coordinate, zoom, options) { map.setView(coordinate, zoom, options); },
    fitBounds(coordinates) {
      const sidebar = container.parentElement?.querySelector('.ranking-results-panel');
      const desktopPanelPadding = container.clientWidth > 720
        ? (sidebar?.dataset.sidebarState === 'collapsed' ? 88 : 440)
        : 36;
      map.fitBounds(coordinates, {
        paddingTopLeft:[desktopPanelPadding, 36],
        paddingBottomRight:[36, 36],
        maxZoom:15,
      });
    },
    selectMarker(marker, active) { marker.setIcon(markerIcon(active)); marker.setZIndexOffset(active ? 1000 : 0); },
    openPopup(marker) { marker.openPopup(); },
    invalidateSize() { map.invalidateSize(); },
    retryTiles() { if (tileLayer) { tileLayer.off(); map.removeLayer(tileLayer); } addTiles(); },
    destroy() { markers.clear(); map.remove(); },
  };
}
