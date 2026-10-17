import { POND_LEFT, POND_WIDTH } from '../flemmings/terrain.js'
import type { Act } from '../flemmings/types.js'
import {
  areAll,
  cast,
  click,
  doubleClick,
  flagNow,
  isDoing,
  isEmpty,
  isPast,
  type Scene,
  VIEW_WIDTH,
} from './director.js'

/*
 * The world wide enough for the flemmings to walk out of the window on the
 * right, before turning around at its border.
 */
const WIDE = 1000

/*
 * The left of the windows on the places in the world, in sprite pixels, set
 * from the pond, so that they follow it: the land on the left of the pond and
 * its left bank, the deep water and the right bank, and the land on the right.
 */
const LEFT_SHORE = 0
const LEFT_BANK = POND_LEFT - 60
const DEEP_WATER = POND_LEFT + 80
const RIGHT_BANK = POND_LEFT + POND_WIDTH - 80
const LAND = POND_LEFT + POND_WIDTH + 20

/* A short pause before a scene starts over. */
const PAUSE = 800

/* Looking back, preening and saluting, on two legs. */
const ON_TWO_LEGS: Act[] = [
  { do: 'resting', seconds: 1.5 },
  { do: 'looking-back', seconds: 3 },
  { do: 'resting', seconds: 1.5 },
  { do: 'preening', seconds: 5 },
  { do: 'resting', seconds: 1.5 },
  { do: 'saluting', seconds: 1.6 },
]

/* Lifting a leg, looking back and sleeping on it, and putting it down. */
const ON_ONE_LEG: Act[] = [
  { do: 'resting', seconds: 1.5 },
  { do: 'switching-legs', seconds: 2 },
  { do: 'looking-back', seconds: 3 },
  { do: 'resting', seconds: 1.5 },
  { do: 'sleeping', seconds: 7 },
  { do: 'resting', seconds: 1.5 },
  { do: 'switching-legs', seconds: 1.5 },
]

/*
 * Falling asleep on one leg, soon after stopping, and putting the leg down
 * once awake.
 */
const DOZING: Act[] = [
  { do: 'resting', seconds: 1 },
  { do: 'switching-legs', seconds: 1 },
  { do: 'sleeping', seconds: 30 },
  { do: 'resting', seconds: 1 },
  { do: 'switching-legs', seconds: 1 },
]

/* Only resting, so that all of a group flag their heads. */
const RESTING: Act[] = [{ do: 'resting', seconds: 60 }]

/* Feeding soon after stopping in the water, then resting. */
const FEEDING_ONCE: Act[] = [
  { do: 'resting', seconds: 1.5 },
  { do: 'feeding', seconds: 6, treads: 5 },
  { do: 'resting', seconds: 10 },
]

/*
 * Feeding after treading the mud, without it, and after treading it longer,
 * out of step.
 */
const FEEDING: Act[] = [
  { do: 'resting', seconds: 1.5 },
  { do: 'feeding', seconds: 5, treads: 5 },
  { do: 'resting', seconds: 2 },
  { do: 'feeding', seconds: 4 },
]
const FEEDING_LONGER: Act[] = [
  { do: 'resting', seconds: 4 },
  { do: 'feeding', seconds: 7, treads: 8 },
  { do: 'resting', seconds: 1 },
]

/*
 * The scenes of the standard situations, played by the rules of the game,
 * the flemmings standing or wading doing what their routines tell them.
 */
