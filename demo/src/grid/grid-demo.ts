import { type Template, WebComponent } from 'toolkit'

import Grid from './grid.js'
import service, { type TileProps } from './service.js'

export interface GridDemoState {
  tiles: TileProps[]
}

class GridDemo extends WebComponent<GridDemoState> {
  static elementName = 'grid-demo'

  getInitialState(): GridDemoState {
    return {
      tiles: service.createTiles(12),
    }
  }

  render(): Template {
    return [Grid, { tiles: this.props.tiles }]
  }
}

export default GridDemo
