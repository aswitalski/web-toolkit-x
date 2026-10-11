import { Component, type Template } from 'toolkit'

import { FRAME_HEIGHT } from '../terrain.js'
import type { Flemming as FlemmingData } from '../types.js'
import Flemming from './flemming.js'

/*
 * The listeners of the game, for the clicks on a flemming, and the callbacks
 * of a flemming, all called with its id.
 */
interface Listeners {
  onClick: (id: number) => void
  onDblClick: (id: number) => void
  onDip: (id: number) => void
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
    this.props.onClick(this.props.flemming.id)
  }

  onDblClick() {
    this.props.onDblClick(this.props.flemming.id)
  }

  onDip() {
    this.props.onDip(this.props.flemming.id)
  }

  onHeadChange(down: boolean) {
    this.props.onHeadChange(this.props.flemming.id, down)
  }

  onReady() {
    this.props.onReady(this.props.flemming.id)
  }

  render(): Template {
    const {
      flemming: { activity, direction, position, hiddenAbove },
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
          onDip: this.onDip,
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
