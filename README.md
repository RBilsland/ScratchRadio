# Scratch Radio
## Link To Scratch Radio

For those of you who want to dive straight in head first then here's the link to my version of Scratch that contains my Scratch Radio extension.

**[https://rbilsland.github.io/ScratchRadio/scratch/](https://rbilsland.github.io/ScratchRadio/scratch/)**

For everyone else please continue reading.

## Initial Idea
To bring the micro:bit's radio commands to Scratch to allow the two environments to communicate with each other.

## Hardware Design
The most straightforward, widely accessible and least problematic option was to use a micro:bit connected to the computer running scratch via a USB cable, acting as a gateway between the two environments.

![A diagram representing the Scratch environment being connected to a micro:bit over a USB cable](./images/Scratch_USB_microbit.png)

## Extension Design
Wanting to make the use of this as easy as possible I decided to use the browser WebUSB API to handle communications with the micro:bit. While this functionality currently isn't supported by all browser I thought that it being available in Chrome and Edge was enough. Hopefully this situation will improve over time, to see the current level of support within all browser visit [Can I Use, WebUSB](https://caniuse.com/webusb). Due to the browser handling everything the is **no need for anything to be locally installed** (very important when hardware is locked down and install rights limited).

The extension itself if made up of 3 layers, a base layer to handle communicating with the micro:bit, a middle layer that handles the sending and receiving of commands and the top layer that interfaces with Scratch.

The base layer is primarily built on a modified version of the [microbit-webusb library by Bill Siever](https://github.com/bsiever/microbit-webusb). I did start off coding this area myself but while investigating what I needed to do I came across this most useful library. At this point I decided not to re-invent any wheels and just tweaked the wheel slightly to better suit my requirements.

The middle layer deals with the formatting of commands to send and the decoding of commands received. As communications with the micro:bit are over a serial connection this just meant the sending and receiving of strings. The strings are field delimited using an ASCII character 30 hopefully meaning that it won't be included in a string and cause chaos. Commands sent are done so immediately but due to the way that Scratch deals with raising events received commands are placed in a queue for processing by Scratch.

The top layer is mainly taken up by the extensions block definition and then interfacing with the middle layer. As mentioned above commands sent are sent immediately but, when polled, the events check to see if there is anything queued and if so pulls the oldest off the queue, populates the received fields and raises the event. There is an additional heartbeat event that is raised by the gateway to show it is still there and working.

## Design
The gateways design is simple converting received radio commands into serial commands and visa versa. This allows the micro:bit's radio to act like it is directly connected to Scratch. On top of the standard radio commands / events there are a couple of additional functions. The first receives a request the check if the gateways is there and then responses appropriately while the second is a heartbeat message that is sent every five seconds to confirm it's still there and alive. I wrote this too in blocks to allow people to easier understand what is happening. The .hex file of this is linked to below.

![An image showing the block code that makes up the gateway](./images/microbit_Gateway_Blocks.png)

## Developing The Extension
Unfortunately I knew that I would not be able to include my extensions into the main Scratch site so I started looking into where and how was currently best. A big timesaver that I ended up using is the [scratch-extension-development GitHub template by Dale Lane](https://github.com/dalelane/scratch-extension-development) for creating Scratch extensions. He's taken all the legwork out of setting up an environment for development and where to host the final result. You code and test your extensions in GitHub codespaces before finally hosting it in GitHub pages. To make the process as easy as possible he provided scripts to automate all the setup / build / deploy tasks too.

## Running The Gateway
Make sure you have downloaded and then copied the [microbit-RadioGateway.hex](./hex/microbit-RadioGateway.hex?raw=True) (any issues downloading, right click and save / download) file to a micro:bit. Next make sure the micro:bit is connected to the computer using a USB cable. If you have just programmed it from MakeCode then unplug and then re-plug it back in to make sure it's ready for a new connection.

Next visit my version of scratch [https://rbilsland.github.io/ScratchRadio/scratch/](https://rbilsland.github.io/ScratchRadio/scratch/) using either Chrome or Edge and choose to add extension and chose my new extension. You'll be prompted to that you should select your gateway micro:bit, ok this and select your micro:bit. From this point you should be good to go.

## Running My Demo
To run my demo, download and then copy the [microbit-RadioDemo.hex](./hex/microbit-RadioDemo.hex?raw=True) (any issues downloading, right click and save / download) file to another micro:bit.

![micro:bit radio demo blocks](./images/microbit_Demo_Blocks.png)

Next download and then load into my version of Scratch the [Scratch-RadioDemo.sb3](./sb3/Scratch-RadioDemo.sb3?raw=True) (any issues downloading, right click and save / download). **REMEMBER TO HAVE YOUR GATEWAY MICRO:BIT CONNECTED WHEN DOING THIS**

![Scratch micro:bit radio demo blocks](./images/Scratch_Demo_Blocks.png)

If everything is working then clicking on Felix the cat should sent the message "Hello micro:bit" to the micro:bit and clicking button A on the micro:bit should send the message "Hello Felix" to Scratch.

If you do have issues with getting communication  between Scratch and the demo micro:bit then check the display of the gateway micro:bit. The top left pixel toggles when a command is received from Scratch, the top right pixel toggles when a command is received from a micro:bit and the centre pixel toggles when a heartbeat is sent.

![micro:bit status pixels](./images/microbit_Pixels.png)

If something isn't working then unplug / plug in the micro:bit, refresh the browser and reload Scratch-RadioDemo.sbs.

## Known Issues
Currently I'm aware that the whole connecting with the gateway micro:bit could be better so that's on my radar to address.

## Uses
As radio communications between Scratch and the micro:but gateway is two way, there are many things that could be done with this setup. For example:

* Using multiple micro:bits as quiz answer buttons. When a button is pressed then the persons name is send and shown on Scratch in the order they were received.
* Controlling a micro:bit robot from a Scratch interface. Sprites clicked and commands sent to the robot move it around.
* A 2 player Scratch game that is run on two computers. The two versions of Scratch using the radio communications to send player positions to each other.

*Robert Bilsland - 19 June 2024*