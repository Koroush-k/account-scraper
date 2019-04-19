import puppeteer from 'puppeteer';

export type CreateBrowserOptions = puppeteer.LaunchOptions;

export function createBrowser(options?: CreateBrowserOptions) {
    return puppeteer.launch({
        ...options,
        executablePath: puppeteer
            .executablePath()
            .replace('app.asar', 'app.asar.unpacked')
    });
}
