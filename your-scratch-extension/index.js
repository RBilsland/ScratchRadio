const ArgumentType = require('../../extension-support/argument-type');
const BlockType = require('../../extension-support/block-type');
const cast = require('../../util/cast');
const formatMessage = require('format-message');
const TargetType = require('../../extension-support/target-type');

const uBitWebUSB = require('./ubitwebusb');

const blockIconURI = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAAUCAYAAACNiR0NAAABhWlDQ1BJQ0MgcHJvZmlsZQAAKJF9kT1Iw0AcxV9btSJVBzuIOGSogmChqIijVqEIFUKt0KqDyaVf0KQhSXFxFFwLDn4sVh1cnHV1cBUEwQ8QZwcnRRcp8X9JoUWMB8f9eHfvcfcO8NfLTDU7YoCqWUYqERcy2VUh+IouhNCHMcQkZupzopiE5/i6h4+vd1Ge5X3uz9Gr5EwG+ATiWaYbFvEG8fSmpXPeJw6zoqQQnxOPG3RB4keuyy6/cS447OeZYSOdmicOEwuFNpbbmBUNlXiKOKKoGuX7My4rnLc4q+Uqa96TvzCU01aWuU5zGAksYgkiBMioooQyLERp1UgxkaL9uId/yPGL5JLJVQIjxwIqUCE5fvA/+N2tmZ+ccJNCcaDzxbY/RoDgLtCo2fb3sW03ToDAM3CltfyVOjDzSXqtpUWOgP5t4OK6pcl7wOUOMPikS4bkSAGa/nweeD+jb8oCA7dAz5rbW3Mfpw9AmrpK3gAHh8BogbLXPd7d3d7bv2ea/f0AolJyugNbttsAAAAGYktHRAD/AP8AgGAHyz4AAAAJcEhZcwAADdcAAA3XAUIom3gAAAAHdElNRQfoBgwOLh4Iw2ASAAAAt0lEQVQ4y82UIQ4CMRBFHw1qDSfoARZJkHABLoDCwgV6CtILoDGEC+DxIPGkFoPYbrIKMyRNBQl0INT8aaf96ftpCsqjp2ES8DtgDkSjdLGBaGW0kfsfIh6BCthb3LrYEJiKnvLG75EDfgSsZLqxuHNphmNgmSC+NPw+csBPgCHQWtxWI8NFgvi2oT5ywNfySG8Wd9XI8CL1AZiVGhrtn0c9QwNEqe+inehzvUn2N1mvy85G/n48AC/dI8RbT9KFAAAAAElFTkSuQmCC';

const radioSendInterval = 100;

const SendCommands = {
    RADIO_GATEWAY_QUESTION: 'RG?',
    SETFREQUENCYBAND: 'RSFB',
    SETGROUP: 'RSG',
    SETTRANSMITPOWER: 'RSTP',
    SETTRANSMITSERIALNUMBER: 'RSTSN',
    SENDEVENT: 'RREFSWV',
    SENDNUMBER: 'RSN',
    SENDSTRING: 'RSS',
    SENDVALUEPAIR: 'RSV',    
};

const ReceivedCommands = {
    GATEWAY_RESPONSE_YES: 'YES',
    HEARTBEAT: 'HB',
    ON_RADIO_RECEIVED_NUMBER: 'ORRN',
    ON_RADIO_RECEIVED_VALUE: 'ORRV',
    ON_RADIO_RECEIVED_STRING: 'ORRS'
}

class MicroBitRadio {
    constructor (runtime, extensionId) {
        this._runtime = runtime;
        this._extensionId = extensionId;

        this._runtime.registerPeripheralExtension(extensionId, this);        

        this._connected = false;
        this._connectedDevice = null;
        this._radioGatewayResponded = false;
        this._lastHeartbeat = new Date();
        this._receivedNumbers = [];
        this._receivedStrings = [];
        this._receivedValuePairs = [];
        this._receivedData = {};

        if (window.confirm('Click ok and then select the Micro:bit that is the Radio Gateway')) {
            uBitWebUSB.connectDevice(this, this.eventHandler);
        }
    }

    send() {
        if (arguments.length > 0) {
            dataToSend = '';

            for (var i = 0; i < arguments.length; i++) {
                if (i > 0) {
                    dataToSend += String.fromCharCode(30);
                }

                dataToSend += cast.toString(arguments[i]);
            }
            uBitWebUSB.send(this._connectedDevice, dataToSend);
        }
    }

