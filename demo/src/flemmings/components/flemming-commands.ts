import type { CommandsAPI } from 'toolkit'

import { type Range, triangular, uniform } from '../random.js'
import type {
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
type Choice = Idle | 'switching-legs'
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

/* The state at the start of an activity, resting on both legs. */
export const createElementState = (
  props: FlemmingProps,
  phase: number,
  plumage: number,
): FlemmingElementState => ({
  ...props,
  plumage,
  idle: null,
  ending: null,
  oneLeg: false,
  loweringLeg: false,
  treads: 0,
  settling: null,
  skipped: 0,
  idleTime:
    props.activity === 'wading'
      ? uniform(FIRST_WADING)
      : getRestingTime(props.activity),
  phase,
})

const FlemmingCommands = {
  /*
   * Rests and does something else now and then: feeds when wading, almost always
   * stirring up the mud first, and when standing switches the legs it stands
   * on, or does what it can on them. Ignored when the phase it was timed for
   * has already changed.
   */
  advance(phase: number) {
    if (phase !== this.phase) {
      return
    }
    this.phase += 1
    if (this.idle) {
      this.ending = this.idle
      this.idle = null
      this.treads = 0
      this.idleTime = getRestingTime(this.activity)
      return
    }
    this.ending = null
    this.loweringLeg = false
    const choice =
      this.activity === 'wading'
        ? 'feeding'
        : choose(this.oneLeg ? ON_ONE_LEG : ON_TWO_LEGS)
    if (choice === 'switching-legs') {
      this.loweringLeg = this.oneLeg
      this.oneLeg = !this.oneLeg
      this.idleTime = getRestingTime(this.activity)
    } else {
      this.idle = choice
      this.idleTime =
        choice === 'feeding'
          ? uniform(DURATIONS.feeding)
          : triangular(DURATIONS[choice])
      const stirring = choice === 'feeding' && Math.random() < STIRRING_CHANCE
      this.treads = stirring ? choose(TREADS) : 0
    }
  },
} satisfies CommandsAPI<FlemmingElementState>

export default FlemmingCommands
