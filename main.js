const electron = require('electron');
const { resolve } = require('path');
const { execSync } = require('child_process');
const os = require('os');

const tryCatch = require('./src/try-catch');

const { app, Menu, BrowserWindow } = electron;
const pathToReactDevTools = `${os.homedir()}/Library/Application Support/Google/Chrome/Default/Extensions/fmkadmapgofadopljbjfkapdkoienihi/2.5.2_0`;

// enable chrome dev-tools when builded
require('electron-debug')({ enabled: true, showDevTools: true });

if (process.versions && process.versions.electron) {
  process.env.NODE_CONFIG_DIR = './config';
}

let win;
let reactDevTools;

const template = [
  {
    label: 'Webspoof',
    submenu: [ { role: 'quit' } ] },
  {
    label: 'Edit',
    submenu: [
    { role: 'cut' },
    { role: 'copy' },
    { role: 'paste' },
    { role: 'delete' },
    { role: 'selectall' } ] },
  {
    label: 'View',
    submenu: [
        { role: 'reload' },
        { role: 'toggledevtools' } ] }
];

const createWindow = () => {
  win = new BrowserWindow({ width: 800, height: 800 });
  win.maximize();
  reactDevTools = BrowserWindow.addDevToolsExtension(pathToReactDevTools);

  win.loadURL(`file://${__dirname}/index.html`);

  // open external URLs into default browser
  win.webContents.on('new-window', (e, url) => {
    e.preventDefault();
    execSync(`open ${url}`);
  });


  win.on('closed', () => {
    BrowserWindow.removeDevToolsExtension(reactDevTools);
    win = null;
  });
};

app.on('ready', () => {
  const tmp = require('tmp');

  tmp.dir((err, path) => {
    if (err) throw err;

    global.tmpProjectPath = path;
    createWindow();
    Menu.setApplicationMenu(Menu.buildFromTemplate(template));

    execSync(`cp -R ${resolve(__dirname, 'xcode-project')} ${resolve(path)}`);
    execSync(`open ${resolve(path, 'xcode-project/pokemon-webspoof.xcodeproj')}`);

    // quit xcode && remove tmp directory on exit
    app.on('before-quit', () => {
      tryCatch(() => { return execSync('killall Xcode'); });
      tryCatch(() => { return execSync(`rm -rf ${path}`); });
    });
  });
});

app.on('window-all-closed', () => { return (process.platform !== 'darwin') && app.quit(); });
app.on('activate', () => { return (win === null) && createWindow(); });
