/**
 * Keeps the chatbot on screen while pages switch without a reload.
 *
 * The widget's loader adds one <massic-widget> element to <body> and will not run a second time,
 * but a client-side page switch replaces the whole body, which would remove it. Before the swap the
 * element is marked as persistent and a matching placeholder goes into the incoming page, so Astro
 * carries the same element over. If that ever fails, the element is put back after the swap.
 */
import type { TransitionBeforeSwapEvent } from 'astro:transitions/client';

const WIDGET_TAG = 'massic-widget';
const PERSIST_ATTR = 'data-astro-transition-persist';
const PERSIST_NAME = 'chat-widget';

let widget: Element | null = null;

document.addEventListener('astro:before-swap', (event) => {
  widget = document.querySelector(WIDGET_TAG);
  if (!widget) return;

  widget.setAttribute(PERSIST_ATTR, PERSIST_NAME);
  const { newDocument } = event as TransitionBeforeSwapEvent;
  if (newDocument.body.querySelector(`[${PERSIST_ATTR}="${PERSIST_NAME}"]`)) return;
  const placeholder = newDocument.createElement('div');
  placeholder.setAttribute(PERSIST_ATTR, PERSIST_NAME);
  newDocument.body.append(placeholder);
});

document.addEventListener('astro:after-swap', () => {
  if (widget && !widget.isConnected) document.body.append(widget);
  // The element the page started with is the only widget there should be.
  const copies = document.querySelectorAll(WIDGET_TAG);
  if (copies.length > 1) for (const copy of copies) if (copy !== widget) copy.remove();
});
