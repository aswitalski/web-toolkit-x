import GameCommands, { createFlemming } from '../flemmings/game-commands.js'
import { FRAME_WIDTH, getStandingLevel } from '../flemmings/terrain.js'
import type {
  Act,
  Activity,
  Direction,
  Flemming,
  GameState,
} from '../flemmings/types.js'

/* The part of the world seen through a window, 16:9, in sprite pixels. */
export const VIEW_WIDTH = 160
export const VIEW_HEIGHT = 90

/*
 * The state of the game played in a scene, seen through its window, with the
 * flemmings cast in their roles by the steps of its script.
 */
export interface SceneState extends GameState {
  scene: string
  /* The left of the window in the world, in sprite pixels. */
  left: number
  /* The ids of the flemmings by their roles, kept once they are gone. */
  cast: Record<string, number>
  lastId: number
  /* The step of the script, and the time the previous one was done at. */
  step: number
  stepAt: number | null
}

/*
 * A step of a script, done once the milliseconds have passed since the
 * previous one, and when the scene is ready for it.
 */
export interface Step {
  after?: number
  when?: (state: SceneState) => boolean
  do?: (state: SceneState) => void
}

/*
 * A scene showing a behaviour of the flemmings, played by the rules of the
 * game, in a world of the width, seen from the left, set up with its cast,
 * if any, and directed by the steps of its script, in a loop.
 */
export interface Scene {
  id: string
  title: string
  description: string
  left: number
  width: number
  setup?: (state: SceneState) => void
  steps: Step[]
}

interface Casting {
  activity?: Activity
  direction?: Direction
  routine?: Act[]
}

/*
 * Casts a flemming in the role at x, falling from the top of the window by
 * default, or on the ground, doing what it does when standing or wading by
 * its routine, if given.
 */
export const cast = (
  state: SceneState,
  role: string,
  x: number,
  { activity = 'falling', direction = 'right', routine }: Casting = {},
) => {
  const id = ++state.lastId
  state.cast[role] = id
  const falling = activity === 'falling' || activity === 'diving'
  const y = falling ? VIEW_HEIGHT : getStandingLevel(x)
  state.flemmings.push(
    createFlemming(id, x, y, { activity, direction, routine }),
  )
}

/* The flemming in the role, unless gone. */
export const find = (state: SceneState, role: string) =>
  state.flemmings.find(flemming => flemming.id === state.cast[role])

/* Clicks the flemming in the role, as a player would. */
export const click = (state: SceneState, role: string) => {
  const id = state.cast[role]
  if (id !== undefined) {
    GameCommands.toggle.call(state, id, state.time ?? 0)
  }
}

/* Double-clicks the flemming in the role, as a player would. */
export const doubleClick = (state: SceneState, role: string) => {
  const id = state.cast[role]
  if (id !== undefined) {
    GameCommands.block.call(state, id, state.time ?? 0)
  }
}

/* The flemming in the role does one of the activities. */
export const isDoing =
  (role: string, ...activities: Activity[]) =>
  (state: SceneState) => {
    const flemming = find(state, role)
    return !!flemming && activities.includes(flemming.activity)
  }

/* The flemming in the role has walked past x, in the direction it faces. */
export const isPast = (role: string, x: number) => (state: SceneState) => {
  const flemming = find(state, role)
  if (flemming?.activity !== 'walking') {
    return false
  }
  const { direction, position } = flemming
  return direction === 'right' ? position.x >= x : position.x <= x
}

/* All the flemmings do the activity. */
export const areAll = (activity: Activity) => (state: SceneState) =>
  state.flemmings.every(flemming => flemming.activity === activity)

/* All the flemmings have left the window. */
export const isEmpty = (state: SceneState) => !state.flemmings.length

/*
 * Makes the groups flag their heads now, instead of waiting for it, as long
 * as the flemmings make a group, by the rules of the game.
 */
export const flagNow = (state: SceneState) => {
  for (const flemming of state.flemmings) {
    flemming.flagAt = state.time
  }
}

/* Walks away from the window, out of it. */
const isLeaving = (
  state: SceneState,
  { activity, direction, position }: Flemming,
) =>
  activity === 'walking' &&
  (direction === 'right'
    ? position.x >= state.left + VIEW_WIDTH
    : position.x + FRAME_WIDTH <= state.left)

/*
 * Lets the flemmings walking out of the window go, and does the next step of
 * the script once it is time for it, starting it over after the last one.
 */
export const direct = (state: SceneState, { steps }: Scene) => {
  // keeping the list as it is on the frames none of them leaves
  if (state.flemmings.some(flemming => isLeaving(state, flemming))) {
    state.flemmings = state.flemmings.filter(
      flemming => !isLeaving(state, flemming),
    )
  }
  const time = state.time ?? 0
  state.stepAt ??= time
  const step = steps[state.step]
  if (
    !step ||
    time - state.stepAt < (step.after ?? 0) ||
    (step.when && !step.when(state))
  ) {
    return
  }
  step.do?.(state)
  state.step = (state.step + 1) % steps.length
  state.stepAt = time
}
