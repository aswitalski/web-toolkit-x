import toolkit from 'toolkit'

import Game from './src/flemmings/game.js'

/* The release mode runs the demo against the bundled ESM build. */
toolkit.configure({ debug: import.meta.env.MODE !== 'release' })
await toolkit.render(Game, document.body)
