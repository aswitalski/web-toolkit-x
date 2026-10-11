import toolkit, { type Template } from '../../src/index.js'
import { type VirtualElement } from '../../src/core/nodes.js'

/* A pseudo-random number generator, repeating the cases for a seed. */
const createRandom = (seed: number) => () => {
  seed = (seed * 1103515245 + 12345) % 2 ** 31
  return seed / 2 ** 31
}

const shuffle = <T>(items: T[], random: () => number) => {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[items[i], items[j]] = [items[j], items[i]]
  }
  return items
}

describe('Keyed children', () => {
  let container: HTMLElement

  beforeEach(() => {
    container = document.createElement('section')
    document.body.appendChild(container)
  })

  afterEach(() => {
    container.remove()
  })

  class List extends toolkit.WebComponent<{ keys: string[]; version: number }> {
    getInitialState() {
      return { keys: [], version: 0 }
    }

    render(): Template {
      const { keys, version } = this.props
      return [
        'ul',
        ...keys.map(key => ['li', { key }, `${key}:${version}`] as const),
      ]
    }
  }

  it('renders the keys in order after random updates', async () => {
    // given
    const list = await toolkit.render(List, container)
    const ul = list.content as VirtualElement
    const random = createRandom(1)
    let keys: string[] = []
    let version = 0
    let counter = 0

    for (let update = 0; update < 300; update++) {
      const kept = keys.filter(() => random() < 0.8)
      const added = Array.from(
        { length: Math.floor(random() * 4) },
        () => `k${counter++}`,
      )
      const nextKeys =
        random() < 0.5
          ? [...kept, ...added]
          : shuffle([...kept, ...added], random)
      if (random() < 0.3) {
        version++
      }
      const elements = new Map(
        (ul.children ?? []).map(node => [node.key, node.ref]),
      )

      // when
      await list.commands.update({ keys: nextKeys, version })

      // then
      const rendered = [...ul.ref.children]
      assert.deepEqual(
        rendered.map(element => element.textContent),
        nextKeys.map(key => `${key}:${version}`),
        `update ${update}`,
      )
      assert.deepEqual(
        (ul.children ?? []).map(node => node.key),
        nextKeys,
        `update ${update}`,
      )
      for (const key of kept) {
        const index = nextKeys.indexOf(key)
        assert.equal(rendered[index], elements.get(key), `update ${update}`)
      }
      keys = nextKeys
    }
  })

  describe('with repeated keys', () => {
    afterEach(() => {
      toolkit.configure({ debug: true })
    })

    /* The elements of the children by their keys, in order of the repeats. */
    const getElements = (ul: VirtualElement) => {
      const elements = new Map<string, Element[]>()
      for (const node of ul.children ?? []) {
        elements.set(node.key!, [
          ...(elements.get(node.key!) ?? []),
          node.ref as Element,
        ])
      }
      return elements
    }

    it('rejects them in debug, naming them', async () => {
      // given
      const list = await toolkit.render(List, container)

      // when
      const update = list.commands.update({
        keys: ['a', 'b', 'a', 'c', 'b'],
        version: 0,
      })

      // then
      await expect(update).rejects.toThrow('Non-unique keys detected: a, b')
    })

    it('inserts and removes each child once outside debug', async () => {
      // given
      toolkit.configure({ debug: false })
      const list = await toolkit.render(List, container)
      const ul = list.content as VirtualElement
      await list.commands.update({ keys: ['a'], version: 0 })

      // when
      await list.commands.update({ keys: ['a', 'a'], version: 0 })

      // then
      assert.deepEqual(
        (ul.children ?? []).map(node => node.ref),
        [...ul.ref.children],
      )

      // when
      await list.commands.update({ keys: [], version: 0 })

      // then
      assert.equal(ul.ref.children.length, 0)
      assert.equal(ul.children, undefined)
    })

    it('matches them in order after random updates outside debug', async () => {
      // given
      toolkit.configure({ debug: false })
      const list = await toolkit.render(List, container)
      const ul = list.content as VirtualElement
      const random = createRandom(2)

      for (let update = 0; update < 300; update++) {
        const nextKeys = Array.from(
          { length: Math.floor(random() * 8) },
          () => 'abcd'[Math.floor(random() * 4)],
        )
        const elements = getElements(ul)

        // when
        await list.commands.update({ keys: nextKeys, version: update })

        // then
        const rendered = [...ul.ref.children]
        assert.deepEqual(
          rendered.map(element => element.textContent),
          nextKeys.map(key => `${key}:${update}`),
          `update ${update}`,
        )
        assert.deepEqual(
          (ul.children ?? []).map(node => node.ref),
          rendered,
          `update ${update}`,
        )
        for (const [key, nextElements] of getElements(ul)) {
          const kept = elements.get(key) ?? []
          for (let i = 0; i < Math.min(kept.length, nextElements.length); i++) {
            assert.equal(nextElements[i], kept[i], `update ${update}`)
          }
        }
      }
    })
  })
})
