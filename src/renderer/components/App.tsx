import { remote } from 'electron';
import fs from 'fs';
import os from 'os';
import path from 'path';
import React, { useState } from 'react';
import { Global, keyframes, css } from '@emotion/core';
import styled from '@emotion/styled';
import { scrape } from '../../lib/pastebin';
import { testSpotify, SpotifyJobResult } from '../../lib/spotify';
import { NetflixJobResult, testNetflix } from '../../lib/netflix';
import { ProgressInfo, TestJobOptions } from '../../lib/types';
import { WindowTitlebar, WindowTitle, WindowControls } from './WindowTitlebar';
import { Table, Column, AutoSizer, List } from 'react-virtualized';

const Button = styled.button`
    padding: 7px 14px;
    border: none;
    border-radius: 5px;
    color: #fff;
    cursor: pointer;
    background: rgba(0, 0, 0, 0.5);
    font-family: 'Open Sans';
    outline: none !important;

    &:active {
        background: rgba(0, 0, 0, 0.2);
    }
`;

const SettingsDiv = styled.div`
    display: flex;
    margin-top: 10px;
    height: 20px;
    font-size: 12px;

    & > h3 {
        margin: 0;
        text-decoration: underline;
    }
`;

const Label = styled.label`
    display: flex;
    margin: 5px 25px;
    align-items: center;

    & > input,
    & > select {
        margin: 0 5px;
    }
`;

const StartButton = styled(Button)<{ collapse?: boolean; loading?: boolean }>`
    position: fixed;
    z-index: 1;
    top: calc(50% - 50px);
    left: calc(50% - 50px);
    width: 100px;
    height: 100px;
    border-radius: 50%;
    text-transform: uppercase;
    font-weight: bold;
    ${props =>
        props.collapse &&
        css`
            animation: ${keyframes`
                to {
                    top: calc(100% - 50px);
                    left: 0;
                    border-radius: 0;
                    width: 100%;
                    height: 50px;
                    background: rgba(0, 0, 0, 0.5);
                }
            `} 0.6s forwards;
        `}
    ${props =>
        props.loading &&
        css`
            cursor: default;
            pointer-events: none;
        `}
`;

const ExportButton = styled(Button)`
    position: fixed;
    bottom: 60px;
    left: 10px;
`;

const LoadingIndicator = styled.div<{ progress: number; background: string }>`
    position: fixed;
    z-index: -1;
    bottom: 0;
    left: 0;
    width: ${props => props.progress}%;
    height: 50px;
    background: ${props => props.background};
    opacity: 0;
    animation: ${keyframes`
        to {
            opacity: 1;
        }
    `} 0.6s forwards 1.25s;
    transition: width 0.35s ease;
`;

enum AccountType {
    Spotify = 'spotify',
    Netflix = 'netflix'
}

