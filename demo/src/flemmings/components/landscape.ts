import { Component, type Template } from 'toolkit'

import { CLOUDS_HEIGHT, getClouds, getCloudsBottom } from '../clouds.js'
import {
  getGroundOutline,
  getWaterOutline,
  GROUND_HEIGHT,
  LAND_HEIGHT,
  POND_LEFT,
  POND_WIDTH,
  WATER_DEPTH,
} from '../terrain.js'
import type { Cloud as CloudData, Mud, World } from '../types.js'

/* The clip path of the outline, in sprite pixels. */
const toPolygon = (points: [number, number][], pixel: number) =>
  `polygon(${points.map(([x, y]) => `${x * pixel}px ${y * pixel}px`).join(', ')})`

/*
 * The function remembering its last result, computed again only for another
 * argument, as the landscape is rendered with the flemmings on every frame,
 * while the world changes only when the window is resized.
 */
const remember = <T, R>(compute: (arg: T) => R) => {
  let last: { arg: T; result: R } | null = null
  return (arg: T): R => {
    if (!last || last.arg !== arg) {
      last = { arg, result: compute(arg) }
    }
    return last.result
  }
}

const getGroundClip = remember((world: World) =>
  toPolygon(getGroundOutline(world), world.pixel),
)
const getWaterClip = remember((pixel: number) =>
  toPolygon(getWaterOutline(), pixel),
)
const getWorldClouds = remember(getClouds)

/* A blue sky at the sunset. */
export const Sky = (): Template => ['div', { class: 'sky' }]

/* The glow of the sun just behind the horizon. */
export const Sun = (): Template => ['div', { class: 'sun' }]

interface GroundProps {
  world: World
  onDblClick: () => void
}

/* The ground with the pond in it, double-clicked to stop the walking ones. */
export const Ground = ({ world, onDblClick }: GroundProps): Template => [
  'div',
  {
    class: 'ground',
    style: {
      '--outline': getGroundClip(world),
      height: [LAND_HEIGHT * world.pixel, 'px'],
    },
    onDblClick,
  },
]

/* The trees on the land, behind the flemmings. */
export const Trees = (): Template => ['div', { class: 'trees' }]

interface CloudProps {
  cloud: CloudData
  pixel: number
  onClick: (id: string, time: number) => void
}

/*
 * A cloud dropping a flemming when clicked, passing its method as the
 * listener, the same on each render, telling the game its id and the time
 * of the click.
 */
class Cloud extends Component<CloudProps> {
  onClick(event: MouseEvent) {
    this.props.onClick(this.props.cloud.id, event.timeStamp)
  }

  render(): Template {
    const {
      cloud: { shape, x, y, width, height },
      pixel,
    } = this.props
    return [
      'button',
      {
        class: ['cloud', shape],
        ariaLabel: 'Drop a flemming',
        style: {
          left: [x * pixel, 'px'],
          top: [y * pixel, 'px'],
          width: [width * pixel, 'px'],
          height: [height * pixel, 'px'],
        },
        onClick: this.onClick,
      },
    ]
  }
}

interface CloudsProps {
  world: World
  onClick: (id: string, time: number) => void
}

/*
 * The clouds high above the ground, but never too low on a short window,
 * in front of the flemmings falling out.
 */
export const Clouds = ({ world, onClick }: CloudsProps): Template => [
  'div',
  {
    class: 'clouds',
    style: {
      bottom: [getCloudsBottom(world) * world.pixel, 'px'],
      height: [CLOUDS_HEIGHT * world.pixel, 'px'],
    },
  },
  ...getWorldClouds(world).map(
    cloud =>
      [Cloud, { key: cloud.id, cloud, pixel: world.pixel, onClick }] as const,
  ),
]

interface MudCloudProps {
  cloud: Mud
  pixel: number
}

/* A cloud of mud stirred up from the bottom, spreading and settling. */
const MudCloud = ({
  cloud: { x, depth, stirring },
  pixel,
}: MudCloudProps): Template => [
  'span',
  {
    class: 'mud',
    style: {
      left: [(x - POND_LEFT) * pixel, 'px'],
      bottom: [(WATER_DEPTH - depth) * pixel, 'px'],
      '--stirring': [stirring, 'ms'],
    },
  },
]

interface WaterProps {
  pixel: number
  mud: Mud[]
}

/*
 * The water in the pond, in front of the flemmings, covering their legs, with
 * the mud they stir up in it.
 */
export const Water = ({ pixel, mud }: WaterProps): Template => [
  'div',
  {
    class: 'water',
    style: {
      '--outline': getWaterClip(pixel),
      left: [POND_LEFT * pixel, 'px'],
      bottom: [GROUND_HEIGHT * pixel, 'px'],
      width: [POND_WIDTH * pixel, 'px'],
      height: [WATER_DEPTH * pixel, 'px'],
    },
  },
  ...mud.map(cloud => [MudCloud, { key: cloud.id, cloud, pixel }] as const),
]

interface LandscapeProps {
  width: number
  pixel: number
}

/*
 * The landscape as wide as the world, at the size of its pixels, with its
 * layers given as its children.
 */
class Landscape extends Component<LandscapeProps> {
  render(): Template {
    const { width, pixel } = this.props
    return [
      'main',
      {
        style: {
          '--pixel': [pixel, 'px'],
          '--land': [LAND_HEIGHT * pixel, 'px'],
          width: [width * pixel, 'px'],
        },
      },
      ...this.children,
    ]
  }
}

export default Landscape
