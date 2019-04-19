import { CreateBrowserOptions } from './createBrowser';

export type ProgressInfo = {
    value: number;
    status?: string;
};

export type BrowserJobOptions<T> = {
    browser?: CreateBrowserOptions;
    onProgress?: (progress: ProgressInfo) => any;
    onResult?: (result: T) => any;
};

export type TestJobOptions<T> = BrowserJobOptions<T> & {
    combos: string[];
};