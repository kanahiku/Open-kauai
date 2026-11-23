/**
 * Plan with AI: for now, Build my day shows a static sample day on the same page. There is no server
 * call. The words around the result come from Sanity (rendered into the markup and data attributes);
 * this file only moves them around. Text is always set as text, never as HTML.
 */
// A module, so its names stay out of the global scope shared with the other page scripts.
import { onPageLoad } from '~/utils/page-load';
import { SAMPLE_DAY } from './plan-sample';

interface Stop {
  time: string;
  label: string;
  name: string;
  href: string;
  photo: string;
  meta: string;
  price: string;
  ownership?: 'local' | 'franchise';
  ownershipLabel: string;
  why: string;
  statusLabel: string;
  open: boolean;
  directionsUrl: string;
  distance: string;
}

interface Result {
  title: string;
  note: string;
  summary: string;
  basicNote: string;
  stops: Stop[];
}

/** Weekday key for today in Hawaiʻi, matching the values of the Day select. */
function hawaiiWeekday(): string {
  return new Intl.DateTimeFormat('en-US', { timeZone: 'Pacific/Honolulu', weekday: 'short' })
    .format(new Date())
    .slice(0, 3)
    .toLowerCase();
}

function setText(scope: ParentNode, field: string, value: string) {
  const node = scope.querySelector<HTMLElement>(`[data-f="${field}"]`);
  if (node) node.textContent = value;
  return node;
}

function setHidden(scope: ParentNode, field: string, hidden: boolean) {
  const node = scope.querySelector<HTMLElement>(`[data-f="${field}"]`);
  if (node) node.hidden = hidden;
  return node;
}

/** Only follow links that stay on this site, or go to a web address. */
function safeHref(href: string, sameSiteOnly: boolean): string {
  if (sameSiteOnly) return href.startsWith('/') && !href.startsWith('//') ? href : '#';
  return /^https:\/\//.test(href) ? href : '#';
}

function bind(root: HTMLElement) {
  const form = root.querySelector<HTMLFormElement>('[data-plan-form]');
  const message = root.querySelector<HTMLElement>('[data-plan-message]');
  const submit = root.querySelector<HTMLButtonElement>('[data-plan-submit]');
  const submitLabel = root.querySelector<HTMLElement>('[data-plan-submit-label]');
  const section = root.querySelector<HTMLElement>('[data-plan-result]');
  const template = root.querySelector<HTMLTemplateElement>('template[data-plan-stop]');
  if (!form || !submit || !submitLabel) return;
  root.dataset.ready = '1';

  function show(text: string) {
    if (!message) return;
    message.textContent = text;
    message.classList.toggle('hidden', !text);
  }

  function renderStop(stop: Stop): DocumentFragment | undefined {
    if (!template || !root) return undefined;
    const fragment = template.content.cloneNode(true) as DocumentFragment;

    setText(fragment, 'time', stop.time);
    setText(fragment, 'label', stop.label);
    setText(fragment, 'name', stop.name);
    setText(fragment, 'meta', stop.meta);
    setText(fragment, 'price', stop.price);
    setHidden(fragment, 'priceDot', !(stop.meta && stop.price));

    const photo = fragment.querySelector<HTMLImageElement>('img[data-f="photo"]');
    if (photo) photo.src = stop.photo || root.dataset.placeholder || '';

    const status = setHidden(fragment, 'status', !stop.statusLabel);
    if (status && stop.statusLabel) {
      setText(status, 'statusText', stop.statusLabel);
      const dot = status.querySelector<HTMLImageElement>('img[data-f="statusDot"]');
      if (dot) dot.src = (stop.open ? root.dataset.dotOpen : root.dataset.dotClosed) ?? '';
    }

    const owner = setHidden(fragment, 'owner', !(stop.ownership === 'local' && stop.ownershipLabel));
    if (owner) setText(owner, 'ownerText', stop.ownershipLabel);

    setHidden(fragment, 'whyBox', !stop.why);
    setText(fragment, 'why', stop.why);

    fragment.querySelector<HTMLAnchorElement>('a[data-f="view"]')?.setAttribute('href', safeHref(stop.href, true));
    fragment
      .querySelector<HTMLAnchorElement>('a[data-f="directions"]')
      ?.setAttribute('href', safeHref(stop.directionsUrl, false));

    const distance = setHidden(fragment, 'distance', !stop.distance);
    if (distance) setText(distance, 'distanceText', stop.distance);

    return fragment;
  }

  function render(result: Result) {
    if (!section) return;
    const part = (name: string) => section.querySelector<HTMLElement>(`[data-r="${name}"]`);

    const title = part('title');
    if (title) title.textContent = result.title;
    const note = part('note');
    if (note) {
      note.textContent = result.note;
      note.hidden = !result.note;
    }

    const summary = part('summary');
    if (summary) {
      summary.hidden = !result.summary;
      const text = summary.querySelector('[data-r="summaryText"]');
      if (text) text.textContent = result.summary;
    }
    const basic = part('basic');
    if (basic) {
      basic.textContent = result.basicNote;
      basic.hidden = !result.basicNote;
    }

    const list = part('list');
    if (list) {
      list.replaceChildren();
      for (const stop of result.stops) {
        const item = renderStop(stop);
        if (item) list.append(item);
      }
      list.hidden = result.stops.length === 0;
    }
    const empty = part('empty');
    if (empty) empty.hidden = result.stops.length > 0;

    section.hidden = false;
    section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    section.focus({ preventScroll: true });
  }

  // The page may be served from a short cache, so settle "today" in the browser.
  const day = form.querySelector<HTMLSelectElement>('select[name="day"]');
  if (day) {
    const today = hawaiiWeekday();
    for (const option of day.options) {
      const base = option.dataset.label ?? option.textContent ?? '';
      option.textContent =
        option.value === today && root.dataset.todaySuffix ? `${base} ${root.dataset.todaySuffix}` : base;
    }
    day.addEventListener('change', () => (day.dataset.touched = '1'));
    if (!day.dataset.touched) day.value = today;
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    show('');

    if (!form.checkValidity()) {
      show(root.dataset.invalid ?? '');
      form.reportValidity();
      return;
    }

    const dayOption = day?.selectedOptions[0];
    const dayName = dayOption?.dataset.label ?? dayOption?.textContent?.trim() ?? '';
    const regionSelect = form.querySelector<HTMLSelectElement>('select[name="region"]');
    const regionName = regionSelect?.selectedOptions[0]?.textContent?.trim() ?? '';
    const template = regionSelect?.value === 'all' ? root.dataset.titleAllTemplate : root.dataset.titleTemplate;
    const title = template
      ? template.replace('{region}', regionName).replace('{day}', dayName)
      : `Your Kauaʻi day${dayName ? `, ${dayName}` : ''}`;
    render({ ...SAMPLE_DAY, title, note: root.dataset.resultNote || SAMPLE_DAY.note, summary: '' });
  });
}

onPageLoad(() =>
  document.querySelectorAll<HTMLElement>('[data-plan]').forEach((root) => {
    if (!root.dataset.ready) bind(root);
  })
);
