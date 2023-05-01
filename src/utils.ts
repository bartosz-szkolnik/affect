import type { Affect } from './affect';

// @ts-expect-error
export const isNew = (prev: Affect.Props, next: Affect.Props) => (key: string) => prev[key] !== next[key];
export const isGone = (_prev: Affect.Props, next: Affect.Props) => (key: string) => !(key in next);
export const isEvent = (key: string) => key.startsWith('on');
export const isProperty = (key: string) => key !== 'children' && !isEvent(key);

export const addEventListener = (eventType: string, to: Node, what: Affect.Props, name: string) => {
  // @ts-expect-error
  const prop = what[name] as Affect.EventHandler;
  to.addEventListener(eventType, prop);
};

export const removeEventListener = (eventType: string, to: Node, what: Affect.Props, name: string) => {
  // @ts-expect-error
  const prop = what[name] as Affect.EventHandler;
  to.removeEventListener(eventType, prop);
};

export const assignProperty = (name: string, to: Node, from: Record<string, string> | string) => {
  if (typeof from === 'string') {
    // @ts-expect-error
    to[name] = from;
  }

  // @ts-expect-error
  to[name] = from[name];
};

const reg = /[A-Z]/g;
export function assignStyles(dom: Node, props: Affect.StylesProp) {
  console.log(dom, props.style);

  // @ts-expect-error
  (dom as HTMLElement).style = Object.keys(props.style).reduce((acc, styleName) => {
    const key = styleName.replace(reg, v => '-' + v.toLowerCase());
    return `${acc}${key}: ${props.style[styleName]};`;
  }, '');
}

export function assignClassName(dom: Node, prevProps: { [key: string]: string }, nextProps: { [key: string]: string }) {
  const node = dom as Element;
  prevProps.className && node.classList.remove(...prevProps.className.split(/\s+/));
  node.classList.add(...nextProps.className.split(/\s+/));
}
