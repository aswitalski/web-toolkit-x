import type { World } from './types.js'

/* The sizes in sprite pixels. */
export const FRAME_WIDTH = 16
export const FRAME_HEIGHT = 24
export const GROUND_HEIGHT = 8
export const WATER_DEPTH = 6

/* The height of a flemming in CSS pixels, scaling the ground with it. */
const FLEMMING_HEIGHT = 48

/* The size of a sprite pixel in CSS pixels. */
export const PIXEL = FLEMMING_HEIGHT / FRAME_HEIGHT

/*
 * The left of the pond, from the left border of the world, and its width at
 * the surface, the same at any window width.
 */
export const POND_LEFT = 120
export const POND_WIDTH = 300

/* The pixels across for each pixel down, a gentle slope into the water. */
const SLOPE = 4

/* The feet of a flemming, from the left of its frame. */
export const FEET_X = 8

/* The height of the land and the water surface above the bottom border. */
export const LAND_HEIGHT = GROUND_HEIGHT + WATER_DEPTH

/*
 * The depth of the ground below the land level at the column x, sloping
 * down into the pond and up out of it on the other side.
 */
const getDepth = (x: number) => {
  const right = POND_LEFT + POND_WIDTH
  if (x < POND_LEFT || x >= right) {
    return 0
  }
  const fromShore = Math.min(x - POND_LEFT, right - 1 - x)
  return Math.min(Math.floor(fromShore / SLOPE) + 1, WATER_DEPTH)
}

/*
 * The depth of the water a flemming at the position x stands in, at its feet
 * where it is drawn, at the nearest sprite pixel.
 */
export const getWaterDepth = (x: number) => getDepth(Math.round(x) + FEET_X)

/* The height of the feet of a flemming at x, standing on the ground. */
export const getStandingLevel = (x: number) => LAND_HEIGHT - getWaterDepth(x)

/*
 * The steps of the slopes down into a pond and up out of it, from its left
 * across its width.
 */
const getSlopes = (left: number, width: number): [number, number][] => {
  const points: [number, number][] = []
  for (let depth = 1; depth <= WATER_DEPTH; depth++) {
    const x = left + (depth - 1) * SLOPE
    points.push([x, depth - 1], [x, depth])
  }
  for (let depth = WATER_DEPTH; depth >= 1; depth--) {
    const x = left + width - (depth - 1) * SLOPE
    points.push([x, depth], [x, depth - 1])
  }
  return points
}

/*
 * The outline of the ground below the land level, stepping a pixel down
 * and up on each step of the slopes, as the points of a polygon.
 */
export const getGroundOutline = (world: World): [number, number][] => [
  [0, 0],
  ...getSlopes(POND_LEFT, POND_WIDTH),
  [world.width, 0],
  [world.width, LAND_HEIGHT],
  [0, LAND_HEIGHT],
]

/*
 * The outline of the water in the pond, filling the ground outline up to
 * the land level, as the points of a polygon.
 */
export const getWaterOutline = (): [number, number][] =>
  getSlopes(0, POND_WIDTH)
