# Implementation

How the [Flemmings](FLEMMINGS.md) game is built with Web Toolkit X, and which of its
features it shows.

## Components

The game is made of components with separate responsibilities, sharing the types in
[`types.ts`](../types.ts), the sizes and outlines of the terrain in
[`terrain.ts`](../terrain.ts), the clouds in [`clouds.ts`](../clouds.ts) and the random
numbers in [`random.ts`](../random.ts):

- **Web Components**, Game and Flemming, each rendered in its own custom element, with its
  own shadow root, styles, state and commands
- **plain components**, World, Landscape with its layers, Ripples, and Flock with its birds,
  rendering only their props, with no state of their own, in the custom element of the Web
  Component rendering them

Game and World are in the game's directory, and the components they render in
[`components`](../components).

### Game

The [Game](../game.ts) Web Component renders the `<f-game>` custom element with the World,
and runs it. It knows where each flemming is, what it is doing and which way it faces. It
moves them, makes them land, turn around, stop, block and flag their heads, and handles
the clicks.

Its commands, in [`game-commands.ts`](../game-commands.ts), act on the game:

| Command     | Does                                                                     |
| ----------- | ------------------------------------------------------------------------ |
| `tick`      | Moves the flemmings by the time passed, settles them and flags the heads |
| `resize`    | Makes the world as big as the window                                     |
| `dropFirst` | Drops the first flemming out of the leftmost cloud within the window     |
| `drop`      | Drops a flemming out of a cloud, unless the cloud was just clicked       |
| `stopAll`   | Stops all the walking flemmings, and the ones about to walk on           |

and on a particular flemming, by its id:

| Command       | Does                                                              |
| ------------- | ----------------------------------------------------------------- |
| `toggle`      | Stops a flemming, makes it walk on or dive, or releases a blocker |
| `block`       | Makes a flemming a blocker, or releases one                       |
| `ready`       | Lets a settled flemming do the next thing                         |
| `setHeadDown` | Keeps whether a flemming has its head down                        |
| `dip`         | Splashes the water where a flemming dips its head                 |