    eventHandler(instance, reason, device, data) {
        switch(reason) {
            case uBitWebUSB.Reasons.CONNECTED:
                instance._connected = true;
                instance._connectedDevice = device;
                   setTimeout(() => {
                    instance.send(SendCommands.RADIO_GATEWAY_QUESTION) 
                }, 250);
                break;
            case uBitWebUSB.Reasons.DISCONNECTED:
                instance._connected = false;
                instance._connectedDevice = null;
                instance._radioGatewayResponded = false;
                break;
            case uBitWebUSB.Reasons.CONNECTION_FAILURE:
                break;
            case uBitWebUSB.Reasons.ERROR:
                break;
            case uBitWebUSB.Reasons.EMPTY:
                break;
            case uBitWebUSB.Reasons.COMMAND:
                switch(data.data[0]) {
                    case ReceivedCommands.GATEWAY_RESPONSE_YES:
                        instance._radioGatewayResponded = true;
                        break;
                    case ReceivedCommands.HEARTBEAT:
                        instance._lastHeartbeat = new Date();
                        break;
                    case ReceivedCommands.ON_RADIO_RECEIVED_NUMBER:
                        instance._receivedNumbers.push({
                            number: data.data[1],
                            serialNumber: data.data[2],
                            signalStrength: data.data[3],
                            time: data.data[4],
                        });
                        break;
                    case ReceivedCommands.ON_RADIO_RECEIVED_VALUE:
                        instance._receivedValuePairs.push({
                            string: data.data[1],
                            number: data.data[2],
                            serialNumber: data.data[3],
                            signalStrength: data.data[4],
                            time: data.data[5],
                        });
                        break;
                    case ReceivedCommands.ON_RADIO_RECEIVED_STRING:
                        instance._receivedStrings.push({
                            string: data.data[1],
                            serialNumber: data.data[2],
                            signalStrength: data.data[3],
                            time: data.data[4],
                        });
                        break;
                }
                break;
        }
    }
}

const MicrobitRadioTransmitSerialNumber = {
    YES: 'yes',
    NO: 'no'
}

const MicrobitRadioEventBusSource = {
    MICROBIT_ID_BUTTON_A: 1,
    MICROBIT_ID_BUTTON_B: 2,
    MICROBIT_ID_BUTTON_AB: 26,
    MICROBIT_ID_RADIO: 29,
    MICROBIT_ID_GESTURE: 27,
    MICROBIT_ID_ACCELEROMETER: 4,
    MICROBIT_ID_IO_P0: 7,
    MICROBIT_ID_IO_P1: 8,
    MICROBIT_ID_IO_P2: 9,
    MICROBIT_ID_IO_P3: 10,
    MICROBIT_ID_IO_P4: 11,
    MICROBIT_ID_IO_P5: 12,
    MICROBIT_ID_IO_P6: 13,
    MICROBIT_ID_IO_P7: 14,
    MICROBIT_ID_IO_P8: 15,
    MICROBIT_ID_IO_P9: 16,
    MICROBIT_ID_IO_P10: 17,
    MICROBIT_ID_IO_P11: 18,
    MICROBIT_ID_IO_P12: 19,
    MICROBIT_ID_IO_P13: 20,
    MICROBIT_ID_IO_P14: 21,
    MICROBIT_ID_IO_P15: 22,
    MICROBIT_ID_IO_P16: 23,
    MICROBIT_ID_IO_P19: 24,
    MICROBIT_ID_IO_P20: 25,
    MES_DEVICE_INFO_ID: 1103,
    MES_SIGNAL_STRENGTH_ID: 1101,
    MES_DPAD_CONTROLLER_ID: 1104,
    MES_BROADCAST_GENERAL_ID: 2000,
}

