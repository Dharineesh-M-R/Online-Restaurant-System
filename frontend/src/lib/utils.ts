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

export function getApiUrl(): string {
  if (typeof window !== "undefined") {
    // When running in browser on localhost or loopback, always prioritize local port 5000
    if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
      return "http://localhost:5000";
    }
    // When accessed via LAN IP or hostname (e.g. mobile phone on Wi-Fi), use current host with port 5000
    if (window.location.hostname) {
      return `${window.location.protocol}//${window.location.hostname}:5000`;
    }
  }
  return process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
}
