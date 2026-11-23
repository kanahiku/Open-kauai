/**
 * Filtering, sorting and paging for a section page (/activities/, /dining/, /stay/).
 * Every listing is already in the HTML; this only shows, hides and reorders them, and keeps the
 * filters in the URL (?category=, ?area=a,b, ?open=1, ?owned=1, ?sort=name).
 */

type Sort = 'open' | 'name';

interface Config {
  pageSize: number;
  countTemplate: string;
}

interface State {
  type: string;
  areas: Set<string>;
  open: boolean;
  owned: boolean;
  sort: Sort;
  shown: number;
}

export function initSectionList(root: HTMLElement): void {
  const configEl = root.querySelector('[data-section-config]');
  const grid = root.querySelector<HTMLElement>('[data-grid]');
  if (!configEl?.textContent || !grid) return;
  const config = JSON.parse(configEl.textContent) as Config;

  const items = [...grid.querySelectorAll<HTMLElement>('[data-item]')];
  const count = root.querySelector<HTMLElement>('[data-count]');
  const empty = root.querySelector<HTMLElement>('[data-empty]');
  const more = root.querySelector<HTMLElement>('[data-more]');
  const sortSelect = root.querySelector<HTMLSelectElement>('[data-sort]');
  const sortText = root.querySelector<HTMLElement>('[data-sort-text]');
  const chips = [...root.querySelectorAll<HTMLButtonElement>('[data-chip]')];
  const areaBoxes = [...root.querySelectorAll<HTMLInputElement>('input[data-area]')];
  const toggles = [...root.querySelectorAll<HTMLButtonElement>('[data-toggle]')];
  const panel = root.querySelector<HTMLElement>('[data-filters-panel]');
  const panelToggle = root.querySelector<HTMLButtonElement>('[data-filters-toggle]');

  const state: State = {
    type: '',
    areas: new Set(),
    open: false,
    owned: false,
    sort: 'open',
    shown: config.pageSize,
  };

  // ---------- read the URL ----------
  const params = new URLSearchParams(window.location.search);
  const knownTypes = new Set(chips.map((chip) => chip.dataset.chip ?? ''));
  const knownAreas = new Set(areaBoxes.map((box) => box.value));
  const type = params.get('category') ?? '';
  if (knownTypes.has(type)) state.type = type;
  for (const area of (params.get('area') ?? '').split(',')) if (knownAreas.has(area)) state.areas.add(area);
  state.open = params.get('open') === '1' && toggles.some((t) => t.dataset.toggle === 'open');
  state.owned = params.get('owned') === '1' && toggles.some((t) => t.dataset.toggle === 'owned');
  if (params.get('sort') === 'name' && sortSelect) state.sort = 'name';

  // ---------- helpers ----------
  const rank = (item: HTMLElement) => Number(item.dataset[state.sort === 'name' ? 'rankName' : 'rankOpen']);

  function matches(item: HTMLElement): boolean {
    if (state.type && item.dataset.type !== state.type) return false;
    if (state.areas.size > 0 && !state.areas.has(item.dataset.area ?? '')) return false;
    if (state.open && !item.dataset.open) return false;
    if (state.owned && !item.dataset.owned) return false;
    return true;
  }

  function syncUrl() {
    const next = new URLSearchParams();
    if (state.type) next.set('category', state.type);
    if (state.areas.size) next.set('area', [...state.areas].join(','));
    if (state.open) next.set('open', '1');
    if (state.owned) next.set('owned', '1');
    if (state.sort !== 'open') next.set('sort', state.sort);
    const query = next.toString();
    window.history.replaceState(null, '', `${window.location.pathname}${query ? `?${query}` : ''}`);
  }

  function syncControls() {
    for (const chip of chips) chip.setAttribute('aria-pressed', String((chip.dataset.chip ?? '') === state.type));
    for (const box of areaBoxes) box.checked = state.areas.has(box.value);
    for (const toggle of toggles)
      toggle.setAttribute('aria-checked', String(toggle.dataset.toggle === 'open' ? state.open : state.owned));
    if (sortSelect) {
      sortSelect.value = state.sort;
      const option = sortSelect.selectedOptions[0];
      if (sortText && option)
        sortText.textContent = [sortSelect.dataset.prefix, option.dataset.text ?? option.textContent]
          .filter(Boolean)
          .join(' ');
    }
  }

  // ---------- render ----------
  function render() {
    const ordered = [...items].sort((a, b) => rank(a) - rank(b));
    const visible = ordered.filter(matches);
    const visibleSet = new Set(visible);

    for (const item of ordered) grid!.append(item);
    visible.forEach((item, index) => {
      item.hidden = index >= state.shown;
    });
    for (const item of ordered) if (!visibleSet.has(item)) item.hidden = true;

    if (count && config.countTemplate)
      count.textContent = config.countTemplate.replace('{count}', String(visible.length));
    if (empty) empty.hidden = visible.length > 0;
    if (more) more.hidden = visible.length <= state.shown;

    syncControls();
    syncUrl();
  }

  function resetPaging() {
    state.shown = config.pageSize;
  }

  // ---------- events ----------
  for (const chip of chips) {
    chip.addEventListener('click', () => {
      state.type = chip.dataset.chip ?? '';
      resetPaging();
      render();
    });
  }

  for (const box of areaBoxes) {
    box.addEventListener('change', () => {
      if (box.checked) state.areas.add(box.value);
      else state.areas.delete(box.value);
      resetPaging();
      render();
    });
  }

  for (const toggle of toggles) {
    toggle.addEventListener('click', () => {
      if (toggle.dataset.toggle === 'open') state.open = !state.open;
      else state.owned = !state.owned;
      resetPaging();
      render();
    });
  }

  sortSelect?.addEventListener('change', () => {
    state.sort = sortSelect.value === 'name' ? 'name' : 'open';
    resetPaging();
    render();
  });

  root.querySelectorAll<HTMLElement>('[data-clear]').forEach((button) =>
    button.addEventListener('click', () => {
      state.areas.clear();
      state.open = false;
      state.owned = false;
      resetPaging();
      render();
    })
  );

  more?.addEventListener('click', () => {
    state.shown += config.pageSize;
    render();
  });

  panelToggle?.addEventListener('click', () => {
    const open = panel?.dataset.open !== 'true';
    if (panel) panel.dataset.open = String(open);
    panelToggle.setAttribute('aria-expanded', String(open));
  });

  render();
}
