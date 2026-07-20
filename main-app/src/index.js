import { registerMicroApps, start } from 'qiankun';
import './style.css';

const status = document.querySelector('#status');
const isActive = (hashPath) => () => location.hash.startsWith(hashPath);

registerMicroApps(
  [
    {
      name: 'vueApp',
      entry: '//localhost:8081',
      container: '#subapp-container',
      activeRule: isActive('#/bbwg')
    },
    {
      name: 'react-app',
      entry: '//localhost:8082',
      container: '#subapp-container',
      activeRule: isActive('#/react')
    },
    {
      name: 'hero-card-app',
      entry: '//localhost:8084',
      container: '#subapp-container',
      activeRule: isActive('#/hero-cards')
    }
  ],
  {
    beforeLoad: [(app) => { status.textContent = `loading ${app.name}`; }],
    afterMount: [(app) => { status.textContent = `${app.name} mounted`; }],
    afterUnmount: [(app) => { status.textContent = `${app.name} unmounted`; }]
  }
);

start({
  sandbox: {
    experimentalStyleIsolation: true
  }
});

if (!location.hash) {
  location.hash = '#/bbwg';
}
