import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

function markerIcon(number, active = false, { x = 0, y = 0 } = {}) {
  const baseAnchor = active ? [19, 46] : [15, 38];
  return L.divIcon({
    className: `course-marker${active ? ' course-marker--active' : ''}`,
    html: `<span aria-hidden="true">${number}</span>`,
    iconSize: active ? [38, 46] : [30, 38],
    iconAnchor: [baseAnchor[0] - x, baseAnchor[1] - y],
    popupAnchor: [x, y + (active ? -42 : -34)],
  });
}

export function createCourseLeafletAdapter(container, { onTileError = () => {} } = {}) {
  const map = L.map(container, { zoomControl: false, attributionControl: true });
  L.control.zoom({ position: 'topright' }).addTo(map);
  const markers = new Set();
  const lines = new Set();
  let tileLayer;

  function addTiles() {
    tileLayer = L.tileLayer(TILE_URL, { attribution: ATTRIBUTION, maxZoom: 19 });
    tileLayer.on('tileerror', onTileError);
    tileLayer.addTo(map);
  }

  addTiles();

  return {
    addMarker(stop, index, coordinate, onClick, offset = { x: 0, y: 0 }) {
      const number = index + 1;
      const marker = L.marker(coordinate, {
        icon: markerIcon(number, false, offset),
        title: `${number}번째 ${stop.location.title}`,
      });
      marker.courseNumber = number;
      marker.courseOffset = offset;
      const popup = document.createElement('div');
      const title = document.createElement('strong');
      title.textContent = `${number}번째 · ${stop.location.title}`;
      popup.append(title);
      if (stop.location.address) {
        const address = document.createElement('p');
        address.textContent = stop.location.address;
        popup.append(address);
      }
      marker.bindPopup(popup);
      marker.on('click', onClick);
      marker.addTo(map);
      markers.add(marker);
      return marker;
    },
    addLine(coordinates) {
      const line = L.polyline(coordinates, {
        className: 'course-route',
        color: '#315cfd',
        weight: 4,
        opacity: 0.82,
        lineCap: 'round',
      });
      line.addTo(map);
      lines.add(line);
      return line;
    },
    clearLayers() {
      markers.forEach(marker => map.removeLayer(marker));
      lines.forEach(line => map.removeLayer(line));
      markers.clear();
      lines.clear();
    },
    setView(coordinate, zoom, options) {
      map.setView(coordinate, zoom, options);
    },
    fitBounds(coordinates) {
      map.fitBounds(coordinates, { padding: [36, 36], maxZoom: 15 });
    },
    selectMarker(marker, active) {
      marker.setIcon(markerIcon(marker.courseNumber, active, marker.courseOffset));
      marker.setZIndexOffset(active ? 1000 : 0);
    },
    openPopup(marker) {
      marker.openPopup();
    },
    invalidateSize() {
      map.invalidateSize();
    },
    retryTiles() {
      if (tileLayer) {
        tileLayer.off();
        map.removeLayer(tileLayer);
      }
      addTiles();
    },
    destroy() {
      markers.clear();
      lines.clear();
      map.remove();
    },
  };
}
