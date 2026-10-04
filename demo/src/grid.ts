import { type Template, WebComponent } from 'toolkit'

import GridCommands, { type GridState } from './commands.js'
import {
  getColumns,
  getDropIndex,
  getPosition,
  getSize,
  HEIGHT,
  PADDING,
  type Point,
  WIDTH,
} from './layout.js'
import type { TileProps } from './service.js'

/* The translation of the tile, also when still moving to its position. */
const getTranslation = (tile: HTMLElement): Point => {
  const [x = 0, y = 0] = getComputedStyle(tile)
    .translate.split(' ')
    .map(parseFloat)
    .filter(Number.isFinite)
  return { x, y }
}

interface GridProps {
  tiles: TileProps[]
}

/*
 * The wrapper managing the positions of the tiles, which keep their order
 * in the DOM and are placed by their index in the order of the tiles.
 */
class Grid extends WebComponent<GridProps, GridState, typeof GridCommands> {
  static elementName = 'tile-grid'

  static styles = ['styles/grid.css']

  static commands = GridCommands

  getInitialState(props: GridProps): GridState {
    return {
      tiles: props.tiles,
      order: props.tiles.map(tile => tile.id),
      columns: getColumns(document.documentElement.clientWidth),
      drag: null,
      raised: null,
      durations: {},
    }
  }

  onCreated() {
    window.addEventListener('resize', this.onResize)
  }

  onDestroyed() {
    window.removeEventListener('resize', this.onResize)
  }

  onResize() {
    const columns = getColumns(document.documentElement.clientWidth)
    if (columns !== this.props.columns) {
      void this.commands.resize(columns)
    }
  }

  /* The point of the event, within the grid. */
  getPoint(event: PointerEvent): Point {
    const rect = (this.ref as HTMLElement).getBoundingClientRect()
    return { x: event.clientX - rect.left, y: event.clientY - rect.top }
  }

  onPointerDown(event: PointerEvent) {
    if (event.button !== 0 || this.props.drag) {
      return
    }
    const tile = event.currentTarget as HTMLElement
    tile.setPointerCapture(event.pointerId)
    const { x, y } = getTranslation(tile)
    const point = this.getPoint(event)
    void this.commands.grab({
      id: Number(tile.dataset.id),
      pointerId: event.pointerId,
      x,
      y,
      offsetX: point.x - x,
      offsetY: point.y - y,
      committed: this.props.order,
    })
  }

  onPointerMove(event: PointerEvent) {
    const { tiles, drag, order, columns } = this.props
    if (drag?.pointerId !== event.pointerId) {
      return
    }
    const point = this.getPoint(event)
    void this.commands.drag(point.x - drag.offsetX, point.y - drag.offsetY)
    const { width, height } = getSize(tiles.length, columns)
    if (point.x < 0 || point.x > width || point.y < 0 || point.y > height) {
      void this.commands.restore()
      return
    }
    const index = getDropIndex(order, drag.id, point, columns)
    if (index !== null) {
      void this.commands.move(drag.id, index)
    }
  }

  onPointerUp(event: PointerEvent) {
    if (this.props.drag?.pointerId === event.pointerId) {
      void this.commands.drop()
    }
  }

  onPointerCancel(event: PointerEvent) {
    if (this.props.drag?.pointerId === event.pointerId) {
      void this.commands.restore()
      void this.commands.drop()
    }
  }

  render(): Template {
    const { tiles, order, columns, drag, raised, durations } = this.props
    const { width, height } = getSize(tiles.length, columns)
    return [
      'main',
      {
        style: {
          margin: [PADDING, 'px'],
          width: [width, 'px'],
          height: [height, 'px'],
        },
      },
      ...tiles.map(tile => {
        const dragged = drag?.id === tile.id
        const { x, y } = dragged
          ? drag
          : getPosition(order.indexOf(tile.id), columns)
        return [
          'section',
          {
            key: tile.id,
            class: { dragged, raised: tile.id === raised },
            dataset: { id: tile.id },
            style: {
              '--hue': tile.hue,
              translate: [x, 'px ', y, 'px'],
              '--duration': [durations[tile.id] ?? 0, 's'],
              width: [WIDTH, 'px'],
              height: [HEIGHT, 'px'],
            },
            onPointerDown: this.onPointerDown,
            onPointerMove: this.onPointerMove,
            onPointerUp: this.onPointerUp,
            onPointerCancel: this.onPointerCancel,
          },
        ] as const
      }),
    ]
  }
}

export default Grid
