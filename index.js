const { app, BrowserWindow } = require('electron')
let win;
app.whenReady().then(() => {
    win = new BrowserWindow({
        width: 1080,
        height: 720
    })
    win.loadURL('http://localhost:5173')
    win.openDevTools()
})
