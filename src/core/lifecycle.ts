import type {
  ComponentDescription,
  NodeDescription,
  Props,
} from './description.js'
import type {
  Component,
  ComponentClass,
  ParentVirtualNode,
  VirtualNode,
  WebComponent,
} from './nodes.js'
import Patch from './patch.js'
import type { AnyFunction } from './utils.js'

type Hook =
  | 'onCreated'
  | 'onAttached'
  | 'onPropsReceived'
  | 'onUpdated'
  | 'onDestroyed'
  | 'onDetached'

/* An error collected in an update, with where it was thrown. */
export interface CollectedError {
  error: unknown
  source: string
}

/* The errors of the hooks called while collecting them, if collecting. */
let hookErrors: CollectedError[] | null = null

/*
 * Calls the hook of a component, if it defines it, collecting its error
 * if collecting, so that a throwing hook does not stop the other hooks
 * from being called.
 */
const callHook = (component: Component, hook: Hook, ...args: unknown[]) => {
  if (!component.hasOwnMethod(hook)) {
    return
  }
  const call = () =>
    (component[hook] as AnyFunction).call(component.sandbox, ...args)
  if (!hookErrors) {
    call()
    return
  }
  try {
    call()
  } catch (error) {
    const name = (component.constructor as ComponentClass).displayName
    hookErrors.push({ error, source: `${name}.${hook}()` })
  }
}

/*
 * Calls the hook of a component being removed, ignoring the commands it
 * issues. The dispatcher is shared with the root, so its mode is restored.
 */
const callIgnoringCommands = (component: Component, hook: Hook) => {
  if (!component.hasOwnMethod(hook)) {
    return
  }
  const { dispatcher } = component
  const { mode } = dispatcher
  dispatcher.ignoreIncoming()
  try {
    callHook(component, hook)
  } finally {
    dispatcher.mode = mode
  }
}

/* The name and the message of an error, indented when on many lines. */
const describeError = (error: unknown) =>
  (error instanceof Error ? `${error.name}: ${error.message}` : String(error))
    .split('\n')
    .join('\n  ')

/*
 * Throws the errors, aggregated when there are more of them, listing
 * in the message where each one was thrown, as the console shows only
 * the message and the stack of the aggregated error.
 */
export const throwErrors = (errors: CollectedError[], message: string) => {
  if (errors.length === 1) {
    throw errors[0]!.error
  }
  if (errors.length > 1) {
    const causes = errors.map(
      ({ error, source }) => `- ${source}: ${describeError(error)}`,
    )
    throw new AggregateError(
      errors.map(({ error }) => error),
      [`${message}:`, ...causes].join('\n'),
    )
  }
}

