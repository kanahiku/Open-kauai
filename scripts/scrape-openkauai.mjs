/**
 * Scrape the public Open Kauaʻi directory (openkauai.org) into local JSON.
 *
 * The site is a Google Sites shell. Its map and search are Apps Script web apps whose data
 * is only reachable through `google.script.run` inside the page, so this drives a headless
 * Chrome (puppeteer-core), loads each app once, and calls the same server function the page calls.
 * Two page loads in total. Output: .cache/openkauai/{map,search}.json (gitignored).
 *
 * Usage: npm run scrape            (set CHROME_PATH if Chrome is not in the default macOS location)
 */
import fs from 'node:fs';
import puppeteer from 'puppeteer-core';

const CHROME = process.env.CHROME_PATH ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const APPS = {
  map: {
    url: 'https://script.google.com/macros/s/AKfycbwb7LuKUqcayoOXj_p3HxAf0Oh-Ye7toRot57l2ys8eSNUQtqTSypJByN4B5KPHfZnHbA/exec',
    fn: 'getMapData',
  },
  search: {
    url: 'https://script.google.com/macros/s/AKfycbw5HlkDwUbSad-3dzYJ8vYF7flkkemN2s8MdxIALhFWLYOP9lI4jfHakPNF9k8ppF0jZQ/exec',
    fn: 'getBootstrapData',
  },
};

const OUT_DIR = '.cache/openkauai';
fs.mkdirSync(OUT_DIR, { recursive: true });

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function callServerFunction(page, fn) {
  // The user code runs in a nested sandbox iframe; find the frame that exposes google.script.run.
  for (let attempt = 0; attempt < 20; attempt++) {
    for (const frame of page.frames()) {
      try {
        const ready = await frame.evaluate(() => Boolean(window.google?.script?.run));
        if (!ready) continue;
        return await frame.evaluate(
          (name) =>
            new Promise((resolve, reject) => {
              const runner = window.google.script.run
                .withSuccessHandler(resolve)
                .withFailureHandler((error) => reject(String(error?.message ?? error)));
              runner[name]();
            }),
          fn
        );
      } catch {
        // Frame not ready or navigated: try the next one.
      }
    }
    await sleep(1500);
  }
  throw new Error(`Could not reach google.script.run for ${fn}`);
}

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] });
try {
  for (const [name, { url, fn }] of Object.entries(APPS)) {
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60_000 });
    const data = await callServerFunction(page, fn);
    fs.writeFileSync(`${OUT_DIR}/${name}.json`, JSON.stringify(data, null, 2));
    const count = (data.businesses ?? data.listings ?? []).length;
    console.log(`${name}: ${count} records -> ${OUT_DIR}/${name}.json`);
    await page.close();
    await sleep(2000);
  }
} finally {
  await browser.close();
}
