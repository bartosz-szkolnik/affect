import { assignProperty, isEvent, isGone, isNew, isProperty, removeEventListener, addEventListener } from './utils';

export namespace Affect {
  export type FunctionComponent<T> = (props: Props<T>) => Affect.Element;
  export type HostType = keyof HTMLElementTagNameMap | keyof HTMLElementDeprecatedTagNameMap | 'TEXT_ELEMENT';
  export type Type = HostType | FunctionComponent<any>;
  export type EventHandler = (event: Event) => void;

  export type Children = Affect.Element[];
  export type Props<T = { [key: string]: string | EventHandler }> = T | { children: Children };

  export type Element = {
    type: Type;
    props: Props;
  };

  export type Fiber = {
    dom: Node | null;
    type: Type;
    parent: Fiber | null;
    child: Fiber | null;
    sibling: Fiber | null;
    alternate: Fiber | null;
    props: Props;
    hooks: Hook[];
    effectTag?: 'UPDATE' | 'PLACEMENT' | 'DELETION';
  };

  export type Action<T> = T | ((c: T) => T);
  export type Hook<T = unknown> = {
    state: T;
    queue: Action<T>[];
  };

  function createTextElement(text: string): Affect.Element {
    return {
      type: 'TEXT_ELEMENT',
      props: {
        nodeValue: text,
        children: [],
      },
    };
  }

  export function createElement<T = Record<string, string | Affect.EventHandler>>(
    type: Affect.Type,
    props?: T | null,
    ...children: (Affect.Element | string)[]
  ): Affect.Element {
    return {
      type,
      props: {
        ...props,
        children: children.map(child => (typeof child === 'object' ? child : createTextElement(child))),
      },
    };
  }

  export function render(element: Affect.Element, container: Node) {
    const type = element.type as Affect.HostType;
    const dom = element.type === 'TEXT_ELEMENT' ? document.createTextNode('') : document.createElement(type);

    Object.keys(element.props)
      .filter(isProperty)
      .forEach(name => assignProperty(name, dom, element.props as Record<string, string>));

    if (!Array.isArray(element.props.children)) {
      throw new Error('You created a children prop that is not an array. Fix it first.');
    }
    element.props.children.forEach(child => render(child, dom));

    container.appendChild(dom);
  }

  function createDom(fiber: Affect.Fiber) {
    const type = fiber.type as Affect.HostType;
    const dom = fiber.type === 'TEXT_ELEMENT' ? document.createTextNode('') : document.createElement(type);

    updateDom(dom, {}, fiber.props);
    return dom;
  }

  function updateDom(dom: Node, prevProps: Affect.Props, nextProps: Affect.Props) {
    // Remove old or changed event listeners
    Object.keys(prevProps)
      .filter(isEvent)
      .filter(key => !(key in nextProps) || isNew(prevProps, nextProps)(key))
      .forEach(name => {
        const eventType = name.toLowerCase().substring(2);
        removeEventListener(eventType, dom, prevProps, name);
      });

    // Remove old properties
    Object.keys(prevProps)
      .filter(isProperty)
      .filter(isGone(prevProps, nextProps))
      .forEach(name => {
        assignProperty(name, dom, '');
      });

    // Set new or changed properties
    Object.keys(nextProps)
      .filter(isProperty)
      .filter(isNew(prevProps, nextProps))
      .forEach(name => {
        assignProperty(name, dom, nextProps as Record<string, string>);
      });

    // Add event listeners
    Object.keys(nextProps)
      .filter(isEvent)
      .filter(isNew(prevProps, nextProps))
      .forEach(name => {
        const eventType = name.toLowerCase().substring(2);
        addEventListener(eventType, dom, nextProps, name);
      });
  }

  function commitRoot() {
    deletions?.forEach(commitWork);
    commitWork(wipRoot?.child ?? null);
    currentRoot = wipRoot;
    wipRoot = null;
  }

  function commitWork(fiber: Affect.Fiber | null) {
    if (!fiber) {
      return;
    }

    let domParentFiber = fiber.parent!;
    while (!domParentFiber.dom) {
      domParentFiber = domParentFiber.parent!;
    }
    const domParent = domParentFiber.dom;

    if (fiber.effectTag === 'PLACEMENT' && fiber.dom != null) {
      domParent.appendChild(fiber.dom);
    } else if (fiber.effectTag === 'UPDATE' && fiber.dom != null) {
      updateDom(fiber.dom, fiber.alternate?.props!, fiber.props);
    } else if (fiber.effectTag === 'DELETION') {
      commitDeletion(fiber, domParent);
    }

    commitWork(fiber.child);
    commitWork(fiber.sibling);
  }

  function commitDeletion(fiber: Affect.Fiber, domParent: Node) {
    if (fiber.dom) {
      domParent.removeChild(fiber.dom);
    } else {
      commitDeletion(fiber.child!, domParent);
    }
  }

