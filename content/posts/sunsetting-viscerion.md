+++
categories = ["news"]
date = 2020-02-09T13:37:53+05:30
slug = "sunsetting-viscerion"
tags = ["personal"]
title = "Sunsetting Viscerion"
description = "The Viscerion experiment that started more than a year ago is now coming to an end. Here's what's happening."
socialImage = "uploads/viscerion_social.webp"
+++

Viscerion is one of my more known and loved apps that I myself continue to enjoy working on and using. The project started back in 2018 following a short stint with WireGuard working on their own Android app, and is now being shut down.

> TL;DR: The work I have been doing on Viscerion for the past year will become a part of the upstream WireGuard app over the next 6 months under an agreement between me and Jason Donenfeld, the WireGuard creator and lead developer.

## The story behind Viscerion

When I initially started this project, it was called WireGuard-KT, and as the dumb and literal name suggests, began with me rewriting the app into Kotlin. I was not a huge fan of Kotlin at that point in time, but was eager to learn and this was the perfect oppurtunity. My ambitions were rather too lofty for the upstream project at that time and they had to let me go from the internship position, presenting the option to pursue everything I had planned, in a personal capacity.

When I was working on the upstream app, I was seeding builds of my staging branches to a group of friends, who also became the first users/testers of WireGuard-KT. They encouraged me to publish the app to the Play Store which has since been unpublished over copyright concerns about the similarity of the name and resulted in the rebranding of the project as Viscerion.

## Fast-forwarding to today

Jason contacted me, extending an invitation to bring my work from Viscerion to upstream under a paid contract which would involve shutting down Viscerion since the reason why it was created in the first place was now void (consider this like Inbox and Gmail but an alternate universe where the most important features weren't being skipped over). After coming to a mutual agreement over what features and changes would be and what would be the process of deprecating Viscerion, I was officially hired and given full push access.

## What's going to happen with Viscerion

I have submitted a final [5.2.11](https://github.com/msfjarvis/viscerion/releases/latest) release to the [Play Store](https://play.google.com/store/apps/details?id=me.msfjarvis.viscerion), and the repository has been made read-only. The Play Store listing will be unpublished after 60 days and will only be available to existing users. Hearty thanks to every single user of Viscerion that has helped make this experiment a roaring success and to Jason for finally coming around :p