export const App = () => {
    const [stage, setStage] = useState<'scrape' | 'test' | undefined>();
    const [pastebinResults, setPastebinResults] = useState<string[]>([]);
    const [accountType, setAccountType] = useState<AccountType>(
        AccountType.Spotify
    );
    const [spotifyResults, setSpotifyResults] = useState<SpotifyJobResult[]>(
        []
    );
    const [netflixResults, setNetflixResults] = useState<NetflixJobResult[]>(
        []
    );
    const [progress, setProgress] = useState<ProgressInfo | undefined>();
    const [loading, setLoading] = useState<boolean>(false);
    const [collapseStart, setCollapseStart] = useState<boolean>(false);
    const [headless, setHeadless] = useState<boolean>(true);
    const [pastebinQuery, setPastebinQuery] = useState<string | undefined>();

    const handleStart = async () => {
        setLoading(true);
        setCollapseStart(true);

        setPastebinResults([]);
        setSpotifyResults([]);
        setNetflixResults([]);

        setStage('scrape');

        let pastebinResults: string[] = [];

        const pastebinUpdateInterval = setInterval(() => {
            setPastebinResults(pastebinResults);
        }, 3000);

        const browserLaunchOptions = {
            headless,
            ...(os.platform() === 'linux' && {
                args: ['--no-sandbox']
            })
        };

        await scrape({
            query: pastebinQuery ? pastebinQuery : accountType,
            browser: browserLaunchOptions,
            onProgress: progress => setProgress(progress),
            onResult: result => (pastebinResults = [...pastebinResults, result])
        });

        pastebinResults = pastebinResults.reduce((a: string[], b) => {
            if (!a.includes(b)) {
                a.push(b);
            }

            return a;
        }, []);

        setPastebinResults(pastebinResults);
        clearInterval(pastebinUpdateInterval);

        setProgress({
            value: 0,
            status: `Fetched ${pastebinResults.length} combos!`
        });

        setStage('test');

        const testJobOptions: TestJobOptions<any> = {
            combos: pastebinResults,
            browser: browserLaunchOptions,
            onProgress: progress => setProgress(progress)
        };

        switch (accountType) {
            case AccountType.Spotify:
                await testSpotify({
                    ...testJobOptions,
                    onResult: result =>
                        setSpotifyResults(results => [...results, result])
                });
                break;

            case AccountType.Netflix:
                await testNetflix({
                    ...testJobOptions,
                    onResult: result =>
                        setNetflixResults(results => [...results, result])
                });
                break;
        }

        setProgress({ value: 0 });
        setLoading(false);
    };

    const results =
        accountType === AccountType.Spotify ? spotifyResults : netflixResults;

    return (
        <div style={{ height: 'calc(100vh - 170px)' }}>
            <Global
                styles={css`
                    *,
                    *:before,
                    *:after {
                        box-sizing: inherit;
                    }

                    html {
                        box-sizing: border-box;
                    }

                    body {
                        margin: 0;
                        color: #fff;
                        background-color: ${accountType === AccountType.Spotify
                            ? '#305e25'
                            : '#5e2525'};
                        font-family: 'Open Sans';
                        transition: background-color 0.35s;
                    }
                `}
            />

            <WindowTitlebar height='40px'>
                <WindowTitle>Account Scraper v0.0.1</WindowTitle>
                <WindowControls controls={['minimize', 'maximize', 'close']} />
            </WindowTitlebar>

            <StartButton
                loading={loading}
                collapse={collapseStart}
                onClick={loading ? undefined : handleStart}
            >
                {loading
                    ? progress && progress.status
                        ? progress.status
                        : 'Loading...'
                    : 'Start'}
            </StartButton>
            {progress && (
                <LoadingIndicator
                    background={
                        accountType === AccountType.Spotify
                            ? '#20d487'
                            : '#d42020'
                    }
                    progress={progress.value}
                />
            )}

            <SettingsDiv>
                <Label>
                    Account Type:
                    <select
                        disabled={loading}
                        onChange={e =>
                            setAccountType(e.target.value as AccountType)
                        }
                    >
                        {Object.values(AccountType).map(type => (
                            <option key={type} value={type}>
                                {type}
                            </option>
                        ))}
                    </select>
                </Label>

                <Label>
                    Pastebin Query:
                    <input
                        type='text'
                        disabled={loading}
                        value={pastebinQuery}
                        placeholder={accountType}
                        onChange={e => setPastebinQuery(e.target.value)}
                    />
                </Label>

                <Label>
                    View Headless Browser?
                    <input
                        type='checkbox'
                        disabled={loading}
                        checked={!headless}
                        onChange={() => setHeadless(!headless)}
                    />
                </Label>
            </SettingsDiv>

            {stage === 'scrape' && (
                <AutoSizer>
                    {({ width, height }) => (
                        <List
                            width={width}
                            height={height}
                            rowCount={pastebinResults.length}
                            rowHeight={16}
                            rowRenderer={({ index, key, style }) => (
                                <div key={key} style={style}>
                                    {pastebinResults[index]}
                                </div>
                            )}
                        />
                    )}
                </AutoSizer>
            )}

            {stage === 'test' && (
                <AutoSizer>
                    {({ width, height }) => (
                        <Table
                            width={width}
                            height={height}
                            headerHeight={50}
                            rowHeight={30}
                            rowCount={results.length}
                            rowGetter={({ index }) => results[index]}
                        >
                            <Column
                                dataKey='email'
                                label='Email'
                                width={200}
                                flexGrow={1}
                            />
                            <Column
                                dataKey='password'
                                label='Password'
                                width={200}
                                flexGrow={1}
                            />
                            {accountType === AccountType.Spotify && [
                                <Column
                                    key='country'
                                    dataKey='country'
                                    label='Country'
                                    width={100}
                                />,
                                <Column
                                    key='productName'
                                    dataKey='productName'
                                    label='Account Type'
                                    width={175}
                                />,
                                <Column
                                    key='productDesc'
                                    dataKey='productDesc'
                                    label='Account Description'
                                    width={225}
                                    flexGrow={1}
                                />
                            ]}
                            {accountType === AccountType.Netflix && [
                                <Column
                                    key='screens'
                                    dataKey='screens'
                                    label='Screens'
                                    width={100}
                                />,
                                <Column
                                    key='language'
                                    dataKey='language'
                                    label='Language'
                                    width={175}
                                />,
                                <Column
                                    key='until'
                                    dataKey='until'
                                    label='Until'
                                    width={225}
                                    flexGrow={1}
                                />
                            ]}
                        </Table>
                    )}
                </AutoSizer>
            )}

            {stage === 'test' && (
                <ExportButton
                    onClick={async () => {
                        const savePath = await remote.dialog.showSaveDialog(
                            remote.getCurrentWindow(),
                            {
                                title: 'Export Accounts',
                                buttonLabel: 'Export',
                                filters: [
                                    { name: 'JSON', extensions: ['json'] }
                                ],
                                defaultPath: path.join(
                                    os.homedir(),
                                    `${accountType}.json`
                                )
                            }
                        );

                        let data;

                        switch (savePath.split('.').pop()) {
                            case 'json':
                                data = JSON.stringify(results, null, 4);
                                break;
                        }

                        fs.writeFile(
                            savePath,
                            data,
                            { encoding: 'utf8' },
                            err => {
                                if (err) {
                                    remote.dialog.showErrorBox(
                                        'Failed to export',
                                        `${err.name}: ${err.message} (code: ${
                                            err.code
                                        })`
                                    );
                                }

                                console.log('exported to %s', savePath);
                            }
                        );
                    }}
                >
                    Export Results
                </ExportButton>
            )}
        </div>
    );
};
