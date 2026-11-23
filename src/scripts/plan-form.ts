/**
 * Plan with AI: sends the form to /api/plan/ and shows the day on the same page. All words on the
 * page come from Sanity (the server rendered them into the markup and data attributes); this file only
 * moves them around. Text from the server is always set as text, never as HTML.
 */
// A module, so its names stay out of the global scope shared with the other page scripts.
import { onPageLoad } from '~/utils/page-load';

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

  const idleLabel = submitLabel.textContent ?? '';

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

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    show('');

    if (!form.checkValidity()) {
      show(root.dataset.invalid ?? '');
      form.reportValidity();
      return;
    }

    const data = new FormData(form);
    const body = {
      region: data.get('region'),
      day: data.get('day'),
      time: data.get('time'),
      budget: data.get('budget'),
      interests: data.getAll('interests'),
      note: data.get('note'),
    };

    submit.disabled = true;
    form.setAttribute('aria-busy', 'true');
    if (root.dataset.building) submitLabel.textContent = root.dataset.building;

    try {
      const response = await fetch('/api/plan/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (response.status === 400) {
        show(root.dataset.invalid ?? '');
      } else if (response.status === 429) {
        show(root.dataset.limit || root.dataset.error || '');
      } else if (!response.ok) {
        show(root.dataset.error ?? '');
      } else {
        const payload = (await response.json()) as { ok: boolean; result?: Result };
        if (payload.ok && payload.result) render(payload.result);
        else show(root.dataset.error ?? '');
      }
    } catch {
      show(root.dataset.error ?? '');
    }

    submit.disabled = false;
    form.setAttribute('aria-busy', 'false');
    submitLabel.textContent = idleLabel;
  });
}

onPageLoad(() =>
  document.querySelectorAll<HTMLElement>('[data-plan]').forEach((root) => {
    if (!root.dataset.ready) bind(root);
  })
);
