import type { Cloud, World } from './types.js'

/* The height of the band of the clouds, in sprite pixels. */
export const CLOUDS_HEIGHT = 62

/*
 * The space above the band of the clouds, and the lowest its bottom goes
 * above the bottom of a short window, in sprite pixels.
 */
const CLOUDS_TOP = 24
const CLOUDS_LOWEST = 160

/*
 * Two tiles of different widths with two clouds each, the second one
 * shifted, repeated across the world so the clouds rarely line up.
 */
const TILES: { offset: number; width: number; clouds: Omit<Cloud, 'id'>[] }[] =
  [
    {
      offset: 0,
      width: 320,
      clouds: [
        { shape: 'medium', x: 20, y: 6, width: 69, height: 23 },
        { shape: 'large', x: 172, y: 33, width: 85, height: 29 },
      ],
    },
    {
      offset: 130,
      width: 448,
      clouds: [
        { shape: 'small', x: 104, y: 29, width: 41, height: 17 },
        { shape: 'round', x: 312, y: 4, width: 49, height: 21 },
      ],
    },
  ]

/* The clouds in the world, including the ones partly beyond its edges. */
export const getClouds = (world: World): Cloud[] =>
  TILES.flatMap(({ offset, width, clouds }) => {
    const placed: Cloud[] = []
    for (let start = offset - width; start < world.width; start += width) {
      for (const cloud of clouds) {
        const x = start + cloud.x
        if (x + cloud.width > 0 && x < world.width) {
          placed.push({ ...cloud, id: `${cloud.shape}-${x}`, x })
        }
      }
    }
    return placed
  })

/* The bottom of the band of the clouds, above the bottom of the world. */
export const getCloudsBottom = (world: World) =>
  Math.max(world.height - CLOUDS_TOP - CLOUDS_HEIGHT, CLOUDS_LOWEST)

/* The bottom of a cloud, above the bottom of the world. */
export const getCloudBottom = (world: World, cloud: Cloud) =>
  getCloudsBottom(world) + CLOUDS_HEIGHT - cloud.y - cloud.height

/*
 * The leftmost cloud within the world, or partly within it, when none fits
 * in a very narrow one.
 */
export const getFirstCloud = (world: World): Cloud | undefined => {
  const clouds = getClouds(world).sort((one, other) => one.x - other.x)
  return (
    clouds.find(({ x, width }) => x >= 0 && x + width <= world.width) ??
    clouds[0]
  )
}