const Lifecycle = {
  /**
   * Calls the hooks in the callback, collecting the errors they throw in
   * the given list instead of stopping at the first one.
   */
  collectingErrors(errors: CollectedError[], callback: () => void) {
    const prevErrors = hookErrors
    hookErrors = errors
    try {
      callback()
    } finally {
      hookErrors = prevErrors
    }
  },

  onComponentCreated(component: Component) {
    callHook(component, 'onCreated')
    if (component.content) {
      this.onNodeCreated(component.content)
    }
  },

  onElementCreated(element: ParentVirtualNode) {
    if (element.childNodes) {
      for (const child of element.childNodes) {
        this.onNodeCreated(child)
      }
    }
  },

  onNodeCreated(node: VirtualNode): void {
    if (node.isElement()) {
      return this.onElementCreated(node)
    } else if (node.isComponent() && !node.isRoot()) {
      return this.onComponentCreated(node)
    }
  },

  onRootCreated(root: WebComponent) {
    callHook(root, 'onCreated')
    const { childNodes } = root
    if (childNodes) {
      for (const child of childNodes) {
        this.onNodeCreated(child)
      }
    }
  },

  onComponentAttached(component: Component) {
    if (component.content) {
      this.onNodeAttached(component.content)
    }
    callHook(component, 'onAttached')
  },

  onElementAttached(element: ParentVirtualNode) {
    if (element.childNodes) {
      for (const child of element.childNodes) {
        this.onNodeAttached(child)
      }
    }
  },

  onNodeAttached(node: VirtualNode): void {
    if (node.isElement()) {
      return this.onElementAttached(node)
    } else if (node.isComponent() && !node.isRoot()) {
      return this.onComponentAttached(node)
    }
  },

  onNodeReceivedDescription(node: VirtualNode, description: NodeDescription) {
    if (node.isComponent()) {
      this.onComponentReceivedProps(
        node,
        (description as ComponentDescription).props,
      )
    }
  },

  onNodeUpdated(node: VirtualNode, prevDescription: NodeDescription) {
    if (node.isComponent()) {
      this.onComponentUpdated(
        node,
        (prevDescription as ComponentDescription).props,
      )
    }
  },

  onRootAttached(root: WebComponent) {
    const { childNodes } = root
    if (childNodes) {
      for (const child of childNodes) {
        this.onNodeAttached(child)
      }
    }
    callHook(root, 'onAttached')
  },

  onComponentReceivedProps(component: Component, nextProps: Props = {}) {
    callHook(component, 'onPropsReceived', nextProps)
  },

  onComponentUpdated(component: Component, prevProps: Props = {}) {
    callHook(component, 'onUpdated', prevProps)
  },

  onComponentDestroyed(component: Component) {
    component.destroy()
    callIgnoringCommands(component, 'onDestroyed')
    if (component.content) {
      this.onNodeDestroyed(component.content)
    }
    if (component.isRoot()) {
      this.onElementDestroyed(component)
    }
  },

  onElementDestroyed(element: ParentVirtualNode) {
    if (element.childNodes) {
      for (const child of element.childNodes) {
        this.onNodeDestroyed(child)
      }
    }
  },

  onNodeDestroyed(node: VirtualNode): void {
    if (node.isElement()) {
      return this.onElementDestroyed(node)
    } else if (node.isComponent() && !node.isRoot()) {
      return this.onComponentDestroyed(node)
    }
  },

  onComponentDetached(component: Component) {
    if (component.isRoot()) {
      this.onElementDetached(component)
    }
    if (component.content) {
      this.onNodeDetached(component.content)
    }
    callIgnoringCommands(component, 'onDetached')
  },

  onElementDetached(element: ParentVirtualNode) {
    if (element.childNodes) {
      for (const child of element.childNodes) {
        this.onNodeDetached(child)
      }
    }
  },

  onNodeDetached(node: VirtualNode) {
    if (node.isElement()) {
      this.onElementDetached(node)
      node.parentNode = null
    } else if (node.isComponent() && !node.isRoot()) {
      this.onComponentDetached(node)
      node.parentNode = null
    }
  },

  beforeUpdate(patches: Patch[]) {
    for (const patch of patches) {
      this.beforePatchApplied(patch)
    }
  },

  beforePatchApplied(patch: Patch) {
    const Type = Patch.Type
    switch (patch.type) {
      case Type.INIT_ROOT_COMPONENT:
        this.onRootCreated(patch.root)
        return
      case Type.INSERT_CHILD:
        this.onNodeCreated(patch.node)
        return
      case Type.REPLACE_CHILD:
      case Type.SET_CONTENT:
        this.onNodeDestroyed(patch.child)
        this.onNodeCreated(patch.node)
        return
      case Type.REMOVE_CHILD:
        this.onNodeDestroyed(patch.child)
        return
      case Type.UPDATE_NODE:
        this.onNodeReceivedDescription(patch.node, patch.description)
        return
      case Type.UPDATE_STATE:
        this.onComponentReceivedProps(patch.root, patch.state)
        return
    }
  },

  afterUpdate(patches: Patch[]) {
    patches = [...patches].reverse()
    for (const patch of patches) {
      this.afterPatchApplied(patch)
    }
  },

  afterPatchApplied(patch: Patch) {
    const Type = Patch.Type
    switch (patch.type) {
      case Type.INIT_ROOT_COMPONENT:
        this.onRootAttached(patch.root)
        return
      case Type.INSERT_CHILD:
        this.onNodeAttached(patch.node)
        return
      case Type.REPLACE_CHILD:
      case Type.SET_CONTENT:
        this.onNodeDetached(patch.child)
        this.onNodeAttached(patch.node)
        return
      case Type.REMOVE_CHILD:
        this.onNodeDetached(patch.child)
        return
      case Type.UPDATE_NODE:
        this.onNodeUpdated(patch.node, patch.prevDescription)
        return
      case Type.UPDATE_STATE:
        this.onComponentUpdated(patch.root, patch.prevState)
        return
    }
  },
}

export default Lifecycle
