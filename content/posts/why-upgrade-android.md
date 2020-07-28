+++
categories = ["android"]
date = 2020-07-23
description = "(Mostly) everybody agrees that Android upgrades are good, but how very crucial they are to security and privacy often gets overlooked. Let's dig into that."
devLink = "https://dev.to/msfjarvis/why-upgrade-android-557f"
slug = "why-upgrade-android"
socialImage = "uploads/why_upgrade_android_social.webp"
tags = ["android", "updates", "security", "privacy"]
title = "Why upgrade Android?"
toc = true
+++

A couple days ago I tweeted this out, partly in response to a security conscious user who was quick to point out why a particular feature had to be added to APS, but failed to realise the fact that the problem wouldn't even exist if they were running the latest version of Android (we'll talk about the behavior change that fixed it later here).

{{< twitter 1285661151104323584 >}}

I completely stand by what I said, and for good reason. Android upgrades bring massive changes to the platform, improving security against both known and unknown threats. You sign off that benefit when you buy into an incompetent OEM's cheap phones, and it has become a bit too 'normal' than anybody would prefer.

That's not what we're going to talk about, though. This post is going to be purely about privacy, and how it has changed, nay, improved, over the years of Android. My apps support a minimum of Android 6, so I will begin with the next version, Android 7, and go through Google's release notes, singling out privacy related changes.

## Android 7

Android 7 had a very passing focus on privacy and thus did not have a lot of obvious or concrete changes around it. Background execution limits introduced in Android 6 were improved in Android 7 to apply even more restrictions after devices became stationary, which can be loosely interpreted as 'bad' for data exfiltration SDKs that apps ship but in reality didn't do much.

## Android 8

### Locking down background location access

