import Affect, { useState } from './affect';

const container = document.getElementById('root')!;

const updateValue = (event: KeyboardEvent) => {
  const target = event.target as HTMLInputElement;
  rerender(target.value);
};

type AppProps = { name: string };
function App(props: AppProps) {
  return Affect.createElement('h1', null, `Hi there guys! You ${props.name}`);
}

function Counter() {
  const [state, setState] = useState(1);

  return Affect.createElement('h1', { onClick: () => setState(c => c + 1) }, `Count: ${state}`);
}

const rerender = (value: string) => {
  const element = Affect.createElement(
    'div',
    { id: 'app', style: 'text-align: center' },
    Affect.createElement('header', null, Affect.createElement('h1', null, 'Hello there children')),
    Affect.createElement(
      'main',
      null,
      Affect.createElement('p', null, 'This is a paragraph for your pleasure.'),
      Affect.createElement(
        'button',
        {
          style: { marginBottom: '20px' },
          id: 'btn',
          onClick: () => {
            console.log('Hello mom!');
          },
        },
        'Click me!',
      ),
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
    Affect.createElement<AppProps>(App, { name: 'foo' }),
    Affect.createElement(
      'div',
      null,
      Affect.createElement('input', { onInput: updateValue, value }),
      Affect.createElement('h2', null, `Hello ${value}`),
    ),
    Affect.createElement(Counter),
    Affect.createElement(
      'footer',
      { style: 'position: absolute; bottom: 8px; width: 100vw' },
      Affect.createElement('marquee', null, "Here's a footer for you!"),
    ),
  );

  Affect.renderWithFibers(element, container);
};

rerender('Mom!');
