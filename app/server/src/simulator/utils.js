import crypto from "node:crypto";
import * as turf from "@turf/turf";

export const getSecureRandom = () => crypto.randomBytes(4).readUInt32LE(0) / (0xffffffff + 1);

export const calculateDistanceMeters = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3;
  const rad = Math.PI / 180;
  const a = Math.sin((lat2 - lat1) * rad / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin((lon2 - lon1) * rad / 2) ** 2;
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
};

export const isPointInPolygon = (lat, lon, vs) => {
  let inside = false;
  for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
    const intersect = ((vs[i][1] > lon) !== (vs[j][1] > lon)) && (lat < (vs[j][0] - vs[i][0]) * (lon - vs[i][1]) / (vs[j][1] - vs[i][1]) + vs[i][0]);
    if (intersect) inside = !inside;
  }
  return inside;
};

const calculateBestAngle = (zone) => {
  let maxDist = 0;
  let bestAngle = 0;
  for (let i = 0; i < zone.length; i++) {
    const p1 = zone[i];
    const p2 = zone[(i + 1) % zone.length];
    const dist = Math.hypot((p2[0] - p1[0]), (p2[1] - p1[1]));
    if (dist > maxDist) {
      maxDist = dist;
      bestAngle = Math.atan2(p2[1] - p1[1], p2[0] - p1[0]) * (180 / Math.PI);
    }
  }
  return bestAngle;
};

const weavePathRows = (rows) => {
  const finalPath = [];
  const sortedKeys = Object.keys(rows).sort((a, b) => a.localeCompare(b)).reverse();
  sortedKeys.forEach((key, index) => {
    const row = rows[key].sort((a, b) => a.lon - b.lon);
    if (index % 2 !== 0) row.reverse();
    finalPath.push(...row);
  });
  return finalPath;
};

export const generateCoveragePath = (zone) => {
  try {
    if (!zone || zone.length < 3) return [];
    const finalPath = [...zone.map(p => ({ lat: p[0], lon: p[1] })), { lat: zone[0][0], lon: zone[0][1] }];
    
    const turfCoords = zone.map(p => [p[1], p[0]]);
    const first = turfCoords[0];
    const last = turfCoords[turfCoords.length - 1];
    if (first[0] !== last[0] || first[1] !== last[1]) {
      turfCoords.push([...first]);
    }
    
    const poly = turf.polygon([turfCoords]);
    const bestAngle = calculateBestAngle(zone);
    const rotatedPoly = turf.transformRotate(poly, -bestAngle);
    
    const pointGrid = turf.pointGrid(turf.bbox(rotatedPoly), 0.008, { units: 'kilometers', mask: rotatedPoly });
    const internalPoints = pointGrid.features.map(f => {
      const pt = turf.transformRotate(f, bestAngle);
      return { lat: pt.geometry.coordinates[1], lon: pt.geometry.coordinates[0] };
    });

    const validatedPoints = internalPoints.filter(p => isPointInPolygon(p.lat, p.lon, zone));
    const rows = {};
    validatedPoints.forEach(p => {
      const key = p.lat.toFixed(5);
      if (!rows[key]) rows[key] = [];
      rows[key].push(p);
    });

    return [...finalPath, ...weavePathRows(rows)];
  } catch (error) {
    console.error(error);
    return [];
  }
};
