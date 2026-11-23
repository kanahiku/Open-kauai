/**
 * Interactive part of the map page. The server (MapView.astro) renders the toolbar, menus and
 * region labels and embeds every place as JSON. This script draws the pins, results list and
 * mobile cards, and handles filters, panning, zooming and selection.
 *
 * Text is always set with `textContent`, never `innerHTML`, so scraped names cannot inject markup.
 */
import type { FilterOption, MapItem } from '~/lib/map-page';

type FilterKey = 'type' | 'area' | 'price';
type ToggleKey = 'open' | 'owned';
type Kind = 'row' | 'popover' | 'card';

interface Config {
  items: MapItem[];
  frame: { width: number; height: number };
  filters: Partial<Record<FilterKey, FilterOption[]>>;
  copy: {
    resultsTemplate: string;
    knownForPrefix: string;
    listButtonLabel: string;
    mapButtonLabel: string;
    locallyOwnedLabel: string;
    localFranchiseLabel: string;
  };
  assets: {
    dotOpen: string;
    dotClosed: string;
    pinOpen: string;
    pinClosed: string;
    pinSelected: string;
    listIcon: string;
    mapIcon: string;
  };
  placeholders: Record<Kind, string>;
}

const DRAG_THRESHOLD = 4;
const MAX_ZOOM = 10;
const ZOOM_STEP = 1.5;
const CAROUSEL_LIMIT = 60;
const PHOTO_SIZE: Record<Kind, [number, number]> = { row: [296, 256], popover: [552, 240], card: [600, 240] };

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

function sized(url: string, width: number, height: number): string {
  try {
    const parsed = new URL(url);
    parsed.searchParams.set('w', String(width));
    parsed.searchParams.set('h', String(height));
    parsed.searchParams.set('fit', 'crop');
    return parsed.toString();
  } catch {
    return url;
  }
}

