/** @jsx jsx */
import { jsx, css, SerializedStyles, Global } from '@emotion/core';
import React, { useState, useContext, useEffect } from 'react';
import electron from 'electron';

const WindowContext = React.createContext(electron.remote.getCurrentWindow());

export type WindowTitlebarProps = {
    children?: React.ReactNode;
    color?: string;
    height?: string;
    browserWindow?: electron.BrowserWindow;
};
export const WindowTitlebar = ({
    children,
    color,
    height = '40px',
    browserWindow
}: WindowTitlebarProps) => (
    <div
        css={css`
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: ${height};
            color: ${color};

            & > div {
                display: grid;
                grid-template-columns: auto;
                width: 100%;
                height: 100%;
                -webkit-app-region: drag;
                -webkit-user-select: none;
            }
        `}
    >
        <Global
            styles={css`
                body {
                    padding-top: ${height};
                }
            `}
        />

        <div>
            <WindowContext.Provider
                value={browserWindow || electron.remote.getCurrentWindow()}
            >
                {children}
            </WindowContext.Provider>
        </div>
    </div>
);

export type WindowTitleProps = { children: string };
export const WindowTitle = (props: WindowTitleProps) => (
    <div
        css={css`
            display: flex;
            grid-column: 2;
            align-items: center;
            margin: 0 8px;
            overflow-x: hidden;
            font-size: 15px;

            & > span {
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
                line-height: 1.5;
            }
        `}
    >
        <span>{props.children}</span>
    </div>
);

export type WindowControlsProps = {
    controls?: ('minimize' | 'maximize' | 'close')[];
};
export const WindowControls = (props: WindowControlsProps) => {
    const browserWindow = useContext(WindowContext);
    const [isMaximized, setMaximized] = useState(browserWindow.isMaximized());

    useEffect(() => {
        function updateMaximized() {
            setMaximized(browserWindow.isMaximized());
        }

        function cleanup() {
            browserWindow.removeListener('maximize', updateMaximized);
            browserWindow.removeListener('unmaximize', updateMaximized);
        }

        browserWindow.addListener('maximize', updateMaximized);
        browserWindow.addListener('unmaximize', updateMaximized);

        window.addEventListener('beforeunload', cleanup);
        return cleanup;
    }, [browserWindow]);

    return (
        <div
            css={css`
                display: grid;
                grid-template-columns: repeat(3, 46px);
                position: absolute;
                top: 0;
                right: 0;
                height: 100%;
                font-family: 'Segoe';
                font-size: 10px;
                -webkit-app-region: no-drag;

                & > div {
                    display: flex;
                    grid-row: 1 / span 1;
                    align-items: center;
                    justify-content: center;
                    width: 100%;
                    height: 100%;
                }

                & > div:hover {
                    background: rgba(255, 255, 255, 0.2);
                }
            `}
        >
            {props.controls.map((control, i) => {
                let icon: React.ReactNode;
                let additionalCss: SerializedStyles;

                switch (control) {
                    case 'minimize':
                        icon = <span>&#xE921;</span>;
                        break;

                    case 'maximize':
                        icon = isMaximized ? (
                            <span>&#xE923;</span>
                        ) : (
                            <span>&#xE922;</span>
                        );
                        break;

                    case 'close':
                        icon = <span>&#xE8BB;</span>;
                        additionalCss = css`
                            div > &:hover {
                                background: #e81123;
                            }
                        `;
                        break;
                }

                return (
                    <div
                        key={control}
                        css={css`
                            grid-column: ${i + 1};
                            ${additionalCss}
                        `}
                        onClick={() => {
                            switch (control) {
                                case 'minimize':
                                    browserWindow.minimize();
                                    break;

                                case 'maximize':
                                    isMaximized
                                        ? browserWindow.unmaximize()
                                        : browserWindow.maximize();
                                    break;

                                case 'close':
                                    browserWindow.close();
                                    break;
                            }
                        }}
                    >
                        {icon}
                    </div>
                );
            })}
        </div>
    );
};
