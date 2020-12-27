+++
categories = ["android"]
date = 2019-06-08
description = "SELinux is not the easiest technology to navigate, and handling it in Android custom ROMs can be daunting to newcomers. This post breaks down the more complex aspects of it into easy to understand steps for people to follow along"
slug = "understanding-and-resolving-selinux-denials-on-android"
tags = ["android", "selinux", "linux"]
title = "Understanding and resolving SELinux denials on Android"
+++

This blog post is mostly comprised of what used to be a GitHub Gist. I decided it needs some additional reading on what exactly we're dealing with so a preface outlining what SELinux is and how to understand the rules we're writing has been added. The gist itself is from a time when I was far less knowledgeable and hence adjustments have been made accordingly, often with extra information.

### What is SELinux?

SELinux is an acronym for **Security-enhanced Linux**. It is a security feature built into the [Linux kernel](http://github.com/torvalds/linux/tree/master/security/selinux) that enforces access control for programs via a predefined security policy put in place by the system adminstrators.


Traditionally, access control on Linux has been done under the **Discretionary Access Control (DAC)** methodology. Under DAC, each process runs under a user and group. A process can access all files owned by it's user and/or group.

**SELinux** is an implementation of a **MAC** security mechanism. MAC stands for **Mandatory Access Control**, a paradigm that allows restricting multiple aspects of a process, such as:

- Pipes
- Files
- Network ports
- Sockets
- Directories
- Other processes

SELinux builds upon DAC-based restrictions to ensure a compromised user can still be prevented from doing potentially malicious things it normally wouldn't need to do.

### How to detect and resolve SELinux denials on Android

On Android, SELinux denials are written both into the kernel `dmesg` as well as the userspace `logcat` stream. Grab either, then filter for instances of `avc: denied`.

Here's a sample denial that we'll attempt to resolve.

```java
avc: denied { read write } for pid=29059 comm="i.tetherservice" name="ipa" dev="tmpfs" ino=11991
scontext=u:r:system_app:s0 tcontext=u:object_r:ipa_dev:s0 tclass=chr_file permissive=0
```

The policy rule to resolve it would look something like this:

```java
allow system_app ipa_dev:chr_file {read write};
```

How did I construct the rule?

First, you need to identify the process/device which attempted the action which raised the denial.

The [Gentoo wiki](https://wiki.gentoo.org/wiki/SELinux/Tutorials/Where_to_find_SELinux_permission_denial_details) has an amazing entry on how to understand an individual denial entry in the log, which I strongly recommend reading. The rest of this section will assume that you have read this page, because you really should have, or at the very least the ***Disecting the AVC denial*** section.

The source context is where this illegal access originated. In our case, it is **system_app**.

The target context and target class combined tell us what resource did the source context try to access before it was blocked. In our example, that'll be **ipa_dev:chr_file**.

Finally, the permission that was requested. In this example it is a set: **{read write}**. In most cases it will be just one permission, like **read**, **exec** or **write**.

Put this all together and you get the final sepolicy rule.

### Labelling in SELinux

To define new types for adding sepolicy exclusions, we use labelling.

For this example, let's assume we want to label the KCal sysfs nodes under the `sysfs_kcal` type.

KCal sysfs nodes are inside the `/sys/devices/platform/kcal_ctrl.0/` directory. To put them all under a single label, we use a simple regex. The type name should be added to `file_contexts` in your device tree's sepolicy folder. If it doesn't exist, create it with the following contents (append if the file exists).

```
/sys/devices/platform/kcal_ctrl.0(/.*)?              u:object_r:sysfs_kcal:s0
```

This line in `file_contexts` will label all files in the `/sys/devices/platform/kcal_ctrl.0/` directory as `sysfs_kcal`.

Next we open up the sepolicy file for the domain we want to grant access to the label. For this example, the domain is **system_app**, so we open **system_app.te**. As before, just create it if it doesn't exist.

```
type sysfs_kcal, fs_type, sysfs_type;
```

There, we can now add exclusions for `sysfs_kcal` treating it as a sysfs node as well as a filesystem item, like a folder or a file.

To be able to read or write to the sysfs node, we need to be able to find it first.
Then we need to grant `system_app` the ability to read and write from and to it.

```
allow system_app sysfs_kcal:dir search;
allow system_app sysfs_kcal:file rw_file_perms;
```

And that's it! Now all system apps can read from and write to all nodes in the `/sys/devices/platform/kcal_ctrl.0/`
directory.

### Additional reading

- [AOSP - Writing SELinux policy](https://source.android.com/security/selinux/device-policy)
- [RedHat - Understanding SELinux](https://access.redhat.com/documentation/en-US/Red_Hat_Enterprise_Linux/4/html/SELinux_Guide/selg-part-0057.html)