const MicrobitRadioEventBusValue = {
    MICROBIT_EVT_ANY: 0,
    MICROBIT_BUTTON_EVT_CLICK: 3,
    MICROBIT_RADIO_EVT_DATAGRAM: 1,
    MICROBIT_ACCELEROMETER_EVT_DATA_UPDATE: 1,
    MICROBIT_PIN_EVT_RISE: 2,
    MICROBIT_PIN_EVT_FALL: 3,
    MICROBIT_PIN_EVT_PULSE_HI: 4,
    MICROBIT_PIN_EVT_PULSE_LO: 5,
    MES_ALERT_EVT_ALARM1: 6,
    MES_ALERT_EVT_ALARM2: 7,
    MES_ALERT_EVT_ALARM3: 8,
    MES_ALERT_EVT_ALARM4: 9,
    MES_ALERT_EVT_ALARM5: 10,
    MES_ALERT_EVT_ALARM6: 11,
    MES_ALERT_EVT_DISPLAY_TOAST: 1,
    MES_ALERT_EVT_FIND_MY_PHONE: 5,
    MES_ALERT_EVT_PLAY_RINGTONE: 4,
    MES_ALERT_EVT_PLAY_SOUND: 3,
    MES_ALERT_EVT_VIBRATE: 2,
    MES_CAMERA_EVT_LAUNCH_PHOTO_MODE: 1,
    MES_CAMERA_EVT_LAUNCH_VIDEO_MODE: 2,
    MES_CAMERA_EVT_START_VIDEO_CAPTURE: 4,
    MES_CAMERA_EVT_STOP_PHOTO_MODE: 6,
    MES_CAMERA_EVT_STOP_VIDEO_CAPTURE: 5,
    MES_CAMERA_EVT_STOP_VIDEO_MODE: 7,
    MES_CAMERA_EVT_TAKE_PHOTO: 3,
    MES_CAMERA_EVT_TOGGLE_FRONT_REAR: 8,
    MES_DEVICE_DISPLAY_OFF: 5,
    MES_DEVICE_DISPLAY_ON: 6,
    MES_DEVICE_GESTURE_DEVICE_SHAKEN: 4,
    MES_DEVICE_INCOMING_CALL: 7,
    MES_DEVICE_INCOMING_MESSAGE: 8,
    MES_DEVICE_ORIENTATION_LANDSCAPE: 1,
    MES_DEVICE_ORIENTATION_PORTRAIT: 2,
    MES_DPAD_BUTTON_1_DOWN: 9,
    MES_DPAD_BUTTON_1_UP: 10,
    MES_DPAD_BUTTON_2_DOWN: 11,
    MES_DPAD_BUTTON_2_UP: 12,
    MES_DPAD_BUTTON_3_DOWN: 13,
    MES_DPAD_BUTTON_3_UP: 14,
    MES_DPAD_BUTTON_4_DOWN: 15,
    MES_DPAD_BUTTON_4_UP: 16,
    MES_DPAD_BUTTON_A_DOWN: 1,
    MES_DPAD_BUTTON_A_UP: 2,
    MES_DPAD_BUTTON_B_DOWN: 3,
    MES_DPAD_BUTTON_B_UP: 4,
    MES_DPAD_BUTTON_C_DOWN: 5,
    MES_DPAD_BUTTON_C_UP: 6,
    MES_DPAD_BUTTON_D_DOWN: 7,
    MES_DPAD_BUTTON_D_UP: 8,
    MES_REMOTE_CONTROL_EVT_FORWARD: 6,
    MES_REMOTE_CONTROL_EVT_NEXTTRACK: 4,
    MES_REMOTE_CONTROL_EVT_PAUSE: 2,
    MES_REMOTE_CONTROL_EVT_PLAY: 1,
    MES_REMOTE_CONTROL_EVT_PREVTRACK: 5,
    MES_REMOTE_CONTROL_EVT_REWIND: 7,
    MES_REMOTE_CONTROL_EVT_STOP: 3,
    MES_REMOTE_CONTROL_EVT_VOLUMEDOWN: 9,
    MES_REMOTE_CONTROL_EVT_VOLUMEUP: 8,
}

class Scratch3MicroBitRadioBlocks {
    static get EXTENSION_ID() {
        return 'radio';
    }

    static get EXTENSION_NAME() {
        return 'Radio';
    }
    
    get GROUP_NUMS_MENU() {
        return Array.from({length: 256}, (_, i) => ({text: cast.toString(i), value: i}));
    }
    
    get TRANSMIT_POWERS_MENU() {
        return Array.from({length: 8}, (_, i) => ({text: cast.toString(i), value: i}));
    }
    
    get TRANSMIT_SERIAL_NUMBER_MENU() {
        return [
            {
                text: 'yes',
                value: MicrobitRadioTransmitSerialNumber.YES
            },
            {
                text: 'no',
                value: MicrobitRadioTransmitSerialNumber.NO
            }
        ];        
    }

    get BANDS_MENU() {
        return Array.from({length: 84}, (_, i) => ({text: cast.toString(i), value: i}));
    }
    
