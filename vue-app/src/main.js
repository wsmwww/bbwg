import { createApp } from 'vue';
import App from './App.vue';

let app = null;

function render(props = {}) {
  const container = props.container
    ? props.container.querySelector('#vue-root')
    : document.querySelector('#vue-root');
  app = createApp(App);
  app.mount(container);
}

if (!window.__POWERED_BY_QIANKUN__) {
  render();
}

export async function bootstrap() {
  console.log('[vue-app] bootstrap');
}

export async function mount(props) {
  console.log('[vue-app] mount', props);
  render(props);
}

export async function unmount() {
  console.log('[vue-app] unmount');
  app.unmount();
  app = null;
}