const SCENES: Scene[] = [
  {
    id: 'falling',
    title: 'Falling',
    description: 'Falls flapping its wings, lands and walks on to the right.',
    left: LAND,
    width: WIDE,
    steps: [
      { after: PAUSE, do: state => cast(state, 'flemming', LAND + 72) },
      { when: isEmpty },
    ],
  },
  {
    id: 'diving',
    title: 'Diving',
    description: 'Clicked when falling, folds its wings and dives faster.',
    left: LAND,
    width: WIDE,
    steps: [
      { after: PAUSE, do: state => cast(state, 'flemming', LAND + 72) },
      { after: 500, do: state => click(state, 'flemming') },
      { when: isEmpty },
    ],
  },
  {
    id: 'turning',
    title: 'Turning around',
    description:
      'Turns its head, then its body, at both borders of the world, ' +
      'walking into the water and out of it.',
    left: LEFT_SHORE,
    width: VIEW_WIDTH,
    setup: state => cast(state, 'flemming', 40),
    steps: [],
  },
  {
    id: 'stopping',
    title: 'Stopping',
    description:
      'Clicked when walking, finishes its step and stands, ' +
      'then clicked again, walks on.',
    left: LAND,
    width: WIDE,
    steps: [
      { after: PAUSE, do: state => cast(state, 'flemming', LAND + 24) },
      {
        when: isPast('flemming', LAND + 64),
        do: state => click(state, 'flemming'),
      },
      {
        after: 4000,
        when: isDoing('flemming', 'standing'),
        do: state => click(state, 'flemming'),
      },
      { when: isEmpty },
    ],
  },
  {
    id: 'standing',
    title: 'Standing',
    description: 'Rests, then looks back, preens and salutes with its wings.',
    left: LAND,
    width: WIDE,
    setup: state =>
      cast(state, 'flemming', LAND + 72, {
        activity: 'standing',
        routine: ON_TWO_LEGS,
      }),
    steps: [],
  },
  {
    id: 'one-leg',
    title: 'Standing on one leg',
    description:
      'Lifts a leg, looks back, sleeps with its head tucked, ' +
      'and puts the leg down.',
    left: LAND,
    width: WIDE,
    setup: state =>
      cast(state, 'flemming', LAND + 72, {
        activity: 'standing',
        direction: 'left',
        routine: ON_ONE_LEG,
      }),
    steps: [],
  },
  {
    id: 'settling',
    title: 'Settling',
    description:
      'Clicked when asleep on one leg, quickly wakes up and puts the leg ' +
      'down, then walks on.',
    left: LAND,
    width: WIDE,
    steps: [
      {
        after: PAUSE,
        do: state => cast(state, 'flemming', LAND + 24, { routine: DOZING }),
      },
      {
        when: isPast('flemming', LAND + 56),
        do: state => click(state, 'flemming'),
      },
      {
        after: 6000,
        when: isDoing('flemming', 'standing'),
        do: state => click(state, 'flemming'),
      },
      { when: isEmpty },
    ],
  },
  {
    id: 'flagging',
    title: 'Flagging the heads',
    description:
      'Standing close together, facing the same way, ' +
      'turn their heads to the other side all at once, each almost always joining in.',
    left: LAND,
    width: WIDE,
    setup: state => {
      for (const [index, role] of ['first', 'second', 'third'].entries()) {
        cast(state, role, LAND + 40 + index * 24, {
          activity: 'standing',
          routine: RESTING,
        })
      }
    },
    steps: [
      { after: 3000, when: areAll('standing'), do: flagNow },
      { after: 1000, when: areAll('standing') },
    ],
  },
  {
    id: 'blocking',
    title: 'Blocking',
    description:
      'Double-clicked, spreads its wings, turning the other one around, ' +
      'then clicked, folds them and walks on.',
    left: LEFT_SHORE,
    width: WIDE,
    steps: [
      { after: PAUSE, do: state => cast(state, 'blocker', 72) },
      {
        when: isDoing('blocker', 'walking'),
        do: state => doubleClick(state, 'blocker'),
      },
      { after: 300, do: state => cast(state, 'walker', 16) },
      { after: 10000, do: state => click(state, 'blocker') },
      { when: isEmpty },
    ],
  },
  {
    id: 'walking-in',
    title: 'Walking into the water',
    description: 'Walks down the bank into the pond, splashing.',
    left: LEFT_BANK,
    width: WIDE,
    steps: [
      {
        after: PAUSE,
        do: state =>
          cast(state, 'flemming', LEFT_BANK - 16, { activity: 'walking' }),
      },
      { when: isEmpty },
    ],
  },
  {
    id: 'landing-in',
    title: 'Landing in the water',
    description: 'Falls into the pond with a splash, and walks on in it.',
    left: DEEP_WATER,
    width: WIDE,
    steps: [
      { after: PAUSE, do: state => cast(state, 'flemming', DEEP_WATER + 56) },
      { when: isEmpty },
    ],
  },
  {
    id: 'walking-out',
    title: 'Walking out of the water',
    description:
      'Lands in the water near the bank and walks out of it, ' +
      'its legs crossing the surface.',
    left: RIGHT_BANK,
    width: WIDE,
    steps: [
      { after: PAUSE, do: state => cast(state, 'flemming', RIGHT_BANK + 24) },
      { when: isEmpty },
    ],
  },
  {
    id: 'stopping-in-water',
    title: 'Stopping in the water',
    description:
      'Clicked in the deep water, wades and feeds, then clicked again, walks on.',
    left: LEFT_BANK,
    width: WIDE,
    steps: [
      {
        after: PAUSE,
        do: state =>
          cast(state, 'flemming', LEFT_BANK + 24, { routine: FEEDING_ONCE }),
      },
      {
        when: isPast('flemming', LEFT_BANK + 96),
        do: state => click(state, 'flemming'),
      },
      {
        after: 10000,
        when: isDoing('flemming', 'wading'),
        do: state => click(state, 'flemming'),
      },
      { when: isEmpty },
    ],
  },
  {
    id: 'wading',
    title: 'Wading and feeding',
    description:
      'Rests in the deep water, then feeds, treading the mud first ' +
      'and dipping its head.',
    left: DEEP_WATER,
    width: WIDE,
    setup: state => {
      cast(state, 'first', DEEP_WATER + 32, {
        activity: 'wading',
        routine: FEEDING,
      })
      cast(state, 'second', DEEP_WATER + 96, {
        activity: 'wading',
        direction: 'left',
        routine: FEEDING_LONGER,
      })
    },
    steps: [],
  },
]

/* The scenes by their ids. */
export const SCENES_BY_ID = new Map(SCENES.map(scene => [scene.id, scene]))

export default SCENES