    get EVENT_BUS_SOURCES_MENU() {
        return [
            {
                text: 'MICROBIT_ID_BUTTON_A',
                value: MicrobitRadioEventBusSource.MICROBIT_ID_BUTTON_A
            },
            {
                text: 'MICROBIT_ID_BUTTON_B',
                value: MicrobitRadioEventBusSource.MICROBIT_ID_BUTTON_B
            },
            {
                text: 'MICROBIT_ID_BUTTON_AB',
                value: MicrobitRadioEventBusSource.MICROBIT_ID_BUTTON_AB
            },
            {
                text: 'MICROBIT_ID_RADIO',
                value: MicrobitRadioEventBusSource.MICROBIT_ID_RADIO
            },
            {
                text: 'MICROBIT_ID_GESTURE',
                value: MicrobitRadioEventBusSource.MICROBIT_ID_GESTURE
            },
            {
                text: 'MICROBIT_ID_ACCELEROMETER',
                value: MicrobitRadioEventBusSource.MICROBIT_ID_ACCELEROMETER
            },
            {
                text: 'MICROBIT_ID_IO_P0',
                value: MicrobitRadioEventBusSource.MICROBIT_ID_IO_P0
            },
            {
                text: 'MICROBIT_ID_IO_P1',
                value: MicrobitRadioEventBusSource.MICROBIT_ID_IO_P1
            },
            {
                text: 'MICROBIT_ID_IO_P2',
                value: MicrobitRadioEventBusSource.MICROBIT_ID_IO_P2
            },
            {
                text: 'MICROBIT_ID_IO_P3',
                value: MicrobitRadioEventBusSource.MICROBIT_ID_IO_P3
            },
            {
                text: 'MICROBIT_ID_IO_P4',
                value: MicrobitRadioEventBusSource.MICROBIT_ID_IO_P4
            },
            {
                text: 'MICROBIT_ID_IO_P5',
                value: MicrobitRadioEventBusSource.MICROBIT_ID_IO_P5
            },
            {
                text: 'MICROBIT_ID_IO_P6',
                value: MicrobitRadioEventBusSource.MICROBIT_ID_IO_P6
            },
            {
                text: 'MICROBIT_ID_IO_P7',
                value: MicrobitRadioEventBusSource.MICROBIT_ID_IO_P7
            },
            {
                text: 'MICROBIT_ID_IO_P8',
                value: MicrobitRadioEventBusSource.MICROBIT_ID_IO_P8
            },
            {
                text: 'MICROBIT_ID_IO_P9',
                value: MicrobitRadioEventBusSource.MICROBIT_ID_IO_P9
            },
            {
                text: 'MICROBIT_ID_IO_P10',
                value: MicrobitRadioEventBusSource.MICROBIT_ID_IO_P10
            },
            {
                text: 'MICROBIT_ID_IO_P11',
                value: MicrobitRadioEventBusSource.MICROBIT_ID_IO_P11
            },
            {
                text: 'MICROBIT_ID_IO_P12',
                value: MicrobitRadioEventBusSource.MICROBIT_ID_IO_P12
            },
            {
                text: 'MICROBIT_ID_IO_P13',
                value: MicrobitRadioEventBusSource.MICROBIT_ID_IO_P13
            },
            {
                text: 'MICROBIT_ID_IO_P14',
                value: MicrobitRadioEventBusSource.MICROBIT_ID_IO_P14
            },
            {
                text: 'MICROBIT_ID_IO_P15',
                value: MicrobitRadioEventBusSource.MICROBIT_ID_IO_P15
            },
            {
                text: 'MICROBIT_ID_IO_P16',
                value: MicrobitRadioEventBusSource.MICROBIT_ID_IO_P16
            },
            {
                text: 'MICROBIT_ID_IO_P19',
                value: MicrobitRadioEventBusSource.MICROBIT_ID_IO_P19
            },
            {
                text: 'MICROBIT_ID_IO_P20',
                value: MicrobitRadioEventBusSource.MICROBIT_ID_IO_P20
            },
            {
                text: 'MES_DEVICE_INFO_ID',
                value: MicrobitRadioEventBusSource.MES_DEVICE_INFO_ID
            },
            {
                text: 'MES_SIGNAL_STRENGTH_ID',
                value: MicrobitRadioEventBusSource.MES_SIGNAL_STRENGTH_ID
            },
            {
                text: 'MES_DPAD_CONTROLLER_ID',
                value: MicrobitRadioEventBusSource.MES_DPAD_CONTROLLER_ID
            },
            {
                text: 'MES_BROADCAST_GENERAL_ID',
                value: MicrobitRadioEventBusSource.MES_BROADCAST_GENERAL_ID
            },
        ];
    }

