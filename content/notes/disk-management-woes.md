+++
title = "Disk management woes"
date = 2025-06-30T20:01:25Z
tags = ["GNOME", "GParted", "Windows"]
+++

GNOME does not have support to move partitions around.

GParted requires the presence of `ntfs3g` on `$PATH` to enable NTFS support.

When moving Windows installations across disks the reason why stuff doesn't boot is that the Windows EFI for the old disk is sitting around in your `/boot` partition so the `systemd-boot` option I pick tries to boot into a non-existent installation. The fix for this is to go and delete the `Microsoft` folder from `/boot/EFI` and replace it with the one in your new disk and it'll be fixed.

To extend an NTFS partition in Windows just use the good old `diskmgmt.msc` and it can just extend it while the disk is online!

To move the Windows recovery partition around, run `reagentc /disable` to disable the recovery agent, then go into GParted to move the partition to the end and then boot back into #Windows. Do the necessary partition changes then run `reagentc /enable` to enable it.
