/**
 * Sends the claim form to /api/claims without leaving the page. Messages come from data attributes
 * the server rendered from Sanity, so nothing is written here.
 */
const root = document.querySelector<HTMLElement>('[data-claim]');
const form = root?.querySelector<HTMLFormElement>('[data-claim-form]');
const done = root?.querySelector<HTMLElement>('[data-claim-done]');
const message = root?.querySelector<HTMLElement>('[data-claim-message]');
const submit = root?.querySelector<HTMLButtonElement>('[data-claim-submit]');

function show(text: string) {
  if (!message) return;
  message.textContent = text;
  message.classList.toggle('hidden', !text);
}

if (root && form && done && submit) {
  const idleLabel = submit.textContent ?? '';

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
      businessName: data.get('businessName'),
      town: data.get('town'),
      role: data.get('role'),
      email: data.get('email'),
      ownershipNote: data.get('ownershipNote'),
      confirmed: data.get('confirmed') === 'on',
      website: data.get('website'),
    };

    submit.disabled = true;
    if (root.dataset.sending) submit.textContent = root.dataset.sending;

    try {
      const response = await fetch('/api/claims/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (response.status === 400) {
        show(root.dataset.invalid ?? '');
      } else if (!response.ok) {
        show(root.dataset.error ?? '');
      } else {
        form.hidden = true;
        done.hidden = false;
        done.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        return;
      }
    } catch {
      show(root.dataset.error ?? '');
    }
    submit.disabled = false;
    submit.textContent = idleLabel;
  });
}