    get EVENT_BUS_VALUES_MENU() {
        return [
            {
                text: 'MICROBIT_EVT_ANY = 0',
                value: MicrobitRadioEventBusSource.MICROBIT_EVT_ANY
            },
            {
                text: 'MICROBIT_BUTTON_EVT_CLICK',
                value: MicrobitRadioEventBusSource.MICROBIT_BUTTON_EVT_CLICK
            },
            {
                text: 'MICROBIT_RADIO_EVT_DATAGRAM',
                value: MicrobitRadioEventBusSource.MICROBIT_RADIO_EVT_DATAGRAM
            },
            {
                text: 'MICROBIT_ACCELEROMETER_EVT_DATA_UPDATE',
                value: MicrobitRadioEventBusSource.MICROBIT_ACCELEROMETER_EVT_DATA_UPDATE
            },
            {
                text: 'MICROBIT_PIN_EVT_RISE',
                value: MicrobitRadioEventBusSource.MICROBIT_PIN_EVT_RISE
            },
            {
                text: 'MICROBIT_PIN_EVT_FALL',
                value: MicrobitRadioEventBusSource.MICROBIT_PIN_EVT_FALL
            },
            {
                text: 'MICROBIT_PIN_EVT_PULSE_HI',
                value: MicrobitRadioEventBusSource.MICROBIT_PIN_EVT_PULSE_HI
            },
            {
                text: 'MICROBIT_PIN_EVT_PULSE_LO',
                value: MicrobitRadioEventBusSource.MICROBIT_PIN_EVT_PULSE_LO
            },
            {
                text: 'MES_ALERT_EVT_ALARM1',
                value: MicrobitRadioEventBusSource.MES_ALERT_EVT_ALARM1
            },
            {
                text: 'MES_ALERT_EVT_ALARM2',
                value: MicrobitRadioEventBusSource.MES_ALERT_EVT_ALARM2
            },
            {
                text: 'MES_ALERT_EVT_ALARM3',
                value: MicrobitRadioEventBusSource.MES_ALERT_EVT_ALARM3
            },
            {
                text: 'MES_ALERT_EVT_ALARM4',
                value: MicrobitRadioEventBusSource.MES_ALERT_EVT_ALARM4
            },
            {
                text: 'MES_ALERT_EVT_ALARM5',
                value: MicrobitRadioEventBusSource.MES_ALERT_EVT_ALARM5
            },
            {
                text: 'MES_ALERT_EVT_ALARM6',
                value: MicrobitRadioEventBusSource.MES_ALERT_EVT_ALARM6
            },
            {
                text: 'MES_ALERT_EVT_DISPLAY_TOAST',
                value: MicrobitRadioEventBusSource.MES_ALERT_EVT_DISPLAY_TOAST
            },
            {
                text: 'MES_ALERT_EVT_FIND_MY_PHONE',
                value: MicrobitRadioEventBusSource.MES_ALERT_EVT_FIND_MY_PHONE
            },
            {
                text: 'MES_ALERT_EVT_PLAY_RINGTONE',
                value: MicrobitRadioEventBusSource.MES_ALERT_EVT_PLAY_RINGTONE
            },
            {
                text: 'MES_ALERT_EVT_PLAY_SOUND',
                value: MicrobitRadioEventBusSource.MES_ALERT_EVT_PLAY_SOUND
            },
            {
                text: 'MES_ALERT_EVT_VIBRATE',
                value: MicrobitRadioEventBusSource.MES_ALERT_EVT_VIBRATE
            },
            {
                text: 'MES_CAMERA_EVT_LAUNCH_PHOTO_MODE',
                value: MicrobitRadioEventBusSource.MES_CAMERA_EVT_LAUNCH_PHOTO_MODE
            },
            {
                text: 'MES_CAMERA_EVT_LAUNCH_VIDEO_MODE',
                value: MicrobitRadioEventBusSource.MES_CAMERA_EVT_LAUNCH_VIDEO_MODE
            },
            {
                text: 'MES_CAMERA_EVT_START_VIDEO_CAPTURE',
                value: MicrobitRadioEventBusSource.MES_CAMERA_EVT_START_VIDEO_CAPTURE
            },
            {
                text: 'MES_CAMERA_EVT_STOP_PHOTO_MODE',
                value: MicrobitRadioEventBusSource.MES_CAMERA_EVT_STOP_PHOTO_MODE
            },
            {
                text: 'MES_CAMERA_EVT_STOP_VIDEO_CAPTURE',
                value: MicrobitRadioEventBusSource.MES_CAMERA_EVT_STOP_VIDEO_CAPTURE
            },
            {
                text: 'MES_CAMERA_EVT_STOP_VIDEO_MODE',
                value: MicrobitRadioEventBusSource.MES_CAMERA_EVT_STOP_VIDEO_MODE
            },
            {
                text: 'MES_CAMERA_EVT_TAKE_PHOTO',
                value: MicrobitRadioEventBusSource.MES_CAMERA_EVT_TAKE_PHOTO
            },
            {
                text: 'MES_CAMERA_EVT_TOGGLE_FRONT_REAR',
                value: MicrobitRadioEventBusSource.MES_CAMERA_EVT_TOGGLE_FRONT_REAR
            },
            {
                text: 'MES_DEVICE_DISPLAY_OFF',
                value: MicrobitRadioEventBusSource.MES_DEVICE_DISPLAY_OFF
            },
            {
                text: 'MES_DEVICE_DISPLAY_ON',
                value: MicrobitRadioEventBusSource.MES_DEVICE_DISPLAY_ON
            },
            {
                text: 'MES_DEVICE_GESTURE_DEVICE_SHAKEN',
                value: MicrobitRadioEventBusSource.MES_DEVICE_GESTURE_DEVICE_SHAKEN
            },
            {
                text: 'MES_DEVICE_INCOMING_CALL',
                value: MicrobitRadioEventBusSource.MES_DEVICE_INCOMING_CALL
            },
            {
                text: 'MES_DEVICE_INCOMING_MESSAGE',
                value: MicrobitRadioEventBusSource.MES_DEVICE_INCOMING_MESSAGE
            },
            {
                text: 'MES_DEVICE_ORIENTATION_LANDSCAPE',
                value: MicrobitRadioEventBusSource.MES_DEVICE_ORIENTATION_LANDSCAPE
            },
            {
                text: 'MES_DEVICE_ORIENTATION_PORTRAIT',
                value: MicrobitRadioEventBusSource.MES_DEVICE_ORIENTATION_PORTRAIT
            },
            {
                text: 'MES_DPAD_BUTTON_1_DOWN',
                value: MicrobitRadioEventBusSource.MES_DPAD_BUTTON_1_DOWN
            },
            {
                text: 'MES_DPAD_BUTTON_1_UP',
                value: MicrobitRadioEventBusSource.MES_DPAD_BUTTON_1_UP
            },
            {
                text: 'MES_DPAD_BUTTON_2_DOWN',
                value: MicrobitRadioEventBusSource.MES_DPAD_BUTTON_2_DOWN
            },
            {
                text: 'MES_DPAD_BUTTON_2_UP',
                value: MicrobitRadioEventBusSource.MES_DPAD_BUTTON_2_UP
            },
            {
                text: 'MES_DPAD_BUTTON_3_DOWN',
                value: MicrobitRadioEventBusSource.MES_DPAD_BUTTON_3_DOWN
            },
            {
                text: 'MES_DPAD_BUTTON_3_UP',
                value: MicrobitRadioEventBusSource.MES_DPAD_BUTTON_3_UP
            },
            {
                text: 'MES_DPAD_BUTTON_4_DOWN',
                value: MicrobitRadioEventBusSource.MES_DPAD_BUTTON_4_DOWN
            },
            {
                text: 'MES_DPAD_BUTTON_4_UP',
                value: MicrobitRadioEventBusSource.MES_DPAD_BUTTON_4_UP
            },
            {
                text: 'MES_DPAD_BUTTON_A_DOWN',
                value: MicrobitRadioEventBusSource.MES_DPAD_BUTTON_A_DOWN
            },
            {
                text: 'MES_DPAD_BUTTON_A_UP',
                value: MicrobitRadioEventBusSource.MES_DPAD_BUTTON_A_UP
            },
            {
                text: 'MES_DPAD_BUTTON_B_DOWN',
                value: MicrobitRadioEventBusSource.MES_DPAD_BUTTON_B_DOWN
            },
            {
                text: 'MES_DPAD_BUTTON_B_UP',
                value: MicrobitRadioEventBusSource.MES_DPAD_BUTTON_B_UP
            },
            {
                text: 'MES_DPAD_BUTTON_C_DOWN',
                value: MicrobitRadioEventBusSource.MES_DPAD_BUTTON_C_DOWN
            },
            {
                text: 'MES_DPAD_BUTTON_C_UP',
                value: MicrobitRadioEventBusSource.MES_DPAD_BUTTON_C_UP
            },
            {
                text: 'MES_DPAD_BUTTON_D_DOWN',
                value: MicrobitRadioEventBusSource.MES_DPAD_BUTTON_D_DOWN
            },
            {
                text: 'MES_DPAD_BUTTON_D_UP',
                value: MicrobitRadioEventBusSource.MES_DPAD_BUTTON_D_UP
            },
            {
                text: 'MES_REMOTE_CONTROL_EVT_FORWARD',
                value: MicrobitRadioEventBusSource.MES_REMOTE_CONTROL_EVT_FORWARD
            },
            {
                text: 'MES_REMOTE_CONTROL_EVT_NEXTTRACK',
                value: MicrobitRadioEventBusSource.MES_REMOTE_CONTROL_EVT_NEXTTRACK
            },
            {
                text: 'MES_REMOTE_CONTROL_EVT_PAUSE',
                value: MicrobitRadioEventBusSource.MES_REMOTE_CONTROL_EVT_PAUSE
            },
            {
                text: 'MES_REMOTE_CONTROL_EVT_PLAY',
                value: MicrobitRadioEventBusSource.MES_REMOTE_CONTROL_EVT_PLAY
            },
            {
                text: 'MES_REMOTE_CONTROL_EVT_PREVTRACK',
                value: MicrobitRadioEventBusSource.MES_REMOTE_CONTROL_EVT_PREVTRACK
            },
            {
                text: 'MES_REMOTE_CONTROL_EVT_REWIND',
                value: MicrobitRadioEventBusSource.MES_REMOTE_CONTROL_EVT_REWIND
            },
            {
                text: 'MES_REMOTE_CONTROL_EVT_STOP',
                value: MicrobitRadioEventBusSource.MES_REMOTE_CONTROL_EVT_STOP
            },
            {
                text: 'MES_REMOTE_CONTROL_EVT_VOLUMEDOWN',
                value: MicrobitRadioEventBusSource.MES_REMOTE_CONTROL_EVT_VOLUMEDOWN
            },
            {
                text: 'MES_REMOTE_CONTROL_EVT_VOLUMEUP',
                value: MicrobitRadioEventBusSource.MES_REMOTE_CONTROL_EVT_VOLUMEUP
            },
        ];
    }

