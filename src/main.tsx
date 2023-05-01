import Affect, { useState } from './affect';

declare const React: any;

function Counter() {
  const [state, setState] = useState(1);

  return <h1 onClick={() => setState(c => c + 1)}>Count: {state}</h1>;
}

/** @jsx Affect.createElement */
const element = (
  <div id="foo">
    <a style={{ color: 'red' }} className="link">
      bar
    </a>
    <b />
    <Counter />
  </div>
);

const container = document.getElementById('root')!;
Affect.renderWithFibers(element, container);
