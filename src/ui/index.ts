import { createApp } from 'vue';
import App from './App.vue';
import { initBridge } from './bridge';
import { initDiag } from './diag';
import { initShortcuts } from './shortcuts';

/** Mount the Vue panels and connect them to the engine. Call once, before the first scene opens. */
export function initUI() {
  initBridge();
  initShortcuts();
  initDiag();
  createApp(App).mount('#app');
}
