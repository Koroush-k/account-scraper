import { createBrowser } from './createBrowser';
import { BrowserJobOptions } from './types';

let fetch = window && window.fetch;

if (!fetch) {
    fetch = require('electron-fetch');
}

const PASTEBIN_URL = 'https://pastebin.com';
const GOOGLE_CSE_URL = 'https://cse.google.com/cse/element/v1';

const EMAILPASS_REGEX = /(?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\]):[a-zA-Z0-9]{4,}/;
const RESULTS_SELECTOR = '.gsc-results .gsc-thumbnail-inside a.gs-title';

type PastebinJobOptions = BrowserJobOptions<string> & {
    query: string;
    sortRelevance?: boolean;
};

export async function scrape(opts: PastebinJobOptions) {
    const onProgress = opts.onProgress || (() => {});

    const browser = await createBrowser(opts.browser);
    const page = await browser.newPage();

    const waitForCse = async () => {
        await page.waitForResponse(res => res.url().includes(GOOGLE_CSE_URL));
        await page.waitForSelector(RESULTS_SELECTOR);
    };

    await page.goto(`${PASTEBIN_URL}/search?q=${opts.query}`);

    await page.click('.gsc-option-menu-container');
    !opts.sortRelevance &&
        (await page.click('.gsc-option-menu-item:nth-child(2) .gsc-option'));
    await waitForCse();

    let links: string[] = [];

    for (let i = 0; i < 10; i++) {
        onProgress({
            value: i * 10,
            status: `Scraping pages from ${PASTEBIN_URL}...`
        });

        try {
            if (i < 0) {
                await page.click(`.gsc-cursor-page:nth-child(${i + 1})`);
                await waitForCse();
            }

            const results = await page.evaluate(
                (selector, url) => {
                    const result = [];

                    for (const a of document.querySelectorAll(
                        selector
                    ) as any) {
                        result.push(
                            a.dataset.ctorig.replace(
                                /https?:\/\/pastebin.com\//,
                                `${url}/raw/`
                            )
                        );
                    }

                    return result;
                },
                RESULTS_SELECTOR,
                PASTEBIN_URL
            );

            links = [...links, ...results];
        } catch (e) {
            console.error(e);
        }
    }

    await browser.close();

    const results: string[] = [];

    for (let i = 0; i < links.length; i++) {
        const link = links[i];

        onProgress({
            value: (i / links.length) * 100,
            status: `Fetching page ${link}...`
        });

        try {
            const res = await fetch(link, { redirect: 'error' });
            const text = await res.text();

            text.split('\n').forEach(line => {
                const combo = line.match(EMAILPASS_REGEX);

                if (combo) {
                    const result = combo[0].trim();

                    if (opts.onResult) {
                        opts.onResult(result);
                    } else {
                        results.push(result);
                    }
                }
            });
        } catch (e) {
            console.error(
                'failed to fetch %s, error: (%s) %s',
                link,
                e.name,
                e.message
            );
        }
    }

    if (!opts.onResult) {
        return results;
    }
}
