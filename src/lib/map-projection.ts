import { geoNaturalEarth1 } from "d3-geo";

export const JAPAN_CENTER_LONGITUDE = 139.7;

export function createJapanCenteredProjection(width: number, height: number) {
  return geoNaturalEarth1()
    .rotate([-JAPAN_CENTER_LONGITUDE, 0])
    .scale(156)
    .translate([width / 2, height / 2 + 10]);
}
