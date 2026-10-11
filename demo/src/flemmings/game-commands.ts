import type { CommandsAPI } from 'toolkit'

import {
  getCloudBottom,
  getClouds,
  getCloudsBottom,
  getFirstCloud,
} from './clouds.js'
import { type Range, uniform } from './random.js'
import {
  FEET_X,
  FRAME_HEIGHT,
  FRAME_WIDTH,
  getStandingLevel,
  getWaterDepth,
  WATER_DEPTH,
} from './terrain.js'
import type { Activity, Cloud, Flemming, GameState, World } from './types.js'

/*
 * The acceleration of falling, in sprite pixels per second squared, up to
 * the speeds, in sprite pixels per second, of falling slowly flapping the
 * wings, and of diving with them folded.
 */
const GRAVITY = 300
const FLAPPING_SPEED = 48
const DIVING_SPEED = 128
/* A pixel per frame of the walk, matching the stride. */
const WALKING_SPEED = 12.5

/* The seconds of turning around, the head first, then the body. */
const TURNING = 0.2

/* The pixels between a blocker and the ones walking into it turning around. */
const BLOCKING_DISTANCE = 10

/* The milliseconds of a cloud disabled after a click, dropping no more. */
const CLOUD_DISABLED = 800

/* The milliseconds of a double-click, its first click releasing a blocker. */
const DOUBLE_CLICK = 500

/* The seconds of folding the wings before walking on, as long as spreading. */
const UNBLOCKING = 0.3

/* The longest seconds of waiting for a flemming finishing what it does. */
const MAX_SETTLING = 1

/*
 * The groups of at least 3 standing, on the land or in the shallow water,
 * or wading, facing the same way, at most 32 pixels apart, turning their
 * heads to the other side together after waiting 20-40 seconds, which takes
 * as long as styled, and back after holding them there for 1-3 seconds,
 * each of them with the head up joining in at 9 times out of 10.
 */
const GROUP_SIZE = 3
const GROUP_GAP = 32
const FLAGGING_WAIT: Range = [20, 40]
const FLAGGING_TURN = 0.55
const FLAGGING: Range = [1, 3]
const JOINING_CHANCE = 0.9

/* The longest milliseconds passed between updates, e.g. in a background tab. */
const MAX_ELAPSED = 100

/* The water deep enough to wade in, dipping the head. */
const WADING_DEPTH = WATER_DEPTH - 2

/* The milliseconds of a ripple splashing, a bit longer than styled. */
const RIPPLE_TIME = 1200

/* The head of a flemming dipped in the water, from the left of its frame. */
const HEAD_X = 13

/* In the air, falling or diving. */
const isFalling = (flemming: Flemming) =>
  flemming.activity === 'falling' || flemming.activity === 'diving'

/* Stands, walks or turns in the water, but not when falling into it. */
const isInWater = (flemming: Flemming) =>
  !isFalling(flemming) && getWaterDepth(flemming.position.x) > 0

/* A whole number of pixels a droplet flies sideways at each step. */
const getDrop = () => Math.floor(Math.random() * 5) - 2

const addRipple = (
  state: GameState,
  flemming: Flemming,
  x: number,
  small = false,
) => {
  // numbered, as the time changes only on a tick, and a flemming may dip its
  // head again before the next one, e.g. in a background tab
  const id = Math.max(0, ...state.ripples.map(ripple => ripple.id)) + 1
  const time = state.time ?? 0
  state.ripples.push({
    id,
    // on the sprite pixels, where the flemming is drawn
    x: Math.round(flemming.position.x) + x,
    drops: [getDrop(), getDrop()],
    small,
    time,
  })
}

/* Falls speeding up to the speed of flapping or diving, then walks. */
const fall = (flemming: Flemming, seconds: number) => {
  flemming.velocity = Math.min(
    flemming.velocity + GRAVITY * seconds,
    flemming.activity === 'diving' ? DIVING_SPEED : FLAPPING_SPEED,
  )
  flemming.position.y -= flemming.velocity * seconds
  const { hiddenAbove } = flemming
  if (
    hiddenAbove !== null &&
    flemming.position.y + FRAME_HEIGHT <= hiddenAbove
  ) {
    flemming.hiddenAbove = null
  }
  const ground = getStandingLevel(flemming.position.x)
  if (flemming.position.y <= ground) {
    flemming.position.y = ground
    flemming.velocity = 0
    flemming.activity = 'walking'
  }
}

/* Fits within the width of the world, e.g. not after making it narrower. */
const fits = (flemming: Flemming, world: World) =>
  flemming.position.x >= 0 && flemming.position.x <= world.width - FRAME_WIDTH

