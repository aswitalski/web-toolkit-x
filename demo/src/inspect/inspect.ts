import { type Template, WebComponent } from 'toolkit'

import { PIXEL } from '../flemmings/terrain.js'
import { VIEW_HEIGHT, VIEW_WIDTH } from './director.js'
import Scene from './scene.js'
import SCENES from './scenes.js'

/*
 * The scenes of the standard situations side by side, each in its own
 * window, with its title and what it shows, laid out by the size of the
 * window before it is scaled.
 */
class Inspect extends WebComponent {
  static elementName = 'f-inspect'

  static styles = ['styles/inspect.css']

  render(): Template {
    return [
      'section',
      {
        style: {
          '--view-width': [VIEW_WIDTH * PIXEL, 'px'],
          '--view-height': [VIEW_HEIGHT * PIXEL, 'px'],
        },
      },
      [
        'header',
        ['h1', 'Flemmings inspected'],
        [
          'p',
          'The standard situations, each played by the rules of the game, ' +
            'directed in a loop.',
        ],
      ],
      [
        'ul',
        ...SCENES.map(
          ({ id, title, description }) =>
            [
              'li',
              { key: id },
              [Scene, { scene: id }],
              ['h2', title],
              ['p', description],
            ] as const,
        ),
      ],
    ]
  }
}

export default Inspect
