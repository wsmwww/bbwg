import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import './style.css';

function App() {
  const [count, setCount] = useState(0);

  return (
    <section className="react-page">
      <p className="eyebrow">React 17 micro app</p>
      <h2>我是 React 子应用</h2>
      <p>这个 React 页面和 Vue 页面完全独立，主应用只负责路由激活和容器挂载。</p>
      <button onClick={() => setCount(count + 1)}>React count: {count}</button>
    </section>
  );
}

function render(props = {}) {
  const container = props.container
    ? props.container.querySelector('#react-root')
    : document.querySelector('#react-root');
  ReactDOM.render(<App />, container);
}

if (!window.__POWERED_BY_QIANKUN__) {
  render();
}

export async function bootstrap() {
  console.log('[react-app] bootstrap');
}

export async function mount(props) {
  console.log('[react-app] mount', props);
  render(props);
}

export async function unmount(props) {
  console.log('[react-app] unmount', props);
  const container = props.container
    ? props.container.querySelector('#react-root')
    : document.querySelector('#react-root');
  ReactDOM.unmountComponentAtNode(container);
}