    constructor(runtime) {
        this.runtime = runtime;
        this._peripheral = new MicroBitRadio(this.runtime, Scratch3MicroBitRadioBlocks.EXTENSION_ID);
    }

    getInfo() {
        return {
            id: Scratch3MicroBitRadioBlocks.EXTENSION_ID,
            name: Scratch3MicroBitRadioBlocks.EXTENSION_NAME,
            color1: '#E3008C',
            color2: '#C10077',
            menuIconURI: blockIconURI,
            blocks: [
                {
                    opcode: 'setFrequencyBand',
                    blockType: 'command',
                    text: 'set frequency band to [BAND_NUM]',
                    arguments: {
                        BAND_NUM: {
                            type: 'number',
                            menu: 'bandMenu',
                            defaultValue: '0'
                        },
                    }
                },
                {
                    opcode: 'setGroup',
                    blockType: 'command',
                    text: 'set group to [GROUP_NUM]',
                    arguments: {
                        GROUP_NUM: {
                            type: 'number',
                            menu: 'groupNumMenu',
                            defaultValue: '0',
                        },
                    }
                },
                {
                    opcode: 'setTransmitPower',
                    blockType: 'command',
                    text: 'set transmit power to [POWER_NUM]',
                    arguments: {
                        POWER_NUM: {
                            type: 'number',
                            menu: 'transmitPowerMenu',
                            defaultValue: '6'
                        },
                    }
                },
                {
                    opcode: 'setTransmitSerialNumber',
                    blockType: 'command',
                    text: 'transmit serial number [TRANSMIT]',
                    arguments: {
                        TRANSMIT: {
                            type: 'string',
                            menu: 'transmitSerialNumberMenu',
                            default: MicrobitRadioTransmitSerialNumber.NO
                        },
                    }
                },
                '---',
                {   opcode: 'sendEvent',
                    blockType: 'command',
                    text: 'send event from source [SOURCE] with value [VALUE]',
                    arguments: {
                        SOURCE: {
                            type: 'number',
                            menu: 'eventBusSourceMenu',
                            default: MicrobitRadioEventBusSource.MICROBIT_ID_BUTTON_A
                        },
                        VALUE: {
                            type: 'number',
                            menu: 'eventBusValueMenu',
                            default: MicrobitRadioEventBusValue.MICROBIT_EVT_ANY
                        }
                    }
                },
                {
                    opcode: 'sendNumber',
                    blockType: 'command',
                    text: 'send number [NUMBER]',
                    arguments: {
                        NUMBER: {
                            type: 'number',
                            defaultValue: "0"
                        },
                    }
                },
                {
                    opcode: 'sendString',
                    blockType: 'command',
                    text: 'send string [STRING]',
                    arguments: {
                        STRING: {
                            type: 'string',
                            defaultValue: ' '
                        },
                    }
                },
                {
                    opcode: 'sendValuePair',
                    blockType: 'command',
                    text: 'send value pair [STRING] = [NUMBER]',
                    arguments: {
                        STRING: {
                            type: 'string',
                            defaultValue: ' '
                        },
                        NUMBER: {
                            type: 'number',
                            defaultValue: '0'
                        },
                    }
                },
                '---',
                {
                    opcode: 'whenNumberReceived',
                    blockType: 'hat',
                    text: 'when number received',
                },
                {
                    opcode: 'whenStringReceived',
                    blockType: 'hat',
                    text: 'when string received',
                },
                {
                    opcode: 'whenValuePairReceived',
                    blockType: 'hat',
                    text: 'when value pair received',
                },
                '---',
                {
                    opcode: 'receivedNumber',
                    blockType: 'reporter',
                    text: 'received number',
                },
                {
                    opcode: 'receivedString',
                    blockType: 'reporter',
                    text: 'received string',
                },
                {
                    opcode: 'receivedSerialNumber',
                    blockType: 'reporter',
                    text: 'received serial number',
                },
                {
                    opcode: 'receivedSignalStrength',
                    blockType: 'reporter',
                    text: 'received signal strength',
                },
                {
                    opcode: 'receivedTime',
                    blockType: 'reporter',
                    text: 'received time',
                },
            ],
            menus: {
                groupNumMenu: {
                    acceptReporters: true,
                    items: this.GROUP_NUMS_MENU,
                },
                transmitPowerMenu: {
                    acceptReporters: true,
                    items: this.TRANSMIT_POWERS_MENU
                },
                transmitSerialNumberMenu: {
                    acceptReporters: true,
                    items: this.TRANSMIT_SERIAL_NUMBER_MENU
                },
                bandMenu: {
                    acceptReporters: true,
                    items: this.BANDS_MENU
                },
                eventBusSourceMenu: {
                    acceptReporters: true,
                    items: this.EVENT_BUS_SOURCES_MENU
                },
                eventBusValueMenu: {
                    acceptReporters: true,
                    items: this.EVENT_BUS_VALUES_MENU
                }
            },
        };
    }

