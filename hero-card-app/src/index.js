import './style.css';

let root = null;
let resizeTimer = null;

function getRoot(props = {}) {
  if (props.container) {
    return props.container.querySelector('#hero-card-root');
  }
  return document.querySelector('#hero-card-root');
}

function getPublicPath() {
  return window.__INJECTED_PUBLIC_PATH_BY_QIANKUN__ || 'http://localhost:8084/';
}

function render(props = {}) {
  root = getRoot(props);
  if (!root) return;

  const staticUrl = new URL('static/index.html', getPublicPath()).toString();
  root.innerHTML = `
    <section class="hero-card-shell">
      <iframe
        class="hero-card-frame"
        src="${staticUrl}"
        title="游戏英雄卡片组"
      ></iframe>
    </section>
  `;

  const frame = root.querySelector('.hero-card-frame');
  frame.addEventListener('load', () => resizeFrame(frame));
  window.addEventListener('resize', scheduleResize);
  window.addEventListener('message', handleFrameMessage);
}

function handleFrameMessage(event) {
  if (!event.data || event.data.type !== 'hero-card-resize') return;
  const frame = root && root.querySelector('.hero-card-frame');
  if (!frame) return;
  frame.style.height = `${Math.max(event.data.height || 0, window.innerHeight - 120)}px`;
}

function scheduleResize() {
  window.clearTimeout(resizeTimer);
  resizeTimer = window.setTimeout(() => {
    const frame = root && root.querySelector('.hero-card-frame');
    if (frame) resizeFrame(frame);
  }, 80);
}

function resizeFrame(frame) {
  try {
    const doc = frame.contentDocument;
    const height = Math.max(
      doc.body.scrollHeight,
      doc.documentElement.scrollHeight,
      window.innerHeight - 120
    );
    frame.style.height = `${height}px`;
  } catch (error) {
    frame.style.height = 'calc(100vh - 120px)';
  }
}

if (!window.__POWERED_BY_QIANKUN__) {
  render();
}

export async function bootstrap() {
  console.log('[hero-card-app] bootstrap');
}

export async function mount(props) {
  console.log('[hero-card-app] mount', props);
  render(props);
}

export async function unmount() {
  window.removeEventListener('resize', scheduleResize);
  window.removeEventListener('message', handleFrameMessage);
  window.clearTimeout(resizeTimer);
  if (root) {
    root.innerHTML = '';
  }
  root = null;
}
