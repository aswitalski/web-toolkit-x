import { Component, type Template } from 'toolkit'

import Landscape, {
  Clouds,
  Ground,
  Sky,
  Sun,
  Trees,
  Water,
} from './components/landscape.js'
import Ripples from './components/ripples.js'
import type { Mud, Ripple, World as WorldData } from './types.js'

interface WorldProps {
  world: WorldData
  ripples: Ripple[]
  mud: Mud[]
  onCloudClick: (id: string, time: number) => void
  onGroundDblClick: () => void
}

/*
 * The scene the game is played in, with the flemmings given as its children
 * in front of the sky, the ground, the trees and the splashes, and behind
 * the clouds and the water.
 */
class World extends Component<WorldProps> {
  render(): Template {
    const { world, ripples, mud, onCloudClick, onGroundDblClick } = this.props
    const { width, pixel } = world
    const flemmings = this.children
    return [
      Landscape,
      { width, pixel },
      [Sky],
      [Sun],
      [Ground, { world, onDblClick: onGroundDblClick }],
      [Trees],
      [Ripples, { ripples, pixel }],
      ...flemmings,
      [Clouds, { world, onClick: onCloudClick }],
      [Water, { pixel, mud }],
    ]
  }
}

export default World
