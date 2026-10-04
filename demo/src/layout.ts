export interface Point {
  x: number
  y: number
}

export const MAX_COLUMNS = 4
export const WIDTH = 160
export const HEIGHT = 90
export const GAP = 24
export const PADDING = 24

/* The number of columns fitting in the width, with the padding around. */
export const getColumns = (width: number) => {
  const columns = Math.floor((width - 2 * PADDING + GAP) / (WIDTH + GAP))
  return Math.max(1, Math.min(MAX_COLUMNS, columns))
}

/* The size of the grid of the tiles. */
export const getSize = (count: number, columns: number) => ({
  width: columns * (WIDTH + GAP) - GAP,
  height: Math.ceil(count / columns) * (HEIGHT + GAP) - GAP,
})

/* The position of the tile at the given index, within the grid. */
export const getPosition = (index: number, columns: number): Point => ({
  x: (index % columns) * (WIDTH + GAP),
  y: Math.floor(index / columns) * (HEIGHT + GAP),
})

/*
 * The index the dragged tile moves to when dropped at the point: before
 * the tile under it when on its left side, after it when on the right,
 * and in its place on both sides in the first and the last column.
 */
export const getDropIndex = (
  order: number[],
  id: number,
  point: Point,
  columns: number,
) => {
  const column = Math.floor(point.x / (WIDTH + GAP))
  const row = Math.floor(point.y / (HEIGHT + GAP))
  const x = point.x - column * (WIDTH + GAP)
  const y = point.y - row * (HEIGHT + GAP)
  if (column < 0 || column >= columns || x > WIDTH || y < 0 || y > HEIGHT) {
    return null
  }
  const index = row * columns + column
  const target = order[index]
  if (target === undefined || target === id) {
    return null
  }
  if (column === 0 || column === columns - 1) {
    return index
  }
  const others = order.filter(other => other !== id)
  return others.indexOf(target) + (x > WIDTH / 2 ? 1 : 0)
}

/* The distance between the centers of two rows, moved in the base time. */
const ROW_DISTANCE = HEIGHT + GAP
const BASE_DURATION = 0.3

/*
 * The duration of moving a tile between the points, in seconds, growing
 * with the square root of the distance, in the base time for a row.
 */
export const getDuration = (from: Point, to: Point) =>
  BASE_DURATION *
  Math.sqrt(Math.hypot(to.x - from.x, to.y - from.y) / ROW_DISTANCE)
