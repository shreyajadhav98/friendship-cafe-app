const DEFAULT_CAFE_LOCATION = Object.freeze({
  name: 'New Friendships Ice Cafe',
  address: 'Shop No 1, Main Road, near D Y Patil Campus, Salunkhe Nagar, Survey Nagar, Kolhapur, Maharashtra 416007',
  lat: 16.666218,
  lng: 74.2062729,
});

function readCoordinate(value, fallback, minimum, maximum) {
  const coordinate = Number(value);
  return Number.isFinite(coordinate) && coordinate >= minimum && coordinate <= maximum
    ? coordinate
    : fallback;
}

export const CAFE_LOCATION = Object.freeze({
  name: DEFAULT_CAFE_LOCATION.name,
  address: DEFAULT_CAFE_LOCATION.address,
  // Reject stale deployment coordinates outside the café's target locality.
  lat: readCoordinate(import.meta.env.VITE_CAFE_LAT, DEFAULT_CAFE_LOCATION.lat, 16.64, 16.69),
  lng: readCoordinate(import.meta.env.VITE_CAFE_LNG, DEFAULT_CAFE_LOCATION.lng, 74.18, 74.23),
});

export function getGoogleMapsDirectionsUrl(origin) {
  const url = new URL('https://www.google.com/maps/dir/');
  url.searchParams.set('api', '1');
  url.searchParams.set('destination', `${CAFE_LOCATION.lat},${CAFE_LOCATION.lng}`);
  url.searchParams.set('query', `${CAFE_LOCATION.name}, ${CAFE_LOCATION.address}`);
  if (origin && Number.isFinite(origin.lat) && Number.isFinite(origin.lng)) {
    url.searchParams.set('origin', `${origin.lat},${origin.lng}`);
  }
  return url.toString();
}

