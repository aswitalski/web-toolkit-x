import type { CommandsAPI } from 'toolkit'

import { getDuration, getPosition } from './layout.js'
import type { TileProps } from './service.js'

/* The dragged tile, with its position and the point it was grabbed at. */
export interface Drag {
  id: number
  /* The pointer dragging the tile, ignoring any other ones. */
  pointerId: number
  x: number
  y: number
  offsetX: number
  offsetY: number
  /* The order before the drag, restored when moved outside of the grid. */
  committed: number[]
}

export interface GridState {
  tiles: TileProps[]
  /* The ids of the tiles, in the order of their positions. */
  order: number[]
  columns: number
  drag: Drag | null
  /* The last dragged tile, kept above the others while it settles. */
  raised: number | null
  /* The durations of moving the tiles to their positions, in seconds. */
  durations: Record<number, number>
}

/* Changes the order, timing the moves of all the tiles but the dragged one. */
const reorder = (state: GridState, order: number[], id: number) => {
  if (order.every((tile, index) => tile === state.order[index])) {
    return
  }
  order.forEach((tile, to) => {
    const from = state.order.indexOf(tile)
    if (tile !== id && from !== to) {
      state.durations[tile] = getDuration(
        getPosition(from, state.columns),
        getPosition(to, state.columns),
      )
    }
  })
  state.order = order
}

const GridCommands = {
  grab(drag: Drag) {
    this.drag = drag
    this.raised = drag.id
  },

  drag(x: number, y: number) {
    if (this.drag) {
      this.drag.x = x
      this.drag.y = y
    }
  },

  move(id: number, index: number) {
    const order = this.order.filter(other => other !== id)
    order.splice(index, 0, id)
    reorder(this, order, id)
  },

  restore() {
    if (this.drag) {
      reorder(this, [...this.drag.committed], this.drag.id)
    }
  },

  resize(columns: number) {
    this.order.forEach((tile, index) => {
      this.durations[tile] = getDuration(
        getPosition(index, this.columns),
        getPosition(index, columns),
      )
    })
    this.columns = columns
  },

  drop() {
    if (this.drag) {
      const { id } = this.drag
      const to = getPosition(this.order.indexOf(id), this.columns)
      this.durations[id] = getDuration(this.drag, to)
    }
    this.drag = null
  },
} satisfies CommandsAPI<GridState>

export default GridCommands
