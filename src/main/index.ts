import { app, BrowserWindow } from 'electron';
import path from 'path';
import config from '../config';

let mainWindow: BrowserWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        minWidth: 900,
        minHeight: 600,
        frame: false,
        show: false,
        webPreferences: {
            nodeIntegration: true
        }
    });
    mainWindow.loadFile(path.join(__dirname, '../../static/index.html'));

    if (config.isDev) {
        mainWindow.webContents.openDevTools();
        // BrowserWindow.addDevToolsExtension(
        //     path.join(
        //         os.homedir(),
        //         '/.config/google-chrome/Default/Extensions/fmkadmapgofadopljbjfkapdkoienihi/3.6.0_0'
        //     )
        // );
    }

    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

app.on('ready', createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (mainWindow === null) {
        createWindow();
    }
});
