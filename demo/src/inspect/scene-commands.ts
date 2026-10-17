import type { CommandsAPI } from 'toolkit'

import GameCommands from '../flemmings/game-commands.js'
import { direct, type SceneState } from './director.js'
import { SCENES_BY_ID } from './scenes.js'

/*
 * The commands of the game, acting on a scene the same way, with each tick
 * directing the scene once the flemmings have moved.
 */
const SceneCommands = {
  ...GameCommands,

  tick(time: number) {
    GameCommands.tick.call(this, time)
    direct(this, SCENES_BY_ID.get(this.scene)!)
  },
} satisfies CommandsAPI<SceneState>

export default SceneCommands
