import type { Template } from 'toolkit'

import { LAND_HEIGHT, POND_LEFT, POND_WIDTH } from '../terrain.js'
import type { Ripple } from '../types.js'

interface SplashProps {
  ripple: Ripple
  pixel: number
}

/* A splash on the water in the pond, spreading from where it starts. */
const Splash = ({
  ripple: { x, drops, small },
  pixel,
}: SplashProps): Template => [
  'span',
  {
    class: { small },
    style: {
      left: [(x - POND_LEFT) * pixel, 'px'],
      '--a': drops[0],
      '--b': drops[1],
    },
  },
]

interface RipplesProps {
  ripples: Ripple[]
  pixel: number
}

/* The splashes on the water surface in the pond, behind the flemmings. */
const Ripples = ({ ripples, pixel }: RipplesProps): Template => [
  'div',
  {
    class: 'ripples',
    style: {
      left: [POND_LEFT * pixel, 'px'],
      bottom: [LAND_HEIGHT * pixel, 'px'],
      width: [POND_WIDTH * pixel, 'px'],
    },
  },
  ...ripples.map(
    ripple => [Splash, { key: ripple.id, ripple, pixel }] as const,
  ),
]

export default Ripples
