// todo add babel so that is can be transpiled
// /** @jsx Affect.createElement */
// const element = (
//   <div id="foo">
//     <a>bar</a>
//     <b />
//   </div>
// )

import { assignProperty, isEvent, isGone, isNew, isProperty } from './utils';

export namespace Affect {
  export type Type = keyof HTMLElementTagNameMap | keyof HTMLElementDeprecatedTagNameMap | 'TEXT_ELEMENT';
  export type EventHandler = (event: KeyboardEvent) => void;

  export type Children = Affect.Element[];
  export type Props = { [key: string]: string | EventHandler } | { children: Children };

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
    effectTag?: 'UPDATE' | 'PLACEMENT' | 'DELETION';
  };
}

function createTextElement(text: string): Affect.Element {
  return {
    type: 'TEXT_ELEMENT',
    props: {
      nodeValue: text,
      children: [],
    },
  };
}

function createElement(
  type: Affect.Type,
  props?: Record<string, string | Affect.EventHandler> | null,
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

function render(element: Affect.Element, container: Node) {
  const dom = element.type === 'TEXT_ELEMENT' ? document.createTextNode('') : document.createElement(element.type);

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
  const dom = fiber.type === 'TEXT_ELEMENT' ? document.createTextNode('') : document.createElement(fiber.type);

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
      // @ts-ignore
      dom.removeEventListener(eventType, prevProps[name]);
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
      // @ts-ignore
      dom.addEventListener(eventType, nextProps[name]);
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

  const domParent = fiber.parent?.dom!;
  if (fiber.effectTag === 'PLACEMENT' && fiber.dom != null) {
    domParent.appendChild(fiber.dom);
  } else if (fiber.effectTag === 'UPDATE' && fiber.dom != null) {
    updateDom(fiber.dom, fiber.alternate?.props!, fiber.props);
  } else if (fiber.effectTag === 'DELETION') {
    if (!fiber.dom) {
      throw new Error("Something went wrong with one of the fiber's dom properties");
    }
    domParent.removeChild(fiber.dom);
  }

  commitWork(fiber.child);
  commitWork(fiber.sibling);
}

function renderWithFibers(element: Affect.Element, container: Node) {
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
  if (!fiber.dom) {
    fiber.dom = createDom(fiber);
  }

  const elements = fiber.props.children as Affect.Children;
  reconcileChildren(fiber, elements);

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

const Affect = {
  createElement,
  render,
  renderWithFibers,
};

const container = document.getElementById('root')!;

const updateValue = (event: KeyboardEvent) => {
  const target = event.target as HTMLInputElement;
  rerender(target.value);
};

const rerender = (value: string) => {
  const element = Affect.createElement(
    'div',
    { id: 'app', style: 'text-align: center' },
    Affect.createElement('header', null, Affect.createElement('h1', null, 'Hello there children')),
    Affect.createElement(
      'main',
      null,
      Affect.createElement('p', null, 'This is a paragraph for your pleasure.'),
      Affect.createElement('button', { style: 'margin-bottom: 20px', id: 'btn' }, 'Click me!'),
      Affect.createElement('br'),
      Affect.createElement(
        'a',
        {
          style: 'color: #ccc; background-color: #333; padding: 10px; border-radius: 10px',
          href: 'https://github.com/bartosz-szkolnik',
          target: '__blank',
        },
        "This text is unnecessarily styled and if you click it, it will open a new tab with author's Github page.",
      ),
    ),
    Affect.createElement('br'),
    Affect.createElement('div', null, 'Heres some stupid text for the browser to render!'),
    Affect.createElement(
      'footer',
      { style: 'position: absolute; bottom: 8px; width: 100vw' },
      Affect.createElement('marquee', null, "Here's a footer for you!"),
    ),
  );

  const element2 = Affect.createElement(
    'div',
    null,
    Affect.createElement('input', { onInput: updateValue, value }),
    Affect.createElement('h2', null, `Hello ${value}`),
  );

  Affect.renderWithFibers(element2, container);
};

rerender('Mom!');

// setTimeout(() => {
//   document.getElementById('btn')?.addEventListener('click', () => {
//     console.log('Hello mom!');
//   });
// }, 1000);
