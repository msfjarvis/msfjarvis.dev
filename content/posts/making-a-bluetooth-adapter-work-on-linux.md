+++
categories = ["linux"]
date = 2020-07-17
description = "Getting a USB Bluetooth dongle to function properly on Linux proved to be somewhat of a trip, which I'm documenting here."
draft = true
slug = "making-a-bluetooth-adapter-work-on-linux"
tags = ["bluetooth", "linux", "bt-audio"]
title = "Making a Bluetooth adapter work on Linux"
+++

I made a couple of purchases yesterday, including a Bluetooth speaker and a USB Bluetooth dongle to pair it to my computer. Now here's a couple things that you need to know about said computer:

-   It runs Linux
-   It runs a customized build of the Zen kernel with a very slimmed down config
-   It has never had Bluetooth connectivity before

Thanks to this combination of factors, things got weird. I tried a bunch of things before getting it working, so it is entirely possible that I miss some steps that were important but I didn't think so while writing this. Please let me know on [Twitter](https://twitter.com/MSF_Jarvis) if these steps didn't work for you and I'll try to fix this post.

### Getting the right packages

You're gonna need 1) a GUI to handle BT devices, b) the PulseAudio module for Bluetooth. For the GUI I used [blueberry](http://packages.linuxmint.com/search.php?release=ulyana&section=main&keyword=blueberry), and [pulseaudio-module-bluetooth](https://packages.ubuntu.com/focal/pulseaudio-module-bluetooth) for PulseAudio support.

I did `apt install -y blueberry pulseaudio-module-bluetooth` to get these on Linux Mint, you can do whatever your distro's preferred package handling method is.

### Fixing up the kernel (optional)

I mentioned earlier that I run a very slimmed down config, which means nothing that I didn't already use was enabled. This included Bluetooth, so I went ahead and enabled all the configs for it [here](https://msfjarvis.dev/g/linux/992c2d8bce8b). If everything works out, your dmesg should contain these lines

```shell
$ dmesg | rg Bluetooth
[    0.146115] Bluetooth: Core ver 2.22
[    0.146118] Bluetooth: HCI device and connection manager initialized
[    0.146119] Bluetooth: HCI socket layer initialized
[    0.146119] Bluetooth: L2CAP socket layer initialized
[    0.146120] Bluetooth: SCO socket layer initialized
[    0.325395] Bluetooth: HCI UART driver ver 2.3
[    0.327116] Bluetooth: RFCOMM socket layer initialized
[    0.327117] Bluetooth: RFCOMM ver 1.11
[    0.327117] Bluetooth: BNEP (Ethernet Emulation) ver 1.3
[    0.327119] Bluetooth: BNEP socket layer initialized
[    0.327119] Bluetooth: HIDP (Human Interface Emulation) ver 1.2
[    0.327120] Bluetooth: HIDP socket layer initialized
```

If you run your distro's kernel, you shouldn't need to make any changes.

### Wrapping up

If you're not a relatively up-to-date distro, you might need to make some more manual adjustments before everything works. Open up `/etc/pulse/default.pa` in any editor with root access (so you can write your changes back), then look for `module-bluetooth-discover`. In my version of the file, I have this:

```pa
.ifexists module-bluetooth-discover.so
load-module module-bluetooth-discover
.endif
```

It means that if the module is discovered, it will be loaded. On older versions this might just be `# load-module module-bluetooth-discover`. In that case, uncomment the line.

Next, open up `/usr/bin/start-pulseaudio-x11` in the same way. Look for this:

```bash
    if [ x"$SESSION_MANAGER" != x ] ; then
        /usr/bin/pactl load-module module-x11-xsmp "display=$DISPLAY xauthority=$XAUTHORITY session_manager=$SESSION_MANAGER" > /dev/null
    fi
```

Below it, add `/usr/bin/pactl load-module module-bluetooth-discover` so the final result looks like this:

```bash
    if [ x"$SESSION_MANAGER" != x ] ; then
        /usr/bin/pactl load-module module-x11-xsmp "display=$DISPLAY xauthority=$XAUTHORITY session_manager=$SESSION_MANAGER" > /dev/null
    fi
    /usr/bin/pactl load-module module-bluetooth-discover
```

This will manually load the module when X11 triggers PulseAudio init. This is more a hail mary, and if you want, you can test without it but it won't hurt to add it anyway.

Once done, reboot your computer and you should be able to pair and connect to devices and play audio through them.