/* A blocker close ahead of the flemming, in the direction it walks in. */
const isBlocked = (flemming: Flemming, flemmings: Flemming[]) =>
  flemmings.some(other => {
    if (other.activity !== 'blocking') {
      return false
    }
    const ahead = other.position.x - flemming.position.x
    const distance = flemming.direction === 'right' ? ahead : -ahead
    return distance > 0 && distance < BLOCKING_DISTANCE
  })

/*
 * Walks in the current direction, along the ground and into the water,
 * turning around at the window borders, or to walk back when beyond,
 * and at the blockers.
 */
const walk = (
  flemming: Flemming,
  world: World,
  flemmings: Flemming[],
  seconds: number,
) => {
  const { position } = flemming
  const fitting = fits(flemming, world)
  const step = WALKING_SPEED * seconds
  position.x += flemming.direction === 'right' ? step : -step
  const max = world.width - FRAME_WIDTH
  if (flemming.direction === 'right' && position.x >= max) {
    position.x = fitting ? max : position.x
    turnAround(flemming)
  } else if (flemming.direction === 'left' && position.x <= 0) {
    position.x = fitting ? 0 : position.x
    turnAround(flemming)
  } else if (isBlocked(flemming, flemmings)) {
    turnAround(flemming)
  }
  position.y = getStandingLevel(position.x)
}

const turnAround = (flemming: Flemming) => {
  flemming.activity = 'turning'
  flemming.timeLeft = TURNING
}

/* Walks on, or stands or wades when stopped in the meantime. */
const walkOn = (flemming: Flemming) => {
  flemming.activity = flemming.next ?? 'walking'
  flemming.next = null
}

/* Walks on the other way once turned around. */
const turn = (flemming: Flemming, seconds: number) => {
  flemming.timeLeft -= seconds
  if (flemming.timeLeft <= 0) {
    flemming.direction = flemming.direction === 'right' ? 'left' : 'right'
    walkOn(flemming)
  }
}

/* Releases a blocker, folding its wings before walking on the same way. */
const unblock = (flemming: Flemming, time: number | null) => {
  flemming.activity = 'unblocking'
  flemming.timeLeft = UNBLOCKING
  flemming.releasedAt = time
}

/* Walks on once the wings are folded. */
const fold = (flemming: Flemming, seconds: number) => {
  flemming.timeLeft -= seconds
  if (flemming.timeLeft <= 0) {
    walkOn(flemming)
  }
}

/* Finishes what it does before doing the next thing, waiting for it. */
const settle = (flemming: Flemming, next: Activity) => {
  flemming.activity = 'settling'
  flemming.next = next
  flemming.ready = false
  flemming.timeLeft = MAX_SETTLING
  flemming.flagGroup = null
}

/* Goes on waiting, settled at the latest when the time is up. */
const wait = (flemming: Flemming, seconds: number) => {
  flemming.timeLeft -= seconds
  if (flemming.timeLeft <= 0) {
    flemming.ready = true
  }
}

/*
 * Does the next thing once settled, the ones flagging the heads only once
 * all of their group have settled, all at once.
 */
const finishSettling = (flemmings: Flemming[]) => {
  const waiting = new Set(
    flemmings
      .filter(
        flemming =>
          flemming.activity === 'settling' &&
          flemming.next === 'flagging' &&
          !flemming.ready,
      )
      .map(flemming => flemming.flagGroup),
  )
  for (const flemming of flemmings) {
    const { next } = flemming
    if (flemming.activity !== 'settling' || !flemming.ready || !next) {
      continue
    }
    if (next === 'flagging') {
      if (waiting.has(flemming.flagGroup)) {
        continue
      }
      flemming.timeLeft = flemming.flagFor
      flemming.flagGroup = null
    }
    flemming.activity = next
    flemming.next = null
  }
}

/* Standing, or wading in the water deep enough. */
const getStopped = (flemming: Flemming): Activity =>
  getWaterDepth(flemming.position.x) >= WADING_DEPTH ? 'wading' : 'standing'

/* Stands, or wades in the water deep enough. */
const stop = (flemming: Flemming) => {
  flemming.activity = getStopped(flemming)
}

/* About to walk on, once turned around, with the wings folded or settled. */
const isWalkingOn = (flemming: Flemming) =>
  flemming.activity === 'turning' ||
  flemming.activity === 'unblocking' ||
  (flemming.activity === 'settling' && flemming.next === 'walking')

/*
 * Stands or wades again once done flagging, turning the heads back all
 * at once.
 */
const flag = (flemming: Flemming, seconds: number) => {
  flemming.timeLeft -= seconds
  if (flemming.timeLeft <= 0) {
    stop(flemming)
  }
}

