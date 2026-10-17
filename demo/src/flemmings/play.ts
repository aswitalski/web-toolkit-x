import { WebComponent } from 'toolkit'

import GameCommands from './game-commands.js'
import type { GameState } from './types.js'

/*
 * A game played by its rules, the Game or a scene of the inspection,
 * updated on every frame, issuing the commands the callbacks of its
 * flemmings call for, by their ids.
 */
class Play<
  STATE extends GameState = GameState,
  PROPS extends object = object,
> extends WebComponent<STATE, typeof GameCommands, PROPS> {
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

  onDip(id: number) {
    void this.commands.dip(id)
  }

  onStir(id: number, time: number) {
    void this.commands.stir(id, time)
  }

  onReady(id: number) {
    void this.commands.ready(id)
  }

  onHeadChange(id: number, down: boolean) {
    void this.commands.setHeadDown(id, down)
  }
}

export default Play