    setFrequencyBand({BAND_NUM}) {
        this._peripheral.send(SendCommands.SETFREQUENCYBAND, BAND_NUM);

        return new Promise(resolve => {
            setTimeout(() => {
                resolve();
            }, radioSendInterval);
        });
    }

    setGroup({GROUP_NUM}) {
        this._peripheral.send(SendCommands.SETGROUP, GROUP_NUM);

        return new Promise(resolve => {
            setTimeout(() => {
                resolve();
            }, radioSendInterval);
        });
    }

    setTransmitPower({POWER_NUM}) {
        this._peripheral.send(SendCommands.SETTRANSMITPOWER, POWER_NUM);

        return new Promise(resolve => {
            setTimeout(() => {
                resolve();
            }, radioSendInterval);
        });
    }

    setTransmitSerialNumber({TRANSMIT}) {
        console.log(TRANSMIT);
        this._peripheral.send(SendCommands.SETTRANSMITSERIALNUMBER, TRANSMIT);

        return new Promise(resolve => {
            setTimeout(() => {
                resolve();
            }, radioSendInterval);
        });
    }

    sendEvent({SOURCE, VALUE}) {
        this._peripheral.send(SendCommands.SENDEVENT, SOURCE, VALUE);

        return new Promise(resolve => {
            setTimeout(() => {
                resolve();
            }, radioSendInterval);
        });
    }
    