  export function renderWithFibers(element: Affect.Element, container: Node) {
    wipRoot = {
      dom: container,
      type: 'div',
      props: {
        children: [element],
      },
      alternate: currentRoot,
      child: null,
      parent: null,
      sibling: null,
      hooks: [],
    };

    deletions = [];
    nextUnitOfWork = wipRoot;
  }

  let nextUnitOfWork: Affect.Fiber | null = null;
  let currentRoot: Affect.Fiber | null = null;
  let wipRoot: Affect.Fiber | null = null;
  let deletions: Affect.Fiber[] | null = null;

  function workLoop(deadline: IdleDeadline) {
    let shouldYield = false;
    while (nextUnitOfWork && !shouldYield) {
      nextUnitOfWork = performUnitOfWork(nextUnitOfWork);
      shouldYield = deadline.timeRemaining() < 1;
    }

    if (!nextUnitOfWork && wipRoot) {
      commitRoot();
    }

    requestIdleCallback(workLoop);
  }

  requestIdleCallback(workLoop);

  function performUnitOfWork(fiber: Affect.Fiber): Affect.Fiber {
    const isFunctionComponent = fiber.type instanceof Function;
    if (isFunctionComponent) {
      updateFunctionComponent(fiber);
    } else {
      updateHostComponent(fiber);
    }

    if (fiber.child) {
      return fiber.child;
    }

    let nextFiber = fiber;
    while (nextFiber) {
      if (nextFiber.sibling) {
        return nextFiber.sibling;
      }
      nextFiber = nextFiber.parent!;
    }

    return undefined as unknown as Affect.Fiber;
  }

  let wipFiber: Affect.Fiber | null = null;
  let hookIndex: number | null = null;

  function updateFunctionComponent(fiber: Affect.Fiber) {
    wipFiber = fiber;
    hookIndex = 0;
    wipFiber.hooks = [];

    const type = fiber.type as Affect.FunctionComponent<any>;
    const children = [type(fiber.props)];
    reconcileChildren(fiber, children);
  }

  export function useState<T>(initialValue: T) {
    const oldHook = wipFiber && wipFiber.alternate && wipFiber.alternate.hooks && wipFiber.alternate.hooks[hookIndex!];
    const hook: Affect.Hook = { state: oldHook ? oldHook.state : initialValue, queue: [] };

    const actions = oldHook ? oldHook.queue : [];
    actions.forEach(action => {
      if (typeof action === 'function') {
        hook.state = action(hook.state);
        return;
      }

      hook.state = action;
    });

    const setState = (action: Affect.Action<T>) => {
      hook.queue.push(action);
      wipRoot = {
        dom: currentRoot?.dom!,
        props: currentRoot?.props!,
        alternate: currentRoot,
        child: null,
        hooks: [],
        parent: null,
        sibling: null,
        type: 'div',
      };
      nextUnitOfWork = wipRoot;
      deletions = [];
    };

    wipFiber?.hooks.push(hook);
    hookIndex && hookIndex++;
    return [hook.state, setState] as const;
  }

  function updateHostComponent(fiber: Affect.Fiber) {
    if (!fiber.dom) {
      fiber.dom = createDom(fiber);
    }

    const elements = fiber.props.children as Affect.Children;
    reconcileChildren(fiber, elements);
  }

  function reconcileChildren(wipFiber: Affect.Fiber, elements: Affect.Children) {
    let index = 0;
    let oldFiber = wipFiber.alternate && wipFiber.alternate.child;
    let prevSibling: Affect.Fiber | null = null;

    while (index < elements.length || oldFiber != null) {
      const element = elements[index];
      let newFiber: Affect.Fiber | null = null;

      const sameType = oldFiber && element && element.type == oldFiber.type;
      if (sameType && oldFiber && element) {
        newFiber = {
          type: oldFiber.type,
          props: element.props,
          dom: oldFiber.dom,
          parent: wipFiber,
          alternate: oldFiber,
          child: null,
          sibling: null,
          effectTag: 'UPDATE',
          hooks: [],
        };
      }
      if (element && !sameType) {
        newFiber = {
          type: element.type,
          props: element.props,
          dom: null,
          parent: wipFiber,
          alternate: null,
          effectTag: 'PLACEMENT',
          child: null,
          sibling: null,
          hooks: [],
        };
      }
      if (oldFiber && !sameType) {
        oldFiber.effectTag = 'DELETION';
        deletions!.push(oldFiber);
      }

      if (oldFiber) {
        oldFiber = oldFiber.sibling;
      }

      if (index === 0) {
        wipFiber.child = newFiber;
      } else if (element && prevSibling) {
        prevSibling.sibling = newFiber;
      }

      prevSibling = newFiber;
      index++;
    }
  }
}

export default {
  createElement: Affect.createElement,
  render: Affect.render,
  renderWithFibers: Affect.renderWithFibers,
  useState: Affect.useState,
};

export const createElement = Affect.createElement;
export const render = Affect.render;
export const renderWithFibers = Affect.renderWithFibers;
export const useState = Affect.useState;
