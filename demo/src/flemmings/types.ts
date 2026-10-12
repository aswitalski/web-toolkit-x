/*
 * What a flemming is doing: falling slowly flapping its wings, or diving
 * with them folded, wading when standing in the deeper water, turning around
 * when walking into a border or a blocker, blocking the others with its wings
 * spread, folding them before walking on, flagging its head with the others
 * standing or wading close, and settling, finishing what it did before doing
 * something else.
 */
export type Activity =
  | 'falling'
  | 'diving'
  | 'walking'
  | 'turning'
  | 'standing'
  | 'wading'
  | 'blocking'
  | 'unblocking'
  | 'flagging'
  | 'settling'

/* The direction a flemming faces and walks in. */
export type Direction = 'left' | 'right'

/*
 * What a bored flemming does now and then, feeding when wading, the rest
 * when standing, and sleeping only on one leg.
 */
export type Idle =
  'looking-back' | 'preening' | 'saluting' | 'sleeping' | 'feeding'

/* A point in the world, in sprite pixels from its bottom left corner. */
export interface Position {
  x: number
  y: number
}

export interface Flemming {
  id: number
  activity: Activity
  direction: Direction
  /* The bottom left corner of the frame, at the feet. */
  position: Position
  /* The falling speed, in sprite pixels per second. */
  velocity: number
  /* The milliseconds it has walked since it started, for its stride. */
  walkingFor: number
  /* Feeding, sleeping or preening, not flagging the head with the others. */
  headDown: boolean
  /*
   * The seconds left of turning around, facing the direction until then,
   * of folding the wings when unblocking, of flagging the head, or of waiting
   * for it to settle at most.
   */
  timeLeft: number
  /*
   * What it does once settled, or instead of walking on, once the step is
   * finished, turned around or with the wings folded, and whether it has
   * settled.
   */
  next: Activity | null
  ready: boolean
  /*
   * The group it settles to flag the heads with, by the id of its first
   * flemming, and the seconds all of them flag the heads for, once all have
   * settled.
   */
  flagGroup: number | null
  flagFor: number
  /*
   * The time of the click it stopped blocking at, in milliseconds, as the
   * clicks are timed, not slowed down with the animations.
   */
  releasedAt: number | null
  /*
   * The time the group it stands or wades in flags the heads, the same for
   * all of them, in milliseconds, null when not in a group.
   */
  flagAt: number | null
  /* The bottom of the cloud it falls out of, hidden above it until out. */
  hiddenAbove: number | null
}

/*
 * The props of a flemming element, which knows nothing about its position,
 * with the callbacks telling the game when it dips its head in the water,
 * stirs up the mud, puts its head down or up, and once it has settled.
 */
export interface FlemmingProps {
  activity: Activity
  direction: Direction
  onDip: () => void
  onStir: (time: number) => void
  onHeadChange: (down: boolean) => void
  onReady: () => void
}

/* What a settling flemming finishes, before doing something else. */
export type Settling =
  | 'looking-back'
  | 'looking-back-on-one-leg'
  | 'one-leg'
  | 'sleeping'
  | 'preening'
  | 'saluting'
  | 'feeding'
  | 'flagging'

/*
 * The transient state of a flemming element, of what it does when standing
 * or wading, reset whenever the activity changes, but for its plumage.
 */
export interface FlemmingElementState extends FlemmingProps {
  /* The brightness of its plumage, from 8% darker to 40% lighter, kept. */
  plumage: number
  /* What it does when bored, null when resting. */
  idle: Idle | null
  /* What it did, ending it until it does something else. */
  ending: Idle | null
  /* Standing on one leg, with the other one tucked. */
  oneLeg: boolean
  /* Putting the tucked leg down, until it does something else. */
  loweringLeg: boolean
  /* The treads of stirring up the mud before feeding, none when not. */
  treads: number
  /*
   * What it finishes when settling, null when nothing, and the milliseconds
   * of it skipped, starting from the frame it showed.
   */
  settling: Settling | null
  skipped: number
  /* The seconds until it does something else, or rests again. */
  idleTime: number
  /* Counts the changes, ignoring the timers set before the last one. */
  phase: number
}

/* The world in sprite pixels, as big as the window. */
export interface World {
  /* The size of the window, changing when resized. */
  width: number
  height: number
  /* The size of a sprite pixel in CSS pixels, the same at any window size. */
  pixel: number
}

/*
 * A ripple on the water, spreading from x, in sprite pixels, numbered after
 * the ones there are.
 */
export interface Ripple {
  id: number
  x: number
  /* The pixels two droplets fly sideways at each step, in random directions. */
  drops: [number, number]
  /* Only the legs crossing the surface, walking out of the water. */
  small: boolean
  /* The time it started, in milliseconds. */
  time: number
}

/*
 * A cloud of the mud a flemming stirs up treading it, rising from the bottom
 * at its feet at x, in sprite pixels, numbered after the ones there are.
 */
export interface Mud {
  id: number
  x: number
  /* The depth of the water there, above the bottom. */
  depth: number
  /* The time it started, and the milliseconds of stirring it up. */
  time: number
  stirring: number
}

export interface GameState {
  world: World
  flemmings: Flemming[]
  ripples: Ripple[]
  mud: Mud[]
  /* The times the clicked clouds are disabled until, by their ids. */
  disabledClouds: Record<string, number>
  /* The time of the last update, in milliseconds, null before the first one. */
  time: number | null
}

/* The shapes of the clouds, each drawn by its own pixel image. */
export type CloudShape = 'medium' | 'large' | 'small' | 'round'

/* A cloud in the band of the clouds, in sprite pixels from its top left. */
export interface Cloud {
  id: string
  shape: CloudShape
  x: number
  y: number
  width: number
  height: number
}