/*
 * The groups of the ones close to each other standing, on the land or in the
 * shallow water, or wading, facing the same way, the ones wading or facing
 * the other way making groups of their own.
 */
const getGroups = (flemmings: Flemming[]) => {
  const groups: Flemming[][] = []
  const kinds = ['standing', 'wading'].flatMap(activity =>
    ['left', 'right'].map(direction => ({ activity, direction })),
  )
  for (const { activity, direction } of kinds) {
    const still = flemmings
      .filter(
        flemming =>
          flemming.activity === activity && flemming.direction === direction,
      )
      .sort((one, other) => one.position.x - other.position.x)
    let group: Flemming[] = []
    for (const flemming of still) {
      const last = group.at(-1)
      if (last && flemming.position.x - last.position.x > GROUP_GAP) {
        groups.push(group)
        group = []
      }
      group.push(flemming)
    }
    groups.push(group)
  }
  return groups.filter(group => group.length >= GROUP_SIZE)
}

/*
 * Starts flagging the heads in each group once it has waited for it, the ones
 * joining in all at once, for as long, waiting anew whenever the group forms
 * or another one joins it.
 */
const startFlagging = (flemmings: Flemming[], time: number) => {
  const grouped = new Set<number>()
  for (const group of getGroups(flemmings)) {
    const times = new Set(group.map(flemming => flemming.flagAt))
    const [flagAt] = times
    if (times.size > 1 || flagAt === null || flagAt === undefined) {
      const next = time + uniform(FLAGGING_WAIT) * 1000
      group.forEach(flemming => (flemming.flagAt = next))
    } else if (time >= flagAt) {
      const flagging = FLAGGING_TURN + uniform(FLAGGING)
      for (const flemming of group) {
        flemming.flagAt = null
        if (!flemming.headDown && Math.random() < JOINING_CHANCE) {
          settle(flemming, 'flagging')
          flemming.flagGroup = group[0]!.id
          flemming.flagFor = flagging
        }
      }
    }
    group.forEach(flemming => grouped.add(flemming.id))
  }
  for (const flemming of flemmings) {
    if (!grouped.has(flemming.id)) {
      flemming.flagAt = null
    }
  }
}

/* A flemming falling from the position, hidden above the given height. */
const createFlemming = (
  id: number,
  x: number,
  y: number,
  hiddenAbove: number,
): Flemming => ({
  id,
  activity: 'falling',
  direction: 'right',
  position: { x, y },
  velocity: 0,
  headDown: false,
  timeLeft: 0,
  next: null,
  ready: false,
  flagGroup: null,
  flagFor: 0,
  releasedAt: null,
  flagAt: null,
  hiddenAbove,
})

/*
 * Drops another flemming out of the bottom of the cloud, anywhere across
 * it but its edges, showing the first pixel of its legs.
 */
const dropOutOf = (state: GameState, cloud: Cloud) => {
  const id = Math.max(0, ...state.flemmings.map(flemming => flemming.id)) + 1
  const x = cloud.x + cloud.width * (0.25 + Math.random() / 2)
  const max = state.world.width - FRAME_WIDTH
  const left = Math.min(Math.max(Math.round(x - FRAME_WIDTH / 2), 0), max)
  const bottom = getCloudBottom(state.world, cloud)
  state.flemmings.push(createFlemming(id, left, bottom - 1, bottom))
}

