import { useEffect, useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { MapContainer, TileLayer, Polyline, CircleMarker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

const destination = {
  lat: Number(import.meta.env.VITE_CAFE_LAT) || 16.705,
  lng: Number(import.meta.env.VITE_CAFE_LNG) || 74.2433,
};
const cafeName = import.meta.env.VITE_CAFE_NAME || 'New Friendship Cafe';

function FitRoute({ coordinates }) {
  const map = useMap();
  useEffect(() => {
    if (!coordinates?.length) return undefined;
    const timer = window.setTimeout(() => map.fitBounds(coordinates, { padding: [34, 34], maxZoom: 15 }), 100);
    return () => window.clearTimeout(timer);
  }, [map, coordinates]);
  return null;
}

export default function CafeDirectionsModal({ onClose }) {
  const { t } = useLanguage();
  const [start, setStart] = useState(null);
  const [manualStart, setManualStart] = useState('');
  const [route, setRoute] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!navigator.geolocation) {
      setError('Location is unavailable in this browser. Enter a start point as latitude, longitude.');
      return undefined;
    }
    setBusy(true);
    navigator.geolocation.getCurrentPosition(({ coords }) => {
      findRoute({ lat: coords.latitude, lng: coords.longitude });
    }, (geoError) => {
      setError(geoError.code === geoError.PERMISSION_DENIED
        ? 'Location permission was denied. Enter a start point as latitude, longitude.'
        : 'Could not get your location. Enter a start point as latitude, longitude.');
      setBusy(false);
    }, { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 });
  }, []);

  useEffect(() => {
    function onKeyDown(event) { if (event.key === 'Escape') onClose(); }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  async function findRoute(point) {
    if (!point || !Number.isFinite(point.lat) || !Number.isFinite(point.lng)
      || Math.abs(point.lat) > 90 || Math.abs(point.lng) > 180) {
      setError('Enter valid coordinates as latitude, longitude.');
      return;
    }
    setBusy(true); setError(''); setRoute(null);
    try {
      const url = 'https://router.project-osrm.org/route/v1/driving/'
        + point.lng + ',' + point.lat + ';' + destination.lng + ',' + destination.lat
        + '?overview=full&geometries=geojson';
      const response = await fetch(url);
      if (!response.ok) throw new Error('The routing service is unavailable right now.');
      const data = await response.json();
      if (data.code !== 'Ok' || !data.routes?.[0]) throw new Error('No driving route could be found between these points.');
      const result = data.routes[0];
      setStart(point);
      setRoute({
        coordinates: result.geometry.coordinates.map(([lng, lat]) => [lat, lng]),
        distance: result.distance,
        duration: result.duration,
      });
    } catch (routeError) {
      setError(routeError.message || 'Unable to calculate the route. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  function submitManualStart(event) {
    event.preventDefault();
    const [lat, lng] = manualStart.split(',').map(Number);
    findRoute({ lat, lng });
  }

  const coordinates = route?.coordinates || [[destination.lat, destination.lng]];
  const googleMapsUrl = 'https://www.google.com/maps/dir/?api=1&destination='
    + destination.lat + ',' + destination.lng
    + (start ? '&origin=' + start.lat + ',' + start.lng : '');
  const distanceKm = route ? (route.distance / 1000).toFixed(1) : '';
  const durationMinutes = route ? Math.max(1, Math.round(route.duration / 60)) : 0;

  return <div className="modal-backdrop directions-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="directions-modal" role="dialog" aria-modal="true" aria-labelledby="directions-title">
      <header className="directions-heading">
        <div><p className="eyebrow">{t('COME ON IN')}</p><h2 id="directions-title">{t('Find Friendship Café')}</h2><p>{t('Road directions to')} {cafeName}, {t('Kolhapur')}.</p></div>
        <button className="close-button" onClick={onClose} aria-label={t('Close directions')}>×</button>
      </header>
      <div className="directions-map" aria-label={t('Map showing the route to Friendship Café')}>
        <MapContainer center={[destination.lat, destination.lng]} zoom={14} scrollWheelZoom className="directions-leaflet-map">
          <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <FitRoute coordinates={coordinates} />
          {route && <><Polyline positions={route.coordinates} pathOptions={{ color: '#b65e3c', weight: 6, opacity: 0.86 }} /><CircleMarker center={[start.lat, start.lng]} radius={8} pathOptions={{ color: '#fffdfa', weight: 3, fillColor: '#51384f', fillOpacity: 1 }}><Popup>{t('Your starting point')}</Popup></CircleMarker></>}
          <CircleMarker center={[destination.lat, destination.lng]} radius={9} pathOptions={{ color: '#fffdfa', weight: 3, fillColor: '#b65e3c', fillOpacity: 1 }}><Popup>{cafeName}</Popup></CircleMarker>
        </MapContainer>
      </div>
      <div className="directions-details">
        <p className="directions-destination"><span aria-hidden="true">⌖</span><strong>{cafeName}</strong><small>{t('Kolhapur')} · {destination.lat.toFixed(4)}, {destination.lng.toFixed(4)}</small></p>
        {route && <p className="route-summary" role="status"><strong>{distanceKm} {t('km')}</strong><span>·</span><strong>{t('about')} {durationMinutes} {t('min')}</strong><small>{t('Driving route')}</small></p>}
        {busy && <p className="directions-status" role="status">{t('Finding your location and road route…')}</p>}
        {error && <p className="directions-error" role="alert">{t(error)}</p>}
        {(!start || error) && <form className="manual-start-form" onSubmit={submitManualStart}><label htmlFor="manual-start">{t('Starting coordinates')}</label><div><input id="manual-start" inputMode="decimal" value={manualStart} onChange={(event) => setManualStart(event.target.value)} placeholder={t('e.g. 16.7000, 74.2400')} aria-describedby="manual-start-help" /><button className="directions-route-button" type="submit" disabled={busy}>{t('Find route')}</button></div><small id="manual-start-help">{t('Enter latitude, longitude if location access is unavailable.')}</small></form>}
        <div className="directions-actions"><a className="google-maps-button" href={googleMapsUrl} target="_blank" rel="noopener noreferrer">{t('Open in Google Maps')} <span aria-hidden="true">↗</span></a><button className="directions-close-button" onClick={onClose}>{t('Close')}</button></div>
      </div>
      <p className="map-attribution">{t('Map © OpenStreetMap contributors')} · {t('Routing by OSRM')}</p>
    </section>
  </div>;
}
