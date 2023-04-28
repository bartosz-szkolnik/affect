// todo add babel so that is can be transpiled
// /** @jsx Affect.createElement */
// const element = (
//   <div id="foo">
//     <a>bar</a>
//     <b />
//   </div>
// )

namespace Affect {
  export type Children = Affect.Element[];

  export type Element = {
    type: string;
    props: Record<string, string> | { children: Children };
  };

  export type Fiber = {
    dom: Node;
    type: string;
    parent?: Fiber;
    child?: Fiber;
    sibling?: Fiber;
    props: Record<string, string> | { children: Children };
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
  type: string,
  props?: Record<string, string> | null,
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

const isProperty = (key: string) => key !== 'children';

const applyStyles = (styles: string, to: CSSStyleDeclaration) => {
  const tuples = styles.split(';').map(style => {
    return style
      .trim()
      .split(':')
      .map(value => value.trim());
  }) as [string, string][];

  tuples.forEach(([property, style]: [string, string]) => {
    // @ts-ignore
    to[property] = style;
  });
};

const assignProperty = (name: string, to: Node, from: Record<string, string>) => {
  if (name === 'style') {
    // @ts-ignore
    applyStyles(from[name], to['style']);
  }

  // @ts-ignore
  to[name] = from[name];
};

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
  Object.keys(fiber.props)
    .filter(isProperty)
    .forEach(name => assignProperty(name, dom, fiber.props as Record<string, string>));

  return dom;
}

function renderWithFibers(element: Affect.Element, container: Node) {
  nextUnitOfWork = {
    dom: container,
    type: '', // is this good?
    props: {
      children: [element],
    },
  };
}

let nextUnitOfWork: Affect.Fiber | null = null;

function workLoop(deadline: IdleDeadline) {
  let shouldYield = false;
  while (nextUnitOfWork && !shouldYield) {
    nextUnitOfWork = performUnitOfWork(nextUnitOfWork);
    shouldYield = deadline.timeRemaining() < 1;
  }

  requestIdleCallback(workLoop);
}

requestIdleCallback(workLoop);

function performUnitOfWork(fiber: Affect.Fiber): Affect.Fiber {
  // add dom node
  if (!fiber.dom) {
    fiber.dom = createDom(fiber);
  }

  if (fiber.parent) {
    fiber.parent.dom.appendChild(fiber.dom);
  }

  // create new fibers
  const elements = fiber.props.children as Affect.Children;
  let index = 0;
  let prevSibling: Affect.Fiber | null = null;

  while (index < elements.length) {
    const element = elements[index];

    const newFiber: Affect.Fiber = {
      type: element.type,
      props: element.props,
      parent: fiber,
      dom: null as unknown as Node,
    };

    if (index === 0) {
      fiber.child = newFiber;
    } else if (prevSibling) {
      prevSibling.sibling = newFiber;
    }

    prevSibling = newFiber;
    index++;
  }

  // return next unit of work
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

  throw new Error('Should not have gotten here.');
}

const Affect = {
  createElement,
  render,
};

const element = Affect.createElement(
  'div',
  { id: 'foo' },
  Affect.createElement('h1', null, 'Hello there children'),
  Affect.createElement('main', null, Affect.createElement('p', null, 'This is a paragraph for your pleasure.')),
  Affect.createElement(
    'a',
    { style: 'color: green', href: 'https://github.com/bartosz-szkolnik', target: '__blank' },
    "This text is unnecessarily green and if you click it, it will open a new tab with author's Github page.",
  ),
  Affect.createElement('b'),
);

const container = document.getElementById('root')!;
renderWithFibers(element, container);