const GameCommands = {
  /*
   * Moves the flemmings by the time passed since the last update, with
   * ripples where they land in the water or walk into it, and smaller ones
   * where they walk out of it.
   */
  tick(time: number) {
    const elapsed = this.time === null ? 0 : time - this.time
    const seconds = Math.min(elapsed, MAX_ELAPSED) / 1000
    this.time = time
    for (const flemming of this.flemmings) {
      const wasInWater = isInWater(flemming)
      if (isFalling(flemming)) {
        fall(flemming, seconds)
      } else if (flemming.activity === 'walking') {
        walk(flemming, this.world, this.flemmings, seconds)
      } else if (flemming.activity === 'turning') {
        turn(flemming, seconds)
      } else if (flemming.activity === 'unblocking') {
        fold(flemming, seconds)
      } else if (flemming.activity === 'flagging') {
        flag(flemming, seconds)
      } else if (flemming.activity === 'settling') {
        wait(flemming, seconds)
      }
      if (isInWater(flemming) !== wasInWater) {
        addRipple(this, flemming, FEET_X, wasInWater)
      }
    }
    finishSettling(this.flemmings)
    startFlagging(this.flemmings, time)
    if (this.ripples.some(ripple => time - ripple.time > RIPPLE_TIME)) {
      this.ripples = this.ripples.filter(
        ripple => time - ripple.time <= RIPPLE_TIME,
      )
    }
  },

  /* Does the next thing, once a flemming has finished what it did. */
  ready(id: number) {
    const flemming = this.flemmings.find(flemming => flemming.id === id)
    if (flemming?.activity === 'settling') {
      flemming.ready = true
      finishSettling(this.flemmings)
    }
  },

  /* Keeps whether a flemming has its head down, not flagging it then. */
  setHeadDown(id: number, down: boolean) {
    const flemming = this.flemmings.find(flemming => flemming.id === id)
    if (flemming) {
      flemming.headDown = down
    }
  },

  /* Ripples the water where a flemming dips its head in it. */
  dip(id: number) {
    const flemming = this.flemmings.find(flemming => flemming.id === id)
    if (flemming) {
      const head =
        flemming.direction === 'right' ? HEAD_X : FRAME_WIDTH - 1 - HEAD_X
      addRipple(this, flemming, head)
    }
  },

  /*
   * Stops all the walking flemmings, wading in the water deep enough, and
   * the ones about to walk on, once they have turned around, folded the wings
   * or settled.
   */
  stopAll() {
    for (const flemming of this.flemmings) {
      if (flemming.activity === 'walking') {
        stop(flemming)
      } else if (isWalkingOn(flemming)) {
        flemming.next = getStopped(flemming)
      }
    }
  },

  /*
   * Makes the world as big as the window, at the same pixel size, moving
   * the flemmings still coming out of the clouds along with them.
   */
  resize(width: number, height: number) {
    const bottom = getCloudsBottom(this.world)
    this.world.width = width
    this.world.height = height
    const moved = getCloudsBottom(this.world) - bottom
    for (const flemming of this.flemmings) {
      if (flemming.hiddenAbove !== null) {
        flemming.position.y += moved
        flemming.hiddenAbove += moved
      }
    }
  },

  /*
   * Stops a walking flemming, wading in the water, or lets it walk on the
   * same way, once it has finished what it does, also a blocker, ignoring
   * the ones diving, turning around, folding the wings or settling, and makes
   * a falling one fold its wings and dive.
   */
  toggle(id: number) {
    const flemming = this.flemmings.find(flemming => flemming.id === id)
    if (flemming?.activity === 'falling') {
      flemming.activity = 'diving'
    } else if (flemming?.activity === 'walking') {
      stop(flemming)
    } else if (flemming?.activity === 'blocking') {
      unblock(flemming, this.time)
    } else if (
      flemming?.activity === 'standing' ||
      flemming?.activity === 'wading' ||
      flemming?.activity === 'flagging'
    ) {
      settle(flemming, 'walking')
    }
  },

  /*
   * Makes a flemming a blocker, on a double-click, once it has finished what
   * it does, unless its first click has just released it from blocking,
   * ignoring the ones in the air, turning around or folding the wings, and
   * lets a blocker walk on.
   */
  block(id: number) {
    const flemming = this.flemmings.find(flemming => flemming.id === id)
    if (!flemming) {
      return
    }
    // walking on just released by the first click of the double-click
    const { releasedAt } = flemming
    const released =
      flemming.activity === 'walking' &&
      releasedAt !== null &&
      (this.time ?? 0) - releasedAt < DOUBLE_CLICK
    if (flemming.activity === 'blocking') {
      unblock(flemming, this.time)
    } else if (flemming.activity === 'settling') {
      flemming.next = 'blocking'
      flemming.flagGroup = null
    } else if (flemming.activity === 'walking') {
      if (!released) {
        flemming.activity = 'blocking'
      }
    } else if (
      flemming.activity === 'standing' ||
      flemming.activity === 'wading' ||
      flemming.activity === 'flagging'
    ) {
      settle(flemming, 'blocking')
    }
  },

  /* Drops the first flemming out of the leftmost cloud within the world. */
  dropFirst() {
    const cloud = getFirstCloud(this.world)
    if (cloud) {
      dropOutOf(this, cloud)
    }
  },

  /*
   * Drops another flemming out of the clicked cloud, by its id, disabled
   * for a moment after each click, at the time of the click.
   */
  drop(id: string, time: number) {
    const cloud = getClouds(this.world).find(cloud => cloud.id === id)
    if (!cloud || time < (this.disabledClouds[id] ?? 0)) {
      return
    }
    this.disabledClouds[id] = time + CLOUD_DISABLED
    dropOutOf(this, cloud)
  },
} satisfies CommandsAPI<GameState>

export default GameCommands
