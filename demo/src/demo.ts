import { type Template, WebComponent } from 'toolkit'

import Grid from './grid.js'
import service, { type TileProps } from './service.js'

export interface DemoState {
  tiles: TileProps[]
}

class Demo extends WebComponent<object, DemoState> {
  static elementName = 'tile-demo'

  getInitialState(): DemoState {
    return {
      tiles: service.createTiles(12),
    }
  }

  render(): Template {
    return [Grid, { tiles: this.props.tiles }]
  }
}

export default Demo