In Android 8, access to background location was [severely throttled](https://developer.android.com/about/versions/oreo/android-8.0-changes#abll). Apps received less frequent updates for location and thus couldn't track you in real time.

### Introduction of Autofill

The Android Autofill framework was debuted, along with support for [Web form Autofill](https://developer.android.com/about/versions/oreo/android-8.0-changes#wfa). This paved the way for password managers to fill fields for you without relying on hacked up accessibility services or the Android clipboard. This was a major win!

### Better HTTPS defaults

Android 8.0's implementation of HttpsURLConnection did not perform [insecure TLS/SSL protocol version fallback](https://developer.android.com/about/versions/oreo/android-8.0-changes#networking-all), which means connections that failed to negotiate a requested TLS version would now abort rather than fall back to an older version of TLS.

### ANDROID_ID changes

Access to the `ANDROID_ID` field [was changed significantly](https://developer.android.com/about/versions/oreo/android-8.0-changes#privacy-all). It is generated per-app and per-signature as opposed to the entire system making it harder to fingerprint users who have multiple apps installed with the same advertising-related SDKs.

## Android 9

### Limited access to sensors

Beginning Android 9, [background access to device sensors](https://developer.android.com/about/versions/pie/android-9.0-changes-all#bg-sensor-access) was greatly reduced. Access to microphone and camera was completely denied, and so was the gyroscope, accelerometer and other sensors of that class.

### Granular call log access

For apps that need to access the user's call logs for any reason, a [new permission group was introduced](https://developer.android.com/about/versions/pie/android-9.0-changes-all#restrict-access-call-logs). Now, you don't require granting access to all phone-related permissions to let an app back up your call logs.

### Restricted access to phone numbers

There are multiple ways to monitor phone calls on Android, and with the introduction of the `CALL_LOG` permission group, [these were locked down](https://developer.android.com/about/versions/pie/android-9.0-changes-all#restrict-access-phone-numbers) to only expose phone numbers to apps that were allowed explicit access to call logs.

### Making Wi-Fi and cellular networks less privacy invasive

A combination of changes to [what permissions apps require](https://developer.android.com/about/versions/pie/android-9.0-changes-all#restricted_access_to_wi-fi_location_and_connection_information) to know about your WiFi and [how much personally identifiable data is provided by these APIs](https://developer.android.com/about/versions/pie/android-9.0-changes-all#information_removed_from_wi-fi_service_methods) further improves your privacy against rogue apps. Disabling device location [now disables the ability to get information on cell towers](https://developer.android.com/about/versions/pie/android-9.0-changes-all#telephony_information_now_relies_on_device_location_setting) your phone is connected to.

### No more serials

Requesting access to the device serial number [now requires phone state permissions](https://developer.android.com/about/versions/pie/android-9.0-changes-28#build-serial-deprecation) making it more explicit when apps are trying to fingerprint you.

## Android 10

### Scoped Storage

Probably the most controversial change in 10, Scoped Storage segregated the device storage into scopes and [gave apps access to them without needing extra permissions](https://developer.android.com/about/versions/10/privacy/changes#scoped-storage).

### Explicit background permission access

Android 10 introduces the `ACCESS_BACKGROUND_LOCATION` permission and [completely disables background access](https://developer.android.com/about/versions/10/privacy/changes#app-access-device-location) for apps targeting SDK 29 that don't declare it. For older apps, the framework treats granting location access as effectively background location access. When the app upgrades to target SDK 29, the background permission is revoked and must be explicitly requested again.

### Removal of contacts affinity

Beginning Android 10, the system no longer [keeps track of what contacts you interact with most](https://developer.android.com/about/versions/10/privacy/changes#contacts-affinity) and thus search results are not weighted anymore.

### MAC randomization enabled by default

Connecting to a Wi-FI network now uses a [randomized MAC address](https://developer.android.com/about/versions/10/privacy/changes#randomized-mac-addresses) to prevent fingerprinting.

### Removal of access to non-resettable identifiers

Access to identifiers such as IMEI and serial was [restricted to priviledged apps](https://developer.android.com/about/versions/10/privacy/changes#non-resettable-device-ids) which means apps served by the Play Store can no longer see them.

### Restriction on clipboard access

This is the problem we first talked about. Apps before Android 10 could monitor clipboard events and potentially exfil confidential data like passwords. [In Android 10 this was completely disabled](https://developer.android.com/about/versions/10/privacy/changes#clipboard-data) for apps that were not in foreground or not your active input method. This change was made with **no** compatibility changes, which means even older apps would not be able to access clipboard data out of turn.

### More WiFi and location improvements

Apps can no longer [toggle WiFi](https://developer.android.com/about/versions/10/privacy/changes#enable-disable-wifi) or [read a list of configured networks](https://developer.android.com/about/versions/10/privacy/changes#configure-wifi), and getting access to methods that expose device location requires the `ACCESS_FINE_LOCATION` permission to make it obvious that an app is doing it. The last change also affects telephony related APIs, a full list is available [here](https://developer.android.com/about/versions/10/privacy/changes#telephony-apis).

### Permissions controls

Apps no longer have [silent access to screen contents](https://developer.android.com/about/versions/10/privacy/changes#screen-contents), and the platform now prompts users [to disallow permissions for legacy apps](https://developer.android.com/about/versions/10/privacy/changes#user-permission-legacy-apps) that target Android 5.1 or below that would earlier be granted at install time. [Physical activity recognition](https://developer.android.com/about/versions/10/privacy/changes#physical-activity-recognition) is now given its own permission and common libraries for the purpose like Google's Play Services APIs will now send empty data when an app requests activity without the permissions.

## Android 11 (tentative)

### Storage changes

-   Apps targeting Android 11 are [no longer allowed to opt out of scoped storage](https://developer.android.com/preview/privacy/storage#scoped-storage).

-   All encompassing access to a large set of directories and files is [completely disabled](https://developer.android.com/preview/privacy/storage#file-directory-restrictions), including the root of the internal storage, the `Download` folder, and the data and obb subdirectories of the `Android` folder.

### Permission changes

-   Location, microphone and camera related permissions can now [be granted on a one-off basis](https://developer.android.com/preview/privacy/permissions#one-time), meaning they'll automatically get revoked when the app process exits.

-   Apps that are not used for a few months will [have their permissions automatically revoked](https://developer.android.com/preview/privacy/permissions#auto-reset).

-   A new `READ_PHONE_NUMBERS` permission [has been added](https://developer.android.com/preview/privacy/permissions#phone-numbers) to call certain APIs that expose phone numbers.

### Location changes

-   [One time access](https://developer.android.com/preview/privacy/location#one-time-access) is now an option for location, allowing users to not grant persistent access when they don't wish to.

-   Background location needs to [be requested separately now](https://developer.android.com/preview/privacy/location#background-location) and asking for it together with foreground location will throw an exception.

### Data access auditing

To allow apps to audit their own usage of user data, [a new callback is provided](https://developer.android.com/preview/privacy/data-access-auditing#log-access). Apps can implement it and then log all accesses to see if there's any unexpected data use that needs to be resolved.

### Redacted MAC addresses

Unpriviledged apps targetting SDK 30 will no longer be able to get the device's real MAC address.

# Closing notes

As you can tell, improving user privacy is a constant journey and Android is doing a better job of it with every new release. This makes it crucial that you stay up-to-date, either by buying phones from an OEM that delivers timely updates for a sufficiently long support period, or by using a trusted custom ROM like [GrapheneOS](https://grapheneos.org/) or [LineageOS](https://lineageos.org/).
