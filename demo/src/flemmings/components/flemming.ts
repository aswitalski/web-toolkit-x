import { type Template, WebComponent } from 'toolkit'

import { FRAME_WIDTH, PIXEL } from '../terrain.js'
import type { FlemmingElementState, FlemmingProps, Settling } from '../types.js'
import FlemmingCommands, {
  createElementState,
  getPlumage,
} from './flemming-commands.js'

/*
 * The milliseconds from starting to feed to the head under the water, after
 * the treads of stirring up the mud, if any, as styled.
 */
const DIPPING = 300
const TREAD_TIME = 400

/*
 * The frames of finishing what it does when settling, ending standing on both
 * legs, and the milliseconds of each of them, as styled.
 */
const SETTLING_FRAMES: Record<Settling, number[]> = {
  'looking-back': [8, 7, 6, 5, 4],
  'looking-back-on-one-leg': [20, 19, 18, 17, 16, 15, 4],
  'one-leg': [16, 15, 4],
  sleeping: [22, 21, 20, 19, 16, 15, 4],
  preening: [24, 8, 7, 5, 4],
  saluting: [27, 26, 4],
  feeding: [35, 12, 11, 4],
  flagging: [8, 7, 6, 5, 4],
}
const SETTLING_FRAME_TIME = 50

/*
 * The frames settled from as others: sifting the mud, as the head under the
 * water raised from it, breathing asleep and nibbling the wing. Treading the
 * mud isn't settled from, as it stands on both legs.
 */
const HELD_FRAMES: Partial<Record<number, number>> = {
  13: 35,
  14: 35,
  23: 22,
  25: 24,
}

/*
 * What a flemming finishes when settling from what it does: turning the head
 * ahead, putting the leg down, waking up, raising the head from the wing or
 * the water, or closing the wings, also when only starting it or ending it.
 */
const getSettlingFrom = ({
  activity,
  idle,
  ending,
  oneLeg,
  loweringLeg,
}: FlemmingElementState): Settling | null => {
  if (activity === 'flagging') {
    return 'flagging'
  }
  const done = idle ?? ending
  if (done === 'looking-back') {
    return oneLeg ? 'looking-back-on-one-leg' : 'looking-back'
  }
  if (done) {
    return done
  }
  return oneLeg || loweringLeg ? 'one-leg' : null
}

/* The frame the image shows, by the position of the strip in it. */
const getShownFrame = (img: HTMLElement) =>
  Math.round(
    -parseFloat(getComputedStyle(img).objectPosition) / (FRAME_WIDTH * PIXEL),
  )

/*
 * What a flemming finishes when settling, from the frame its image shows,
 * skipping the milliseconds of the frames before it, nothing when standing
 * on both legs already.
 */
const getSettling = (
  state: FlemmingElementState,
  img: HTMLElement | null | undefined,
): Pick<FlemmingElementState, 'settling' | 'skipped'> => {
  const settling = getSettlingFrom(state)
  if (settling && img) {
    const frame = getShownFrame(img)
    const frames = SETTLING_FRAMES[settling]
    const index = frames.indexOf(HELD_FRAMES[frame] ?? frame)
    if (index >= 0 && index < frames.length - 1) {
      return { settling, skipped: index * SETTLING_FRAME_TIME }
    }
  }
  return { settling: null, skipped: 0 }
}

/*
 * Calls back once the milliseconds have passed on the clock of the animations,
 * checked on each frame, so that its timers slow down with them, e.g. in
 * DevTools, and stop with them in a background tab.
 */
const afterAnimationTime = (callback: () => void, ms: number) => {
  const end = (document.timeline.currentTime as number) + ms
  const frame = (time: number) => {
    if (time >= end) {
      callback()
    } else {
      requestAnimationFrame(frame)
    }
  }
  requestAnimationFrame(frame)
}

/* The head down in the water, on the back or at the wing. */
const isHeadDown = ({ idle }: FlemmingElementState) =>
  idle === 'feeding' || idle === 'sleeping' || idle === 'preening'

/*
 * A flemming showing the frames of its activity, facing its direction,
 * placed by the parent, with a plumage of its own. It chooses what it does
 * when standing or wading by itself, in its transient state, reset when
 * the activity changes, and tells the game when it puts its head under
 * the water, puts its head down or up, and once it has settled, finishing
 * what it did before doing something else, with the callbacks it is given.
 */
class Flemming extends WebComponent<
  FlemmingElementState,
  typeof FlemmingCommands,
  FlemmingProps
> {
  static elementName = 'f-lemming'

  static styles = ['styles/flemming.css']

  static commands = FlemmingCommands

  getInitialState(props: FlemmingProps) {
    return createElementState(props, 0, getPlumage())
  }

  getUpdatedState(props: FlemmingProps, state: FlemmingElementState) {
    const { activity } = props
    if (activity !== state.activity) {
      const next = createElementState(props, state.phase + 1, state.plumage)
      if (activity === 'settling') {
        // from the frame shown, as the animation starts after the state
        Object.assign(
          next,
          getSettling(state, this.shadow?.querySelector('img')),
        )
      }
      // turns the head back after flagging, as after looking back
      if (
        state.activity === 'flagging' &&
        (activity === 'standing' || activity === 'wading')
      ) {
        next.ending = 'looking-back'
      }
      return next
    }
    return { ...state, ...props }
  }

  onAttached() {
    this.schedule()
  }

  onUpdated(prevState: FlemmingElementState) {
    if (this.props.phase !== prevState.phase) {
      this.schedule()
      if (this.props.idle === 'feeding') {
        if (this.props.treads) {
          this.props.onStir(this.props.treads * TREAD_TIME)
        }
        this.dip()
      }
      if (this.props.activity === 'settling') {
        this.settle()
      }
    }
    const down = isHeadDown(this.props)
    if (down !== isHeadDown(prevState)) {
      this.props.onHeadChange(down)
    }
  }

  /* Tells when the head goes under the water, unless it stopped feeding. */
  dip() {
    const { phase } = this.props
    afterAnimationTime(
      () => {
        if (this.props.phase === phase) {
          this.props.onDip()
        }
      },
      this.props.treads * TREAD_TIME + DIPPING,
    )
  }

  /* Tells when it has finished what it did, unless doing something else. */
  settle() {
    const { phase, settling, skipped } = this.props
    afterAnimationTime(
      () => {
        if (this.props.phase === phase) {
          this.props.onReady()
        }
      },
      settling
        ? SETTLING_FRAMES[settling].length * SETTLING_FRAME_TIME - skipped
        : 0,
    )
  }

  /* Does something else once the time of the current phase has passed. */
  schedule() {
    const { activity, idleTime, phase } = this.props
    if (activity === 'standing' || activity === 'wading') {
      afterAnimationTime(
        () => void this.commands.advance(phase),
        idleTime * 1000,
      )
    }
  }

  render(): Template {
    const {
      activity,
      direction,
      idle,
      ending,
      oneLeg,
      loweringLeg,
      treads,
      settling,
      skipped,
      plumage,
    } = this.props
    return [
      'img',
      {
        src: './flemming.svg',
        alt: `Flemming ${idle ?? activity}`,
        class: [
          activity,
          direction,
          idle,
          ending && `${ending}-end`,
          settling && `from-${settling}`,
          {
            'one-leg': oneLeg,
            'lowering-leg': loweringLeg,
            stirring: treads > 0,
          },
        ],
        style: {
          '--plumage': plumage,
          '--treads': treads,
          // settling from the frame it showed
          animationDelay: skipped > 0 && [-skipped, 'ms'],
        },
        draggable: false,
      },
    ]
  }
}

export default Flemming
