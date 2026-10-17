# Flemmings

A Lemmings-like game with pixel-art flamingos, the default demo of Web Toolkit X.

Flemmings fall out of the clouds, the first one as the page loads, and walk along the
shore of a pond at sunset. They turn around at the window borders and walk into the water.
When left alone, they get bored and do something else. Clicks stop them, make them walk
on, or turn them into blockers. The ones busy diving, turning around or folding their
wings ignore the clicks, and the ones finishing what they do ignore a single click.

```sh
npm run demo
```

The `inspect.html` page shows the standard situations side by side, each in a small
window on a part of the world, played by the rules of the game and directed in a loop.

## Playing

| Input                               | Effect                                                                          |
| ----------------------------------- | ------------------------------------------------------------------------------- |
| Click a cloud                       | Drops a flemming out of it, each cloud needing a moment before dropping another |
| Click a falling flemming            | It folds its wings and dives, falling faster                                    |
| Click a walking flemming            | It finishes its step and stands on the ground, or wades in water deep enough    |
| Click a standing or wading flemming | It finishes what it does and walks on, the same way as before                   |
| Double-click a flemming             | It finishes what it does and becomes a blocker                                  |
| Click a blocker                     | It folds its wings and walks on, the same way as before                         |
| Double-click the ground             | Stops all the walking flemmings, and the ones about to walk on once done        |

## Behaviour

### Falling

A flemming falls slowly flapping its wings, about as fast as a floater in Lemmings.
Clicked, it folds its wings and dives much faster, with its legs straight behind. It lands
on its feet and starts walking to the right.

### Walking

It walks slowly, its steps matching its stride, starting and stopping with its legs
together. At a window border or just before a blocker, it turns its head, then its body,
and walks back.

When the window gets narrower, the walking flemmings beyond its new border walk back in,
while the ones standing there stay where they are. When it gets wider, the landscape
extends, and everything keeps its size.

### Water

The pond lies near the left, its banks sloping gently down into it. The flemmings walk
into it and out of it, the water covering their legs.

- Landing in the water or walking into it makes a splash, a droplet jumping straight up
  and two flying off in random directions
- Walking out of it makes a smaller splash, of the legs crossing the surface
- Dipping the head when feeding makes a splash at the head
- Treading the mud before feeding stirs a little of it up around the feet

A flemming stopped in the deeper water wades, otherwise it stands.

### Standing

A standing flemming rests for a while, then does something, rests again, and so on.

On two legs, it may:

- Look back
- Preen, nibbling a wing
- Salute with the wings
- Lift a leg

On one leg, it may:

- Look back
- Sleep, the head tucked
- Put the leg down

It sleeps only on one leg, rarely, but long, breathing slowly. Each of these turns back
the same way it started, e.g. turning the head ahead again or untucking it.

### Wading

A wading flemming rests for a while, then feeds, lowering its head into the water and
sifting it, almost always treading the mud first to stir it up, now and then for longer.
The ones wading together drift apart instead of feeding in sync.

### Groups

At least 3 flemmings close to each other make a group when they all stand, on the land or
in the shallow water, or all wade, facing the same way.

Now and then a group flags its heads: its members turn their heads to the other side all
at once, hold them there for a moment and turn them back. Almost all of them join in, but
not the ones with their heads down, feeding, sleeping or preening.

### Blocking

A blocker turns its body to the viewer and spreads its wings on both sides, its head still
facing the way it went. The others turn around before it. Released, it folds its wings and
walks on the same way.

## Appearance

A flemming hardly ever jumps from one pose to another. Told to do something else in the
middle of something, it first quickly finishes it, e.g. turning the head ahead, putting
the leg down, waking up or closing the wings. Then it walks, blocks or flags.

Each flemming has a slightly different plumage, a few of them darker, most lighter.

## Implementation

See the [implementation](IMPLEMENTATION.md) details.
