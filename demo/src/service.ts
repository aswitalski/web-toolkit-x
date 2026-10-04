export interface TileProps {
  id: number
  hue: number
}

const TilesService = {
  /* The tiles with the hues spread evenly, each one in a different color. */
  createTiles(count: number): TileProps[] {
    return Array.from({ length: count }, (item, index) => ({
      id: index,
      hue: Math.round((index * 360) / count),
    }))
  },
}

export default TilesService
