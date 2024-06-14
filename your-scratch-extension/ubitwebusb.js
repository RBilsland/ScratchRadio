const DAPjs = require('./dap.umd');

const MICROBIT_VENDOR_ID = 0x0d28;
const MICROBIT_PRODUCT_ID = 0x0204;

const Reasons = {
    CONNECTED: 'connected',
    DISCONNECTED: 'disconnected',
    CONNECTION_FAILURE: 'connection failure',
    ERROR: 'error',
    EMPTY: 'empty',
    COMMAND: 'command'
};

const connectDevice = (instance, callback) => { 
    navigator.usb.addEventListener('disconnect', (event) => {
        if('device' in event && 'callback' in event.device && event.device.callback != null && event.device.productName.includes("micro:bit")) {
            disconnectDevice(event.device);
        }
    });

    navigator.usb.requestDevice({
        filters: [{
            vendorId: MICROBIT_VENDOR_ID,
            productId: MICROBIT_PRODUCT_ID
        }]
    })
    .then(device => {
        if(!device.opened) {
            openDevice(instance, device, callback)}  
        })
    .catch((event) => {
        console.log(event);
        callback('connection failure', null, null);
    });
}

const openDevice = (instance, device, callback) => {
    const transport = new DAPjs.WebUSB(device);
    const target = new DAPjs.DAPLink(transport);
    target.connect()
    .then(() => {
        target.setSerialBaudrate(115200);
    })
    .then(() => {
        device.target = target;
        device.callback = callback;
        callback(instance, 'connected', device, null);    
    
        let lineParser = () => {
            let firstNewline = buffer.indexOf('\n');
    
            if(firstNewline >= 0) {
                let messageToNewline = buffer.slice(0, firstNewline);
                let now = new Date(); 
    
                let commandParts = messageToNewline.split(String.fromCharCode(30));
    
                let dataBundle = {
                    time: now,
                    data: commandParts,
                };
    
                callback(instance, commandParts.length == 0 ? 'empty' : 'command', device, dataBundle);
    
                buffer = buffer.slice(firstNewline + 1);
                firstNewline = buffer.indexOf('\n');
    
                if(firstNewline >= 0) {
                    setTimeout(lineParser, 10);
                }
            }
        }
    
        let buffer = '';
        const ws = / *\r\n/g;
        target.on(DAPjs.DAPLink.EVENT_SERIAL_DATA, data => {
            buffer += data;
            buffer = buffer.replace(ws, '\n');
    
            if(data.includes('\n')) {
                setTimeout(lineParser, 10);
            }
        });
    
        target.startSerialRead(1);
    })
    .catch((event) => {
        console.log(event);
    })
    .finally(() => {
        return Promise.resolve();
    });
}

const disconnectDevice = (device) => {
    if(device) {
        const stopSerialRead = new Promise((resolve, reject) => {
            device.target.stopSerialRead();
        });
        stopSerialRead
        .catch((event) => {
            console.log(event);
        })
        .then(() => {
            device.target.disconnect();
        })
        .catch((event) => {
            console.log(event);
        })
        .then(() => {
            device.close();
        })
        .catch((event) => {
            console.log(event);
        })
        .finally(() => {
            device.callback('disconnected', device, null);
            device.callback = null;
            device.target = null;
        });
    }
}

const send = (device, data) => {
    if(device.opened) {
        let fullLine = data + '\n';
        device.target.serialWrite(fullLine);
    }
}

export {
    Reasons,
    connectDevice,
    disconnectDevice,
    send
} 