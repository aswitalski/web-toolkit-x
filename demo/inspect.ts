import toolkit from 'toolkit'

import Inspect from './src/inspect/inspect.js'

/* The release mode runs the demo against the bundled ESM build. */
toolkit.configure({ debug: import.meta.env.MODE !== 'release' })
await toolkit.render(Inspect, document.body)
