import { Component, type Template } from 'toolkit'

import { FRAME_HEIGHT } from '../terrain.js'
import type { Flemming as FlemmingData } from '../types.js'
import Flemming from './flemming.js'

/*
 * The listeners of the game, for the clicks on a flemming, and the callbacks
 * of a flemming, all called with its id, the clicks also with their times.
 */
interface Listeners {
  onClick: (id: number, time: number) => void
  onDblClick: (id: number, time: number) => void
  onDip: (id: number) => void
  onStir: (id: number, time: number) => void
  onHeadChange: (id: number, down: boolean) => void
  onReady: (id: number) => void
}

/* Hides the part of a flemming above the height, while out of a cloud. */
const getClipping = (y: number, hiddenAbove: number | null, pixel: number) => {
  const hidden =
    hiddenAbove === null ? 0 : Math.round(y) + FRAME_HEIGHT - hiddenAbove
  return hidden > 0 ? { clipPath: `inset(${hidden * pixel}px 0 0 0)` } : {}
}

interface BirdProps extends Listeners {
  flemming: FlemmingData
  pixel: number
}

/*
 * A flemming placed in the world, identified by its id, passing its methods
 * as the listeners and the callbacks of the flemming, the same on each
 * render, telling the game its id.
 */
class Bird extends Component<BirdProps> {
  /* Ignores the second click of a double-click. */
  onClick(event: MouseEvent) {
    if (event.detail > 1) {
      return
    }
    this.props.onClick(this.props.flemming.id, event.timeStamp)
  }

  onDblClick(event: MouseEvent) {
    this.props.onDblClick(this.props.flemming.id, event.timeStamp)
  }

  onDip() {
    this.props.onDip(this.props.flemming.id)
  }

  onStir(time: number) {
    this.props.onStir(this.props.flemming.id, time)
  }

  onHeadChange(down: boolean) {
    this.props.onHeadChange(this.props.flemming.id, down)
  }

  onReady() {
    this.props.onReady(this.props.flemming.id)
  }

  render(): Template {
    const {
      flemming: { activity, direction, stride, position, hiddenAbove },
      pixel,
    } = this.props
    return [
      'li',
      {
        style: {
          ...getClipping(position.y, hiddenAbove, pixel),
          translate: [
            Math.round(position.x) * pixel,
            'px ',
            -Math.round(position.y) * pixel,
            'px',
          ],
        },
        onClick: this.onClick,
        onDblClick: this.onDblClick,
      },
      [
        Flemming,
        {
          activity,
          direction,
          stride,
          onDip: this.onDip,
          onStir: this.onStir,
          onHeadChange: this.onHeadChange,
          onReady: this.onReady,
        },
      ],
    ]
  }
}

interface FlockProps extends Listeners {
  flemmings: FlemmingData[]
  pixel: number
}

/* All the flemmings in the world. */
const Flock = ({ flemmings, pixel, ...listeners }: FlockProps): Template => [
  'ul',
  ...flemmings.map(
    flemming =>
      [Bird, { key: flemming.id, flemming, pixel, ...listeners }] as const,
  ),
]

export default Flock
