const REGION_CENTERS = {
  in: { latitude: 19.076, longitude: 72.8777 },
  us: { latitude: 39.0438, longitude: -77.4874 },
};

function header(request, name) {
  const value = request.headers[name];
  return Array.isArray(value) ? value[0] : value;
}

function distanceSquared(latitude, longitude, center) {
  const latitudeDelta = latitude - center.latitude;
  const longitudeDelta = (longitude - center.longitude) * Math.cos(latitude * Math.PI / 180);
  return latitudeDelta * latitudeDelta + longitudeDelta * longitudeDelta;
}

export default function handler(request, response) {
  const country = String(header(request, 'x-vercel-ip-country') || '').toUpperCase();
  const latitude = Number(header(request, 'x-vercel-ip-latitude'));
  const longitude = Number(header(request, 'x-vercel-ip-longitude'));

  let closestRegion = country === 'IN' ? 'in' : 'us';
  if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
    closestRegion = distanceSquared(latitude, longitude, REGION_CENTERS.in)
      < distanceSquared(latitude, longitude, REGION_CENTERS.us) ? 'in' : 'us';
  }

  response.setHeader('Cache-Control', 'private, no-store');
  response.status(200).json({
    country: country || null,
    closestRegion,
    // India is intentionally not selectable until its deployment is launched.
    recommendedRegion: closestRegion === 'in' ? 'us' : closestRegion,
  });
}
