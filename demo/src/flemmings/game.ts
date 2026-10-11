import { type Template, WebComponent } from 'toolkit'

import Flock from './components/flock.js'
import GameCommands from './game-commands.js'
import { PIXEL } from './terrain.js'
import type { GameState } from './types.js'
import World from './world.js'

/*
 * The size of the window as it is now, in sprite pixels, which has no
 * scrollbars, as the page hides its overflow.
 */
const getWindowSize = () => ({
  width: Math.floor(window.innerWidth / PIXEL),
  height: Math.floor(window.innerHeight / PIXEL),
})

/* The world as big as the window. */
const createWorld = (): GameState['world'] => ({
  ...getWindowSize(),
  pixel: PIXEL,
})

/* The game, the flemmings moving in the window, updated on every frame. */
class Game extends WebComponent<GameState, typeof GameCommands> {
  static elementName = 'f-game'

  static styles = ['styles/game.css']

  static commands = GameCommands

  getInitialState(): GameState {
    return {
      world: createWorld(),
      flemmings: [],
      ripples: [],
      disabledClouds: {},
      time: null,
    }
  }

  onCreated() {
    window.addEventListener('resize', this.onResize)
  }

  onDestroyed() {
    window.removeEventListener('resize', this.onResize)
  }

  onResize() {
    const { width, height } = getWindowSize()
    void this.commands.resize(width, height)
  }

  /* Drops the first flemming and starts the animation. */
  onAttached() {
    void this.commands.dropFirst()
    this.animate()
  }

  /*
   * Ticks on every frame, until the component is destroyed, going on also
   * after a failed update, reporting its error.
   */
  animate() {
    requestAnimationFrame(time => {
      void this.commands.tick(time).then(
        updated => {
          if (updated) {
            this.animate()
          }
        },
        (error: unknown) => {
          console.error(error)
          this.animate()
        },
      )
    })
  }

  onCloudClick(id: string, time: number) {
    void this.commands.drop(id, time)
  }

  onDip(id: number) {
    void this.commands.dip(id)
  }

  onReady(id: number) {
    void this.commands.ready(id)
  }

  onHeadChange(id: number, down: boolean) {
    void this.commands.setHeadDown(id, down)
  }

  /*
   * Stops a flemming or lets it walk on, makes a falling one dive, or releases
   * a blocker.
   */
  onFlemmingClick(id: number) {
    void this.commands.toggle(id)
  }

  /* Makes a blocker, or keeps walking a blocker its first click released. */
  onFlemmingDblClick(id: number) {
    void this.commands.block(id)
  }

  /* Stops all the walking ones, and the ones about to walk on. */
  onGroundDblClick() {
    void this.commands.stopAll()
  }

  render(): Template {
    const { world, flemmings, ripples } = this.props
    return [
      World,
      {
        world,
        ripples,
        onCloudClick: this.onCloudClick,
        onGroundDblClick: this.onGroundDblClick,
      },
      [
        Flock,
        {
          flemmings,
          pixel: world.pixel,
          onClick: this.onFlemmingClick,
          onDblClick: this.onFlemmingDblClick,
          onDip: this.onDip,
          onHeadChange: this.onHeadChange,
          onReady: this.onReady,
        },
      ],
    ]
  }
}

export default Game
