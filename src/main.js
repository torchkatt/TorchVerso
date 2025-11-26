import './style.css'
import { SceneManager } from './world/SceneManager.js';

// Global Error Handler to show errors on screen
window.onerror = function (msg, url, line, col, error) {
  const errorBox = document.createElement('div');
  errorBox.style.position = 'fixed';
  errorBox.style.top = '0';
  errorBox.style.left = '0';
  errorBox.style.width = '100%';
  errorBox.style.backgroundColor = 'red';
  errorBox.style.color = 'white';
  errorBox.style.padding = '20px';
  errorBox.style.zIndex = '9999';
  errorBox.innerHTML = `<h3>CRITICAL ERROR</h3><p>${msg}</p><p>${url}:${line}</p>`;
  document.body.appendChild(errorBox);
  return false;
};

document.addEventListener('DOMContentLoaded', () => {
  try {
    // Confirm code load
    console.log('Torchverso starting...');

    const container = document.querySelector('#app');
    if (container) {
      const sceneManager = new SceneManager(container);
      sceneManager.start();

      // Update status to show we started
      const status = document.querySelector('.status');
      if (status) status.innerText = "SYSTEM RUNNING - V3";

    } else {
      throw new Error('Could not find #app container');
    }
  } catch (e) {
    console.error(e);
    alert('Error starting app: ' + e.message);
  }
});
