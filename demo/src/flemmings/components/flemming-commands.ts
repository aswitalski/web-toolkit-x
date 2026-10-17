import type { CommandsAPI } from 'toolkit'

import { type Range, triangular, uniform } from '../random.js'
import type {
  Act,
  Activity,
  FlemmingElementState,
  FlemmingProps,
  Idle,
} from '../types.js'

/*
 * The seconds of resting when standing, and when wading, feeding as long,
 * any of them equally likely, so that many wading together drift apart,
 * resting at first anywhere up to an average rest and feed together.
 */
const RESTING: Range = [8, 15]
const WADING: Range = [6, 24]
const FIRST_WADING: Range = [1, 30]

/* The chance of stirring up the mud before feeding, 9 times out of 10. */
const STIRRING_CHANCE = 0.9

/*
 * The treads of stirring it up, of 0.4s each, mostly 5, sometimes about 1, 2
 * or 3 seconds more, with the weights of the chances.
 */
const TREADS: [number, number][] = [
  [5, 4],
  [8, 2],
  [10, 1],
  [13, 1],
]

/* The seconds of doing something when bored, saluting as long as it lasts. */
const DURATIONS: Record<Idle, Range> = {
  'looking-back': [3, 7],
  preening: [6, 12],
  saluting: [1.6, 1.6],
  sleeping: [30, 60],
  feeding: WADING,
}

/* What a bored standing flemming may do, with the weights of the chances. */
type Choice = Exclude<Act['do'], 'resting'>
const ON_TWO_LEGS: [Choice, number][] = [
  ['looking-back', 3],
  ['preening', 2],
  ['saluting', 1],
  ['switching-legs', 3],
]
const ON_ONE_LEG: [Choice, number][] = [
  ['looking-back', 7],
  ['sleeping', 1],
  ['switching-legs', 7],
]

/*
 * The brightness of the plumage of each flemming, a bit different, from
 * 8% darker to 40% lighter, in steps of 0.1%, in thousandths.
 */
const PLUMAGE = { darkest: 920, lightest: 1400 }

const choose = <T>(choices: [T, number][]): T => {
  const total = choices.reduce((sum, [, weight]) => sum + weight, 0)
  let chance = Math.random() * total
  const chosen = choices.find(([, weight]) => (chance -= weight) < 0)
  return (chosen ?? choices[0]!)[0]
}

const getRestingTime = (activity: Activity) =>
  activity === 'wading' ? uniform(WADING) : triangular(RESTING)

export const getPlumage = () => {
  const { darkest, lightest } = PLUMAGE
  const steps = Math.floor(Math.random() * (lightest - darkest + 1))
  return (darkest + steps) / 1000
}

/*
 * What it does next, by chance: ends what it did, resting, or rests and does
 * something else, feeding when wading, almost always stirring up the mud
 * first, or when standing switching the legs it stands on, or doing what it
 * can on them.
 */
const chooseAct = (state: FlemmingElementState): Act => {
  if (state.idle && !state.ending) {
    return { do: 'resting', seconds: getRestingTime(state.activity) }
  }
  const choice =
    state.activity === 'wading'
      ? 'feeding'
      : choose(state.legs === 'one' ? ON_ONE_LEG : ON_TWO_LEGS)
  if (choice === 'switching-legs') {
    return { do: choice, seconds: getRestingTime(state.activity) }
  }
  if (choice === 'feeding') {
    const stirring = Math.random() < STIRRING_CHANCE
    const treads = stirring ? choose(TREADS) : 0
    return { do: choice, seconds: uniform(DURATIONS.feeding), treads }
  }
  return { do: choice, seconds: triangular(DURATIONS[choice]) }
}

/* The next act of its routine, starting it over after the last one. */
const takeAct = (state: FlemmingElementState, routine: Act[]): Act => {
  const act = routine[state.nextAct]!
  state.nextAct = (state.nextAct + 1) % routine.length
  return act
}

/*
 * Does the act for its seconds, ending what it did when resting, and
 * stirring up the mud with the treads only before feeding.
 */
const perform = (state: FlemmingElementState, act: Act) => {
  state.idleTime = act.seconds
  if (act.do === 'resting') {
    if (state.idle) {
      state.ending = true
      state.treads = 0
    }
    return
  }
  state.ending = false
  if (act.do === 'switching-legs') {
    state.idle = null
    state.legs = state.legs === 'one' ? 'lowering' : 'one'
  } else {
    state.idle = act.do
    state.treads = act.do === 'feeding' ? (act.treads ?? 0) : 0
    if (state.legs === 'lowering') {
      state.legs = 'two'
    }
  }
}

/*
 * The state at the start of an activity, resting on both legs, ending what
 * it did, if given, or else doing the first act of its routine when standing
 * or wading.
 */
export const createElementState = (
  props: FlemmingProps,
  phase: number,
  plumage: number,
  ending: Idle | null = null,
): FlemmingElementState => {
  const state: FlemmingElementState = {
    ...props,
    plumage,
    idle: ending,
    ending: !!ending,
    legs: 'two',
    treads: 0,
    settling: null,
    skipped: 0,
    idleTime:
      props.activity === 'wading'
        ? uniform(FIRST_WADING)
        : getRestingTime(props.activity),
    nextAct: 0,
    phase,
  }
  const { activity, routine } = props
  if (
    !ending &&
    routine?.length &&
    (activity === 'standing' || activity === 'wading')
  ) {
    perform(state, takeAct(state, routine))
  }
  return state
}

const FlemmingCommands = {
  /*
   * Rests and does something else now and then, the next act of its routine,
   * or chosen by chance without one. Ignored when the phase it was timed for
   * has already changed.
   */
  advance(phase: number) {
    if (phase !== this.phase) {
      return
    }
    this.phase += 1
    const { routine } = this
    perform(this, routine?.length ? takeAct(this, routine) : chooseAct(this))
  },
} satisfies CommandsAPI<FlemmingElementState>

export default FlemmingCommands
