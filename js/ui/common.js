// Utilidades de UI compartidas: toasts, modal genérico y helpers de construcción de DOM.

import { escapeHtml } from '../utils.js';

let toastContainer = null;
let modalRoot = null;

export function mountCommonUI() {
  toastContainer = document.getElementById('toast-container');
  modalRoot = document.getElementById('modal-root');
}

export function showToast(message, type = 'info', duration = 3200) {
  if (!toastContainer) return;
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.setAttribute('role', 'status');
  el.textContent = message;
  toastContainer.appendChild(el);
  requestAnimationFrame(() => el.classList.add('show'));
  setTimeout(() => {
    el.classList.remove('show');
    setTimeout(() => el.remove(), 250);
  }, duration);
}

export function openModal(innerHtml, { onMount } = {}) {
  if (!modalRoot) return;
  modalRoot.innerHTML = `
    <div class="modal-backdrop" data-close-modal>
      <div class="modal-card" role="dialog" aria-modal="true">${innerHtml}</div>
    </div>`;
  modalRoot.hidden = false;
  modalRoot.querySelector('[data-close-modal]').addEventListener('click', (e) => {
    if (e.target.hasAttribute('data-close-modal')) closeModal();
  });
  modalRoot.querySelectorAll('[data-dismiss]').forEach((btn) => btn.addEventListener('click', closeModal));
  if (onMount) onMount(modalRoot);
}

export function closeModal() {
  if (!modalRoot) return;
  modalRoot.hidden = true;
  modalRoot.innerHTML = '';
}

export function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  Object.entries(attrs).forEach(([key, value]) => {
    if (key === 'class') node.className = value;
    else if (key.startsWith('on') && typeof value === 'function') node.addEventListener(key.slice(2).toLowerCase(), value);
    else if (value !== null && value !== undefined) node.setAttribute(key, value);
  });
  (Array.isArray(children) ? children : [children]).forEach((child) => {
    if (child === null || child === undefined) return;
    node.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
  });
  return node;
}

export function safe(str) {
  return escapeHtml(str);
}

export function confirmAction(message) {
  return window.confirm(message);
}
