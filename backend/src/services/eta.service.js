function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const toRad = (value) => (value * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) ** 2;

  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function calculateEtaMinutes(location, stop) {
  const distanceKm = haversineKm(
    location.lat,
    location.lng,
    stop.latitude,
    stop.longitude
  );

  // GPS speed is normally km/h. Use a floor so ETA does not become infinite
  // when the bus is temporarily stopped.
  const speedKmh = Math.max(Number(location.speed) || 0, 10);

  return {
    distanceKm: Number(distanceKm.toFixed(2)),
    etaMinutes: Math.max(0, Math.round((distanceKm / speedKmh) * 60)),
    speedKmh
  };
}

module.exports = { haversineKm, calculateEtaMinutes };