    sendNumber({NUMBER}) {
        this._peripheral.send(SendCommands.SENDNUMBER, NUMBER);

        return new Promise(resolve => {
            setTimeout(() => {
                resolve();
            }, radioSendInterval);
        });
    }
    
    sendString({STRING}) {
        this._peripheral.send(SendCommands.SENDSTRING, STRING);

        return new Promise(resolve => {
            setTimeout(() => {
                resolve();
            }, radioSendInterval);
        });
    }

    sendValuePair({STRING, NUMBER}) {
        this._peripheral.send(SendCommands.SENDVALUEPAIR, STRING, NUMBER);

        return new Promise(resolve => {
            setTimeout(() => {
                resolve();
            }, radioSendInterval);
        });
    }

    whenNumberReceived() {
        if (this._peripheral._receivedNumbers.length > 0) {
            this._receivedData = this._peripheral._receivedNumbers.shift();
            return true;
        } else {
            return false;
        }
    }

    whenStringReceived() {
        if (this._peripheral._receivedStrings.length > 0) {
            this._receivedData = this._peripheral._receivedStrings.shift();
            return true;
        } else {
            return false;
        }
    }

    whenValuePairReceived() {
        if (this._peripheral._receivedValuePairs.length > 0) {
            this._receivedData = this._peripheral._receivedValuePairs.shift();
            return true;
        } else {
            return false;
        }
    }

    receivedNumber() {
        return this._receivedData.number;
    }

    receivedString() {
        return this._receivedData.string;
    }

    receivedSerialNumber() {
        return this._receivedData.serialNumber;
    }

    receivedSignalStrength() {
        return this._receivedData.signalStrength;
    }

    receivedTime() {
        return this._receivedData.time;
    }
}

module.exports = Scratch3MicroBitRadioBlocks;