It renders the [World](#world) with the [Flock](../components/flock.ts) in it, a plain
component rendering a Bird for each flemming. A Bird places the flemming in the world,
with its size and clipping out of a cloud, and renders the Flemming, passing it only what
it needs, as props, with its methods calling the listeners and the callbacks of the game
with its id.

### World

The [World](../world.ts) plain component renders the scene from the world, the size of
the window and of a sprite pixel, and the splashes, with the flemmings given as its
children, placed in front of the land and behind the clouds and the water. It takes the
listeners of the clicks on the clouds and the ground from the game.

It renders the [Landscape](../components/landscape.ts), the `<main>` element as wide as the
world, with its layers as children: the sky, the sun, the ground, the trees, the clouds and
the water, from the same file, and the [ripples](../components/ripples.ts), with a splash
for each one, all plain components too.

### Flemming

The [Flemming](../components/flemming.ts) Web Component renders the `<f-lemming>` custom
element with a single flemming. It knows what it looks like and what it does when bored:
looking back, preening, saluting, standing on one leg, sleeping or feeding. It doesn't
know where it is, nor anything about the world or the other flemmings.

Its props are what it does and which way it faces, and the [callbacks](#callbacks) telling
the game what only the flemming knows:

```ts
{ activity: 'walking', direction: 'right', onDip, onHeadChange, onReady }
```

The activity is one of the [activities](#activities), and the direction `left` or `right`.

It has a single command, `advance`, in
[`flemming-commands.ts`](../components/flemming-commands.ts), choosing what to do next when
bored.

So the game doesn't have to care about the fine-grained details of each flemming, like
which leg it stands on, whether it is asleep or how long it will preen. These are
encapsulated in the flemming: its own state, timers and animations. Adding another thing to
do when bored changes only the flemming, and the physics of the game change only the game.

## State

Each Web Component has a state, created from its props in `getInitialState()`, and
rendered by its `render()` method, which sees it as `this.props`.

### Game

The state of the game, `GameState`, holds:

- `world`: the size of the window and the size of a sprite pixel
- `flemmings`: each one with its position, falling speed, activity and direction,
  and the timing of what it does, e.g. the time left of turning around, the time its group
  flags the heads, or the activity it does once settled
- `ripples`: the splashes on the water, removed once over
- `disabledClouds`: the times the clicked clouds drop flemmings again
- `time`: the time of the last update

Positions are in sprite pixels from the bottom left corner of the world, so only the
clouds depend on the window height, high above the ground. A sprite pixel has a fixed
size, so the flemmings keep their size at any window size.

The game never reads the DOM, only the size of the window, from `innerWidth` and
`innerHeight`. It knows where it renders each cloud, so a click tells it only the id of the
cloud or the flemming clicked, and the time of a click on a cloud. The commands find the
flemming in the state, and the cloud among the ones they place in the world again.

### Flemming

The state of a flemming, `FlemmingElementState`, holds its props, its plumage, picked
when it is created and kept, and what it does when bored:

- `idle`: looking back, preening, saluting, sleeping or feeding, `null` when resting
- `ending`: what it just did, turned back until it does something else
- `oneLeg`, `loweringLeg`: standing on one leg, or putting the other one down
- `stirring`: treading the mud before feeding
- `idleTime`: the seconds until it does something else
- `settling`, `skipped`: what it finishes when settling, e.g. putting the leg down, and
  the part of it skipped, already past the frame it shows
- `phase`: counts the changes, so the timers set before the last one are ignored

It is a transient state. Whenever the props of a flemming change, `getUpdatedState()`
gets the new props and the current state, and decides what to keep. With the same
activity, it keeps its state and takes the new props, the direction and the callbacks.
With another activity, it starts afresh but for its plumage, so a walking flemming never
holds a leg up from when it stood.

## Commands

The state changes only in commands, plain methods changing the state given as `this` as if
it was mutable, and in `getUpdatedState()`, when a flemming gets new props. Toolkit turns
the changes of a command into a new immutable state and renders it, or does nothing when
nothing changed. As commands can't call each other, the logic they share is in functions
taking a flemming, like `stop()`, `settle()` or `unblock()`.

Each command returns a promise resolving with `true` once it is executed, even when it
changed nothing. Once a component is destroyed, its commands are ignored and resolve with
`false`.

## Lifecycle

The components react to their lifecycle with these methods:

- `onCreated()` and `onDestroyed()`: the game listens to the window resizes
- `onAttached()`: the game drops the first flemming out of the leftmost cloud in the window
  and starts the animation loop, and a flemming starts its timer
- `onUpdated()`: a flemming starts the timer of what it does next, and tells the game when
  its head goes down or up, under the water, or once settled

### Animation loop

The game runs on `requestAnimationFrame`, issuing the `tick` command with the frame time,
and requests the next frame once the state is updated:

```ts
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
```

- The time passed is capped, so the flemmings don't jump, e.g. after switching back to a
  background tab
- The loop stops once the game is destroyed, as `tick` resolves with `false`
- A failed tick is logged and the loop goes on
- Slowing down the animations in DevTools slows down both the frame time and the CSS
  animations, so the movement stays in sync with them, but not the [timers](#timers) of a
  flemming

### Timers

A flemming times what it does with `setTimeout`, each timer taking the phase it was set in.
When it fires, the `advance` command is ignored if the phase has changed since, e.g. when
the game made it walk, and so are the callbacks. These timers aren't slowed down with the
animations in DevTools.

## Callbacks

A flemming tells the game what only it knows by calling the callbacks it gets as props.
They are typed, and the flemming doesn't need to know its id, as its Bird passes its own
methods calling the callbacks of the game with it:

```ts
onHeadChange(down: boolean) {
  this.props.onHeadChange(this.props.flemming.id, down)
}
```

The methods of a component read as `this.onHeadChange` are bound once, the same on each
render, so the props of a flemming stay equal while it keeps doing the same thing, and it
isn't updated on every frame, as it would be with new arrow functions. The listeners of the
clicks on a Bird and a cloud are their methods too, calling the game with their ids, the
Bird ignoring the second click of a double-click.

| Callback       | When                                       | Command       | Effect                    |
| -------------- | ------------------------------------------ | ------------- | ------------------------- |
| `onHeadChange` | Its head goes down or up                   | `setHeadDown` | Head-down ones don't flag |
| `onDip`        | Its head goes under the water when feeding | `dip`         | A splash at the head      |
| `onReady`      | It has finished what it did, when settling | `ready`       | It does the next thing    |

The game decides, the flemming informs: the game never asks a flemming for its state.

## Activities

The activity is what the game tells a flemming to do:

| Activity     | Does                                          | Then                                    |
| ------------ | --------------------------------------------- | --------------------------------------- |
| `falling`    | Falls slowly, flapping its wings              | `walking` on landing                    |
| `diving`     | Falls faster, with its wings folded           | `walking` on landing                    |
| `walking`    | Walks, in step with its stride                | `turning` at a border or a blocker      |
| `turning`    | Turns the head, then the body                 | `walking` the other way, unless stopped |
| `standing`   | Stands, doing something when bored            | `settling`                              |
| `wading`     | Stands in deeper water, feeding now and then  | `settling`                              |
| `blocking`   | Spreads its wings, holding them open          | `unblocking`                            |
| `unblocking` | Folds its wings                               | `walking`, unless stopped               |
| `flagging`   | Turns the head to the other side for a moment | `standing` or `wading`, turning it back |
| `settling`   | Quickly finishes what it does                 | The next activity, once ready           |

A flemming walks back from beyond the window border, when the window gets narrower, and
turns around just before a blocker.

## Being bored

What a standing or wading flemming does is up to the flemming alone. It rests, then does
something, and rests again:

- On two legs it looks back, preens, salutes or lifts a leg
- On one leg it looks back, sleeps or puts the leg down
- Wading, it feeds, mostly treading the mud first

The times of standing cluster around the middle of their ranges, while the ones of
wading are uniformly random, so the flemmings wading together drift apart.

## Settling

A flemming interrupted in the middle of something, e.g. with its head tucked, would jump
to another pose. So a standing, wading or flagging flemming to walk, block or flag
settles first, in a handshake between the two components:

1. The game sets its activity to `settling`, keeping the next one
2. The flemming, in `getUpdatedState()`, picks what to finish from what it does, e.g.
   turning the head ahead, putting the leg down or waking up, and the frame its image
   shows, read from its computed style, also partway through starting or ending it
3. It plays that quickly from that frame, then calls `onReady`
4. The game switches it to the next activity, or after a moment anyway, without the call

A double-click on a flemming settling to walk makes it settle to block instead.

## Groups

The game finds the groups on every tick: at least 3 flemmings close to each other, either
standing, on the land or in the shallow water, or wading, facing the same way.

- A group gets a time to flag its heads, shared by all its members, and a new one whenever
  another flemming joins it
- When the time comes, almost all of its members join in, but not the ones with their
  heads down, as told by their `onHeadChange` callbacks
- The ones joining settle first, and start flagging only once all of them are ready, so
  they turn their heads all at once
- Each one turns its head, holds it there for a moment, and stands or wades again, its
  new state turning the head back

## Rendering

### Templates

The components render Bragi templates, plain arrays of the element name, its attributes and
its children, or of a component, its props and its children. They use:

- keys for the lists of the flemmings, splashes and clouds, so each keeps its node
- styles with units, e.g. `width: [width * pixel, 'px']`, and custom properties, like
  `--pixel`, inherited into the shadow root of a flemming, and `--plumage`
- class lists and objects, e.g. `{ 'one-leg': oneLeg, stirring }`
- `ariaLabel` for the clouds
- `onClick` and `onDblClick` listeners, and callbacks as props

In the debug mode, Toolkit warns about mistakes in the templates, e.g. unknown attributes.
`npm run demo` runs the release build without it, while `npx vite demo` runs the demo
against the sources in the debug mode.

### Sprite

A flemming renders an `img` of [`flemming.svg`](../../../flemming.svg), a 528×24 strip of
33 frames, 16×24 each, drawn with a `crispEdges` path for each colour. Its classes, the
activity, the direction and what it does, pick the CSS animation in
[`flemming.css`](../../../styles/flemming.css), showing the frames by shifting the image
with `object-position`, in `steps()` or `step-end` keyframes. A flemming facing left is
mirrored with `scale: -1 1`, and its plumage set with a `brightness` filter.

| Frames | Shows                                                     |
| ------ | --------------------------------------------------------- |
| 0–3    | Walking                                                   |
| 4      | Standing                                                  |
| 5–8    | Turning the head to the front and back                    |
| 9–10   | Falling, flapping the wings                               |
| 11–14  | Lowering the head and feeding in the water                |
| 15     | Lifting a leg                                             |
| 16     | Standing on one leg                                       |
| 17–20  | Turning the head on one leg                               |
| 21     | Tucking the head                                          |
| 22–23  | Sleeping, breathing                                       |
| 24–25  | Preening                                                  |
| 26–27  | Saluting with the wings                                   |
| 28–29  | Treading the mud                                          |
| 30–31  | Blocking, the body to the front, the head the way it went |
| 32     | Diving with the wings folded                              |

### Scene

The World renders the layers of the scene, styled in
[`game.css`](../../../styles/game.css), from the back:

1. The sky, a gradient of a blue sunset
2. The sun just below the horizon, a faint orange glow on the right
3. The ground, clipped to the outline of the pond, double-clicked to stop all
4. The trees, the far and the near ones, repeating every 1024 sprite pixels
5. The splashes, a droplet jumping straight up and two flying off in random directions
6. The flemmings
7. The clouds, buttons dropping flemmings, high above the ground
8. The water, at 80% opacity, covering the legs of the ones in it

The outlines of the ground and the water are computed in [`terrain.ts`](../terrain.ts),
stepping down the banks of the pond, and the clouds are tiled across the world in
[`clouds.ts`](../clouds.ts). A flemming falling out of a cloud is clipped above its
bottom, so it comes out of it, moving with it when the window height changes.

## Tuning

The behaviour is tuned with the constants at the top of each file:

- [`game-commands.ts`](../game-commands.ts): the speeds, turning, the blocking distance,
  the cloud and double-click times, settling and the groups
- [`flemming-commands.ts`](../components/flemming-commands.ts): the resting, wading and
  idle times, the weights, stirring and the plumage
- [`flemming.ts`](../components/flemming.ts): the times of dipping, the frames of settling,
  and the frames held, settled from as the ones before them
- [`terrain.ts`](../terrain.ts): the sizes of the frame, the ground and the pond, and the
  height of a flemming, setting the size of a sprite pixel
- [`clouds.ts`](../clouds.ts): the shapes and places of the clouds, in two tiles, and the
  height of their band

Some of them repeat the times of the CSS animations, or depend on them, and have to match:

- `TURNING`, `UNBLOCKING` and `FLAGGING_TURN`: the 200ms of turning around, the 300ms of
  blocking and unblocking, and the 550ms of flagging
- `WALKING_SPEED`: a pixel for each frame of the walk, 4 frames in 320ms
- `RIPPLE_TIME`: at least the 1000ms of the ripples
- `DURATIONS.saluting`: the 1600ms of saluting
- in `flemming.ts`: the times of dipping, the frames of settling, and the held frames of
  sifting, breathing and nibbling