export function initMapExplorer(root: HTMLElement): void {
  const configEl = root.querySelector<HTMLScriptElement>('[data-map-config]');
  if (!configEl?.textContent) return;
  const cfg = JSON.parse(configEl.textContent) as Config;

  const find = <T extends HTMLElement>(selector: string) => root.querySelector<T>(selector);
  const viewport = find<HTMLElement>('[data-viewport]');
  const layer = find<HTMLElement>('[data-layer]');
  const pinsHost = find<HTMLElement>('[data-pins]');
  const list = find<HTMLElement>('[data-list]');
  const listPanel = find<HTMLElement>('[data-list-panel]');
  const resultsLabel = find<HTMLElement>('[data-results-label]');
  const empty = find<HTMLElement>('[data-empty]');
  const popover = find<HTMLElement>('[data-popover]');
  const carousel = find<HTMLElement>('[data-carousel]');
  const viewToggle = find<HTMLElement>('[data-view-toggle]');
  const templates = {
    row: root.querySelector<HTMLTemplateElement>('template[data-template="row"]'),
    card: root.querySelector<HTMLTemplateElement>('template[data-template="card"]'),
    pin: root.querySelector<HTMLTemplateElement>('template[data-template="pin"]'),
  };
  if (
    !viewport ||
    !layer ||
    !pinsHost ||
    !list ||
    !listPanel ||
    !resultsLabel ||
    !empty ||
    !popover ||
    !carousel ||
    !templates.row ||
    !templates.card ||
    !templates.pin
  ) {
    return;
  }

  const { items, frame, copy, assets, placeholders } = cfg;
  const byId = new Map(items.map((item) => [item.id, item]));

  const state = {
    open: false,
    owned: false,
    type: '',
    area: '',
    price: '',
    selected: '',
    view: 'map' as 'map' | 'list',
  };
  const view = { s: 1, tx: 0, ty: 0, fit: 1, moved: false };

  // ---------- filtering ----------
  const matches = (item: MapItem) =>
    (!state.open || item.open) &&
    (!state.owned || item.ownership === 'local') &&
    (!state.type || item.c === state.type) &&
    (!state.area || item.a === state.area) &&
    (!state.price || item.p === state.price);

  const results = () =>
    items.filter(matches).sort((a, b) => Number(b.open) - Number(a.open) || a.name.localeCompare(b.name));

  // ---------- map transform ----------
  const dock = viewToggle?.parentElement ?? null;

  /** On small screens the card row covers the bottom of the map. Keep the island above it. */
  function reservedBottom(): number {
    if (!dock || state.view !== 'map' || dock.offsetParent === null) return 0;
    return dock.offsetHeight + 8;
  }

  function clampTranslate() {
    if (!viewport) return;
    const vw = viewport.clientWidth;
    const vh = viewport.clientHeight;
    const areaHeight = vh - reservedBottom();
    const sw = frame.width * view.s;
    const sh = frame.height * view.s;
    view.tx = sw <= vw ? (vw - sw) / 2 : clamp(view.tx, vw - sw, 0);
    view.ty = sh <= areaHeight ? (areaHeight - sh) / 2 : clamp(view.ty, vh - sh, 0);
  }

  function apply() {
    if (!layer) return;
    layer.style.transform = `translate(${view.tx}px, ${view.ty}px) scale(${view.s})`;
    layer.style.setProperty('--s', String(view.s));
    updatePopover();
  }

  function fitToViewport(reset: boolean) {
    if (!viewport) return;
    const vw = viewport.clientWidth;
    const vh = viewport.clientHeight;
    if (!vw || !vh) return;
    const areaHeight = vh - reservedBottom();
    view.fit = Math.min(vw / frame.width, areaHeight / frame.height);
    if (reset || !view.moved) {
      view.s = view.fit;
      view.tx = (vw - frame.width * view.fit) / 2;
      view.ty = (areaHeight - frame.height * view.fit) / 2;
    } else {
      view.s = clamp(view.s, view.fit, view.fit * MAX_ZOOM);
    }
    clampTranslate();
    apply();
  }

  function zoomAt(factor: number, cx: number, cy: number) {
    const next = clamp(view.s * factor, view.fit, view.fit * MAX_ZOOM);
    if (next === view.s) return;
    view.tx = cx - (cx - view.tx) * (next / view.s);
    view.ty = cy - (cy - view.ty) * (next / view.s);
    view.s = next;
    view.moved = true;
    clampTranslate();
    apply();
  }

  /** Pan so the item is on screen, a little below centre so its popover has room above. */
  function ensureVisible(item: MapItem) {
    if (!viewport) return;
    const vw = viewport.clientWidth;
    const vh = viewport.clientHeight;
    const px = view.tx + item.x * view.s;
    const py = view.ty + item.y * view.s;
    const margin = 56;
    if (px >= margin && px <= vw - margin && py >= margin && py <= vh - margin) return;
    view.tx += vw / 2 - px;
    view.ty += vh * 0.62 - py;
    view.moved = true;
    clampTranslate();
    apply();
  }

  // ---------- photos and content ----------
  function photoFor(item: MapItem, kind: Kind): string {
    if (!item.photo) return placeholders[kind];
    const [w, h] = PHOTO_SIZE[kind];
    return sized(item.photo, w, h);
  }

  function setText(node: ParentNode, slot: string, text: string) {
    const el = node.querySelector<HTMLElement>(`[data-slot="${slot}"]`);
    if (el) el.textContent = text;
  }

  function fillCommon(node: ParentNode, item: MapItem, kind: Kind) {
    const photo = node.querySelector<HTMLImageElement>('[data-slot="photo"]');
    if (photo) photo.src = photoFor(item, kind);
    setText(node, 'name', item.name);
    setText(node, 'meta', item.meta);
    setText(node, 'status', item.status);
    // The status pill is the slot's parent; hide it when there is no status (places to stay).
    const statusPill = node.querySelector<HTMLElement>('[data-slot="status"]')?.parentElement;
    if (statusPill) statusPill.hidden = !item.status;
    const dot = node.querySelector<HTMLImageElement>('[data-slot="dot"]');
    if (dot) dot.src = item.open ? assets.dotOpen : assets.dotClosed;

    const owner = node.querySelector<HTMLElement>('[data-slot="owner"]');
    if (owner) {
      const label =
        item.ownership === 'local'
          ? copy.locallyOwnedLabel
          : item.ownership === 'franchise'
            ? copy.localFranchiseLabel
            : '';
      owner.hidden = !label;
      setText(owner, 'owner-text', label);
      const icon = owner.querySelector<HTMLElement>('[data-slot="owner-icon"]');
      if (icon) icon.hidden = item.ownership !== 'local';
    }
  }

  function buildRow(item: MapItem): HTMLElement {
    const node = templates.row!.content.firstElementChild!.cloneNode(true) as HTMLElement;
    fillCommon(node, item, 'row');
    const known = node.querySelector<HTMLElement>('[data-slot="known"]');
    if (known) {
      known.hidden = !item.knownFor;
      setText(known, 'known-text', item.knownFor);
    }
    const button = node.querySelector<HTMLElement>('[data-row]');
    if (button) button.dataset.id = item.id;
    return node;
  }

  function buildCard(item: MapItem): HTMLElement {
    const node = templates.card!.content.firstElementChild!.cloneNode(true) as HTMLElement;
    fillCommon(node, item, 'card');
    const known = node.querySelector<HTMLElement>('[data-slot="known-text"]');
    if (known) {
      const text = item.knownFor ? [copy.knownForPrefix, item.knownFor].filter(Boolean).join(' ') : '';
      known.hidden = !text;
      known.textContent = text;
    }
    const button = node.querySelector<HTMLElement>('[data-card]');
    if (button) button.dataset.id = item.id;
    return node;
  }

  // ---------- pins ----------
  const pins = new Map<string, HTMLButtonElement>();

  function stylePin(button: HTMLButtonElement, item: MapItem, selected: boolean) {
    const img = button.firstElementChild as HTMLImageElement;
    // The SVGs carry their own shadow, so the circle is not centred: these are its centres.
    const [src, size, cx, cy] = selected
      ? [assets.pinSelected, 42, 21, 19]
      : [item.open ? assets.pinOpen : assets.pinClosed, 28, 14, 12];
    img.src = src as string;
    img.width = size as number;
    img.height = size as number;
    img.style.left = `${-(cx as number)}px`;
    img.style.top = `${-(cy as number)}px`;
    img.style.transformOrigin = `${cx}px ${cy}px`;
    button.style.zIndex = selected ? '3' : item.open ? '2' : '1';
    button.setAttribute('aria-pressed', String(selected));
  }

  for (const item of items) {
    const button = templates.pin.content.firstElementChild!.cloneNode(true) as HTMLButtonElement;
    button.dataset.id = item.id;
    button.style.left = `${item.x}px`;
    button.style.top = `${item.y}px`;
    button.setAttribute('aria-label', item.name);
    stylePin(button, item, false);
    pinsHost.appendChild(button);
    pins.set(item.id, button);
  }

  // ---------- popover ----------
  function updatePopover() {
    if (!popover || !viewport) return;
    const item = byId.get(state.selected);
    if (!item || !matches(item)) {
      popover.hidden = true;
      return;
    }
    if (popover.dataset.id !== item.id) {
      fillCommon(popover, item, 'popover');
      const link = popover.querySelector<HTMLAnchorElement>('[data-slot="link"]');
      if (link) link.href = item.href;
      popover.dataset.id = item.id;
    }
    popover.hidden = false;
    const w = popover.offsetWidth;
    const h = popover.offsetHeight;
    if (!w) return; // hidden by CSS on small screens
    const vw = viewport.clientWidth;
    const vh = viewport.clientHeight;
    const px = view.tx + item.x * view.s;
    const py = view.ty + item.y * view.s;
    popover.style.visibility = px < 0 || px > vw || py < 0 || py > vh ? 'hidden' : 'visible';
    let top = py - 26 - h;
    if (top < 8) top = py + 26;
    if (top + h > vh - 8) top = Math.max(8, vh - h - 8);
    const left = clamp(px - w / 2, 8, Math.max(8, vw - w - 8));
    popover.style.transform = `translate(${left}px, ${top}px)`;
  }

  // ---------- selection ----------
  let programmaticScroll = false;

  function syncSelectionUI(scroll: boolean) {
    root.querySelectorAll<HTMLElement>('[data-row], [data-card]').forEach((el) => {
      el.setAttribute('aria-pressed', String(el.dataset.id === state.selected));
    });
    if (scroll && state.selected) {
      list
        ?.querySelector<HTMLElement>(`[data-row][data-id="${CSS.escape(state.selected)}"]`)
        ?.scrollIntoView({ block: 'nearest' });
      const card = carousel?.querySelector<HTMLElement>(`[data-card][data-id="${CSS.escape(state.selected)}"]`);
      if (card?.parentElement && carousel && carousel.offsetParent !== null) {
        programmaticScroll = true;
        carousel.scrollTo({ left: card.parentElement.offsetLeft - 16, behavior: 'smooth' });
        window.setTimeout(() => (programmaticScroll = false), 600);
      }
    }
  }

  function select(id: string, options: { pan?: boolean; scroll?: boolean } = {}) {
    const previous = state.selected;
    state.selected = id;
    const previousPin = pins.get(previous);
    const previousItem = byId.get(previous);
    if (previousPin && previousItem) stylePin(previousPin, previousItem, false);
    const pin = pins.get(id);
    const item = byId.get(id);
    if (pin && item) stylePin(pin, item, true);
    syncSelectionUI(Boolean(options.scroll));
    if (options.pan && item) ensureVisible(item);
    updatePopover();
  }

  // ---------- rendering ----------
  function render() {
    for (const item of items) {
      const pin = pins.get(item.id);
      if (pin) pin.hidden = !matches(item);
    }

    const found = results();
    const rows = document.createDocumentFragment();
    for (const item of found) rows.append(buildRow(item));
    list!.replaceChildren(rows);

    const cards = document.createDocumentFragment();
    for (const item of found.slice(0, CAROUSEL_LIMIT)) cards.append(buildCard(item));
    carousel!.replaceChildren(cards);

    list!.hidden = found.length === 0;
    empty!.hidden = found.length > 0;
    resultsLabel!.textContent = copy.resultsTemplate.replace('{count}', String(found.length));

    const current = byId.get(state.selected);
    if (!current || !matches(current)) {
      select(found[0]?.id ?? '', {});
    } else {
      syncSelectionUI(false);
      updatePopover();
    }
  }

  // ---------- filters ----------
  const menus = Array.from(root.querySelectorAll<HTMLElement>('[data-filter]'));

  function closeMenus() {
    for (const menu of menus) {
      menu.querySelector<HTMLElement>('[data-filter-menu]')!.hidden = true;
      menu.querySelector<HTMLElement>('[data-filter-button]')!.setAttribute('aria-expanded', 'false');
    }
  }

  function setFilter(key: FilterKey, id: string) {
    state[key] = id;
    const group = root.querySelector<HTMLElement>(`[data-filter="${key}"]`);
    if (!group) return;
    const option = cfg.filters[key]?.find((candidate) => candidate.id === id);
    const button = group.querySelector<HTMLElement>('[data-filter-button]')!;
    const label = group.querySelector<HTMLElement>('[data-filter-label]')!;
    label.textContent = option?.label ?? button.dataset.defaultLabel ?? '';
    button.dataset.active = String(Boolean(id));
    group.querySelectorAll<HTMLElement>('[role="option"]').forEach((el) => {
      el.setAttribute('aria-selected', String((el.dataset.value ?? '') === id));
    });
  }

  function setToggle(key: ToggleKey, on: boolean) {
    state[key] = on;
    const button = root.querySelector<HTMLElement>(`[data-toggle="${key}"]`);
    if (!button) return;
    button.setAttribute('aria-pressed', String(on));
    button.dataset.active = String(on);
  }

  root.querySelectorAll<HTMLElement>('[data-toggle]').forEach((button) => {
    button.addEventListener('click', () => {
      const key = button.dataset.toggle as ToggleKey;
      setToggle(key, !state[key]);
      render();
    });
  });

  for (const group of menus) {
    const key = group.dataset.filter as FilterKey;
    const button = group.querySelector<HTMLElement>('[data-filter-button]')!;
    const menu = group.querySelector<HTMLElement>('[data-filter-menu]')!;

    button.addEventListener('click', (event) => {
      event.stopPropagation();
      const willOpen = menu.hidden;
      closeMenus();
      if (!willOpen) return;
      menu.hidden = false;
      const rect = button.getBoundingClientRect();
      menu.style.top = `${rect.bottom + 8}px`;
      menu.style.left = `${clamp(rect.left, 8, Math.max(8, window.innerWidth - menu.offsetWidth - 8))}px`;
      button.setAttribute('aria-expanded', 'true');
    });

    menu.addEventListener('click', (event) => {
      const option = (event.target as Element).closest<HTMLElement>('[role="option"]');
      if (!option) return;
      setFilter(key, option.dataset.value ?? '');
      closeMenus();
      render();
    });
  }

  document.addEventListener('click', (event) => {
    if (!(event.target as Element).closest('[data-filter]')) closeMenus();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeMenus();
  });
  window.addEventListener('resize', closeMenus);
  root.querySelector('[data-filters]')?.addEventListener('scroll', closeMenus, { passive: true });

  // ---------- list, pins and cards: selecting ----------
  const isSmall = () => window.matchMedia('(max-width: 1023px)').matches;

  list.addEventListener('click', (event) => {
    const row = (event.target as Element).closest<HTMLElement>('[data-row]');
    if (!row?.dataset.id) return;
    if (isSmall() && state.view === 'list') {
      state.view = 'map';
      applyView();
    }
    select(row.dataset.id, { pan: true });
  });

  carousel.addEventListener('click', (event) => {
    const card = (event.target as Element).closest<HTMLElement>('[data-card]');
    if (!card?.dataset.id) return;
    // A second tap on the selected card opens the business.
    const item = byId.get(card.dataset.id);
    if (item && state.selected === item.id) window.location.href = item.href;
    else select(card.dataset.id, { pan: true });
  });

  let scrollTimer = 0;
  carousel.addEventListener(
    'scroll',
    () => {
      if (programmaticScroll) return;
      window.clearTimeout(scrollTimer);
      scrollTimer = window.setTimeout(() => {
        const cards = Array.from(carousel.querySelectorAll<HTMLElement>('[data-card]'));
        let best: HTMLElement | undefined;
        let bestDistance = Infinity;
        for (const card of cards) {
          const distance = Math.abs((card.parentElement?.offsetLeft ?? 0) - 16 - carousel.scrollLeft);
          if (distance < bestDistance) {
            bestDistance = distance;
            best = card;
          }
        }
        if (best?.dataset.id && best.dataset.id !== state.selected) select(best.dataset.id, { pan: true });
      }, 140);
    },
    { passive: true }
  );

  pinsHost.addEventListener('click', (event) => {
    const pin = (event.target as Element).closest<HTMLElement>('[data-pin]');
    if (pin?.dataset.id) select(pin.dataset.id, { scroll: true });
  });

  // ---------- pan, pinch and wheel ----------
  const pointers = new Map<number, { x: number; y: number }>();
  let drag: { x: number; y: number; tx: number; ty: number; active: boolean } | null = null;
  let pinchDistance = 0;
  let suppressClick = false;

  const localPoint = (x: number, y: number) => {
    const rect = viewport.getBoundingClientRect();
    return { x: x - rect.left, y: y - rect.top };
  };

  viewport.addEventListener('pointerdown', (event) => {
    if ((event.target as Element).closest('[data-popover], [data-zoom]')) return;
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.size === 1) {
      drag = { x: event.clientX, y: event.clientY, tx: view.tx, ty: view.ty, active: false };
    } else if (pointers.size === 2) {
      const [a, b] = Array.from(pointers.values());
      pinchDistance = Math.hypot(a.x - b.x, a.y - b.y);
      drag = null;
    }
  });

  viewport.addEventListener('pointermove', (event) => {
    if (!pointers.has(event.pointerId)) return;
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (pointers.size === 2 && pinchDistance > 0) {
      const [a, b] = Array.from(pointers.values());
      const distance = Math.hypot(a.x - b.x, a.y - b.y);
      const centre = localPoint((a.x + b.x) / 2, (a.y + b.y) / 2);
      zoomAt(distance / pinchDistance, centre.x, centre.y);
      pinchDistance = distance;
      suppressClick = true;
      return;
    }

    if (!drag) return;
    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;
    if (!drag.active && Math.hypot(dx, dy) > DRAG_THRESHOLD) {
      drag.active = true;
      viewport.setPointerCapture(event.pointerId);
    }
    if (drag.active) {
      view.tx = drag.tx + dx;
      view.ty = drag.ty + dy;
      view.moved = true;
      clampTranslate();
      apply();
    }
  });

  const endPointer = (event: PointerEvent) => {
    if (!pointers.delete(event.pointerId)) return;
    if (drag?.active) suppressClick = true;
    if (pointers.size < 2) pinchDistance = 0;
    if (pointers.size === 0) drag = null;
    window.setTimeout(() => (suppressClick = false), 60);
  };
  viewport.addEventListener('pointerup', endPointer);
  viewport.addEventListener('pointercancel', endPointer);

  viewport.addEventListener(
    'click',
    (event) => {
      if (!suppressClick) return;
      event.stopPropagation();
      event.preventDefault();
      suppressClick = false;
    },
    true
  );

  viewport.addEventListener(
    'wheel',
    (event) => {
      event.preventDefault();
      const point = localPoint(event.clientX, event.clientY);
      zoomAt(Math.exp(-event.deltaY * 0.002), point.x, point.y);
    },
    { passive: false }
  );

  root.querySelectorAll<HTMLElement>('[data-zoom]').forEach((button) => {
    button.addEventListener('click', () => {
      const factor = button.dataset.zoom === 'in' ? ZOOM_STEP : 1 / ZOOM_STEP;
      zoomAt(factor, viewport.clientWidth / 2, viewport.clientHeight / 2);
    });
  });

  // ---------- small-screen List / Map switch ----------
  function applyView() {
    const showList = state.view === 'list';
    listPanel!.classList.toggle('max-lg:hidden', !showList);
    carousel!.hidden = showList;
    const label = viewToggle?.querySelector<HTMLElement>('[data-view-label]');
    const icon = viewToggle?.querySelector<HTMLImageElement>('[data-view-icon]');
    if (label) label.textContent = showList ? copy.mapButtonLabel : copy.listButtonLabel;
    if (icon) icon.src = showList ? assets.mapIcon : assets.listIcon;
    if (!showList) window.requestAnimationFrame(() => fitToViewport(false));
  }

  viewToggle?.addEventListener('click', () => {
    state.view = state.view === 'map' ? 'list' : 'map';
    applyView();
  });

  // ---------- start ----------
  const resizeObserver = new ResizeObserver(() => fitToViewport(false));
  resizeObserver.observe(viewport);
  if (dock) resizeObserver.observe(dock);

  const params = new URLSearchParams(window.location.search);
  if (params.get('open') === '1') setToggle('open', true);
  const categorySlug = params.get('category');
  if (categorySlug) {
    const option = cfg.filters.type?.find((candidate) => candidate.slug === categorySlug);
    if (option) setFilter('type', option.id);
  }
  const areaSlug = params.get('area');
  if (areaSlug) {
    const option = cfg.filters.area?.find((candidate) => candidate.slug === areaSlug);
    if (option) setFilter('area', option.id);
  }

  render();
  applyView();
  fitToViewport(true);
}
