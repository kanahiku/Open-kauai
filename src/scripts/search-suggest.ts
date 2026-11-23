import { onPageLoad } from '~/utils/page-load';

/**
 * Suggestions under any search box marked `data-search-suggest`: places and businesses as you type,
 * from /api/search.json. Arrow keys move through the list, Enter opens the highlighted row or
 * submits the form, Escape closes. Without JavaScript the form still submits to /search/.
 */
interface Item {
  label: string;
  line: string;
  href: string;
  icon?: string;
}
interface Group {
  title: string;
  icon?: string;
  items: Item[];
}
interface Payload {
  query: string;
  groups: Group[];
  all: { label: string; href: string };
}

const DELAY_MS = 150;
let counter = 0;

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className: string, text?: string) {
  const node = document.createElement(tag);
  node.className = className;
  if (text) node.textContent = text;
  return node;
}

function attach(form: HTMLFormElement) {
  if (form.dataset.suggest) return;
  form.dataset.suggest = '1';
  const input = form.querySelector<HTMLInputElement>('input[name="q"]');
  if (!input) return;

  const id = `search-suggest-${++counter}`;
  const panel = el(
    'div',
    'absolute inset-x-0 top-[calc(100%+8px)] z-50 hidden max-h-[70vh] overflow-y-auto rounded-2xl bg-white p-3 text-left text-ink shadow-popover'
  );
  panel.id = id;
  panel.setAttribute('role', 'listbox');
  form.append(panel);

  input.setAttribute('role', 'combobox');
  input.setAttribute('aria-expanded', 'false');
  input.setAttribute('aria-controls', id);
  input.setAttribute('aria-autocomplete', 'list');

  let rows: HTMLAnchorElement[] = [];
  let active = -1;
  let timer: number | undefined;
  let controller: AbortController | undefined;

  const close = () => {
    panel.classList.add('hidden');
    input.setAttribute('aria-expanded', 'false');
    input.removeAttribute('aria-activedescendant');
    active = -1;
  };

  const highlight = (next: number) => {
    rows[active]?.setAttribute('aria-selected', 'false');
    rows[active]?.classList.remove('bg-tint');
    active = next;
    const row = rows[active];
    if (!row) {
      input.removeAttribute('aria-activedescendant');
      return;
    }
    row.setAttribute('aria-selected', 'true');
    row.classList.add('bg-tint');
    input.setAttribute('aria-activedescendant', row.id);
    row.scrollIntoView({ block: 'nearest' });
  };

  const row = (item: Item, icon: string | undefined, index: number) => {
    const link = el('a', 'flex items-center gap-3 rounded-xl px-3 py-2 hover:bg-tint');
    link.href = item.href;
    link.id = `${id}-row-${index}`;
    link.setAttribute('role', 'option');
    link.setAttribute('aria-selected', 'false');
    if (icon) {
      const img = el('img', 'size-5 shrink-0');
      img.src = icon;
      img.alt = '';
      link.append(img);
    }
    const text = el('span', 'flex min-w-0 flex-col');
    text.append(el('span', 'truncate font-serif text-[17px] leading-6', item.label));
    if (item.line) text.append(el('span', 'truncate font-sans text-xs leading-4 text-muted', item.line));
    link.append(text);
    return link;
  };

  const render = (payload: Payload) => {
    panel.replaceChildren();
    rows = [];
    for (const group of payload.groups) {
      if (group.title) {
        panel.append(
          el('p', 'px-3 pt-2 pb-1 font-display text-[13px] leading-4 tracking-[1.6px] text-teal uppercase', group.title)
        );
      }
      for (const item of group.items) {
        const link = row(item, item.icon ?? group.icon, rows.length);
        rows.push(link);
        panel.append(link);
      }
    }
    if (payload.all.label && payload.all.href && rows.length > 0) {
      const link = row({ label: payload.all.label, line: '', href: payload.all.href }, undefined, rows.length);
      link.classList.add('mt-1', 'border-t', 'border-line', 'rounded-t-none');
      rows.push(link);
      panel.append(link);
    }
    active = -1;
    const open = rows.length > 0;
    panel.classList.toggle('hidden', !open);
    input.setAttribute('aria-expanded', String(open));
  };

  const request = async () => {
    const q = input.value.trim();
    if (q.length < 2) {
      close();
      return;
    }
    controller?.abort();
    controller = new AbortController();
    try {
      const response = await fetch(`/api/search.json?q=${encodeURIComponent(q)}`, { signal: controller.signal });
      if (!response.ok) return close();
      const payload = (await response.json()) as Payload;
      if (input.value.trim() === q) render(payload);
    } catch {
      // Aborted or offline: leave the form to submit normally.
    }
  };

  input.addEventListener('input', () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(request, DELAY_MS);
  });
  input.addEventListener('focus', () => {
    if (rows.length > 0 && input.value.trim().length >= 2) {
      panel.classList.remove('hidden');
      input.setAttribute('aria-expanded', 'true');
    }
  });
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') return close();
    if (panel.classList.contains('hidden') || rows.length === 0) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      highlight(active + 1 >= rows.length ? 0 : active + 1);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      highlight(active - 1 < 0 ? rows.length - 1 : active - 1);
    } else if (event.key === 'Enter' && rows[active]) {
      event.preventDefault();
      rows[active].click();
    }
  });
  document.addEventListener('click', (event) => {
    if (!form.contains(event.target as Node)) close();
  });
  form.addEventListener('submit', close);
}

onPageLoad(() => document.querySelectorAll<HTMLFormElement>('form[data-search-suggest]').forEach(attach));
