const canvas = document.getElementById('emulator-canvas');
const ctx = canvas.getContext('2d');
let emulator = null;
let currentConsole = 'nes';

// Console sizes
const consoleSizes = {
    nes: {width: 256, height: 240},
    snes: {width: 256, height: 224},
    gb: {width: 160, height: 144}
};

// Allowed extensions (school-safe)
const allowedExtensions = ['.nes', '.gb', '.sfc', '.smc'];

// Set canvas size
function resizeCanvas() {
    const {width, height} = consoleSizes[currentConsole];
    canvas.width = width;
    canvas.height = height;
    fitCanvasToWindow();
}

// Center canvas
function fitCanvasToWindow() {
    const {width, height} = consoleSizes[currentConsole];
    const scale = Math.min(window.innerWidth / width, window.innerHeight / height);
    canvas.style.width = width * scale + 'px';
    canvas.style.height = height * scale + 'px';
    canvas.style.left = ((window.innerWidth - width * scale) / 2) + 'px';
    canvas.style.top = ((window.innerHeight - height * scale) / 2) + 'px';
}

resizeCanvas();
window.addEventListener('resize', fitCanvasToWindow);

// Keyboard mappings
const keyMaps = {
    nes: {38:'UP',40:'DOWN',37:'LEFT',39:'RIGHT',90:'A',88:'B',13:'START',16:'SELECT'},
    snes: {38:'UP',40:'DOWN',37:'LEFT',39:'RIGHT',65:'A',83:'B',81:'X',87:'Y',13:'START',16:'SELECT',90:'L',88:'R'},
    gb: {38:'UP',40:'DOWN',37:'LEFT',39:'RIGHT',88:'A',90:'B',13:'START',16:'SELECT'}
};

// Detect console type
function detectConsole(filename) {
    const lower = filename.toLowerCase();
    if(!allowedExtensions.some(ext => lower.endsWith(ext))) {
        alert("This file is not allowed on school grounds.");
        return null;
    }
    if(lower.endsWith('.nes')) return 'nes';
    if(lower.endsWith('.sfc') || lower.endsWith('.smc')) return 'snes';
    if(lower.endsWith('.gb') || lower.endsWith('.gbc')) return 'gb';
    return null;
}

// Load ROM
function loadROM(file) {
    const consoleType = detectConsole(file.name);
    if(!consoleType) return;

    currentConsole = consoleType;
    resizeCanvas();
    const reader = new FileReader();

    reader.onload = function(e) {
        const buffer = e.target.result;

        if(currentConsole === 'nes'){
            emulator = new jsnes.NES({
                onFrame: frame => {
                    const imageData = ctx.createImageData(256, 240);
                    imageData.data.set(frame);
                    ctx.putImageData(imageData, 0, 0);
                },
                onAudioSample: ()=>{}
            });
            emulator.loadROM(buffer);
            emulator.frame();
        } else if(currentConsole === 'snes'){
            emulator = new JSSNES.SNES(canvas);
            emulator.loadROM(buffer);
        } else if(currentConsole === 'gb'){
            emulator = new jsGB.GB();
            emulator.loadROM(buffer);
        }
    };

    if(file.name.endsWith('.zip')){
        JSZip.loadAsync(file).then(zip => {
            const romFile = Object.values(zip.files).find(f => !f.dir);
            if(!romFile) return alert("No valid ROM found inside ZIP");
            currentConsole = detectConsole(romFile.name);
            romFile.async('arraybuffer').then(data => reader.onload({target:{result:data}}));
        });
    } else {
        reader.readAsArrayBuffer(file);
    }
}

// Drag & Drop
document.body.addEventListener('dragover', e => e.preventDefault());
document.body.addEventListener('drop', e => {
    e.preventDefault();
    if(e.dataTransfer.files.length) loadROM(e.dataTransfer.files[0]);
});

// Fullscreen button
document.getElementById('fullscreen-btn').addEventListener('click', ()=>{
    if(!document.fullscreenElement){
        document.documentElement.requestFullscreen();
        canvas.style.border = '10px solid #4CAF50';
        fitCanvasToWindow();
    } else {
        document.exitFullscreen();
        canvas.style.border = '5px solid #333';
        fitCanvasToWindow();
    }
});

// Keyboard events
window.addEventListener('keydown', e=>{
    if(emulator && keyMaps[currentConsole] && keyMaps[currentConsole][e.keyCode]){
        const key = keyMaps[currentConsole][e.keyCode];
        if(currentConsole==='nes') emulator.buttonDown(1, jsnes.Controller[key]);
    }
});
window.addEventListener('keyup', e=>{
    if(emulator && keyMaps[currentConsole] && keyMaps[currentConsole][e.keyCode]){
        const key = keyMaps[currentConsole][e.keyCode];
        if(currentConsole==='nes') emulator.buttonUp(1, jsnes.Controller[key]);
    }
});
