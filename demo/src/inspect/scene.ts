import type { Template } from 'toolkit'

import Flock from '../flemmings/components/flock.js'
import Play from '../flemmings/play.js'
import { PIXEL } from '../flemmings/terrain.js'
import World from '../flemmings/world.js'
import { type SceneState, VIEW_HEIGHT, VIEW_WIDTH } from './director.js'
import SceneCommands from './scene-commands.js'
import { SCENES_BY_ID } from './scenes.js'

interface SceneProps {
  /* The id of the scene. */
  scene: string
}

/* Ignores the clicks, as the scenes are directed by their scripts. */
const ignore = () => {}

/*
 * A scene of the game, played by its rules in a world of its own, seen
 * through a window on a part of it, and directed by its script on every
 * frame.
 */
class Scene extends Play<SceneState, SceneProps> {
  static elementName = 'f-scene'

  static styles = ['styles/game.css', 'styles/scene.css']

  static commands = SceneCommands

  getInitialState({ scene: id }: SceneProps): SceneState {
    const scene = SCENES_BY_ID.get(id)!
    const state: SceneState = {
      world: {
        width: scene.width,
        height: VIEW_HEIGHT,
        pixel: PIXEL,
      },
      flemmings: [],
      ripples: [],
      mud: [],
      disabledClouds: {},
      time: null,
      scene: id,
      left: scene.left,
      cast: {},
      lastId: 0,
      step: 0,
      stepAt: null,
    }
    scene.setup?.(state)
    return state
  }

  onAttached() {
    this.animate()
  }

  render(): Template {
    const { world, flemmings, ripples, mud, left } = this.props
    const { pixel } = world
    return [
      'div',
      {
        class: 'view',
        style: {
          width: [VIEW_WIDTH * pixel, 'px'],
          height: [VIEW_HEIGHT * pixel, 'px'],
        },
      },
      [
        'div',
        { class: 'camera', style: { translate: [-left * pixel, 'px'] } },
        [
          World,
          {
            world,
            ripples,
            mud,
            onCloudClick: ignore,
            onGroundDblClick: ignore,
          },
          [
            Flock,
            {
              flemmings,
              pixel,
              onClick: ignore,
              onDblClick: ignore,
              onDip: this.onDip,
              onStir: this.onStir,
              onHeadChange: this.onHeadChange,
              onReady: this.onReady,
            },
          ],
        ],
      ],
    ]
  }
}

export default Scene
