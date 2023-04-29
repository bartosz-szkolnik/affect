import type { Affect } from './affect';

// @ts-ignore
export const isNew = (prev: Affect.Props, next: Affect.Props) => (key: string) => prev[key] !== next[key];
export const isGone = (_prev: Affect.Props, next: Affect.Props) => (key: string) => !(key in next);
export const isEvent = (key: string) => key.startsWith('on');
export const isProperty = (key: string) => key !== 'children' && !isEvent(key);
export const addEventListener = (eventType: string, to: Node, what: Affect.Props, name: string) => {
  // @ts-ignore
  const prop = what[name] as Affect.EventHandler;
  to.addEventListener(eventType, prop);
};
export const removeEventListener = (eventType: string, to: Node, what: Affect.Props, name: string) => {
  // @ts-ignore
  const prop = what[name] as Affect.EventHandler;
  to.removeEventListener(eventType, prop);
};

export const assignProperty = (name: string, to: Node, from?: Record<string, string> | string) => {
  if (name === 'style') {
    // @ts-ignore
    applyStyles(from[name], to['style']);
    return;
  }

  if (typeof from === 'string') {
    // @ts-ignore
    to[name] = from;
  }

  // @ts-ignore
  to[name] = from[name];
};

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
