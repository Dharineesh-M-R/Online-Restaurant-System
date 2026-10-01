// src/lib/utils.ts

export const RESTAURANT_LAT = parseFloat(process.env.NEXT_PUBLIC_LATITUDE || "0");
export const RESTAURANT_LNG = parseFloat(process.env.NEXT_PUBLIC_LONGITUDE || "0");
export const MAX_DISTANCE_METERS = 100;

export function getDistanceFromLatLonInM(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
    Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) *
    Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}