import { mount } from "svelte";
import App from "./App.svelte";
import "./index.css";

const app = mount(App, {
  target: document.getElementById("app"),
});

export default app;

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(err => console.warn('SW registration failed', err));
  });
}
