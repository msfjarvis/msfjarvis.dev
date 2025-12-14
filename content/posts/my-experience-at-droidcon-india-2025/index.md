+++
title = "My experience at droidcon India 2025"
date = "2025-12-14T12:17:00+05:30"
lastmod = "2025-12-14T12:17:00+05:30"
summary = "I finally stepped out of my house! And met people! So cool!"
categories = [ "events" ]
tags = [ "droidcon", "dcIN25" ]
draft = false
+++
![My droidcon 2025 badge with my name, company and role.](/posts/my-experience-at-droidcon-india-2025/droidcon-2025-badge.webp "My droidcon 2025 badge")

I was at droidcon India [this Saturday](https://india.droidcon.com/agenda) and got the chance to meet a bunch of people I hadn't seen in a while and attend some really great talks. It was a great experience and definitely motivated me to come out for meetups and events a bit more and be less of a loner :P

Before I start walking through my day, I would like to extend an apology to my friends who accompanied me to the conference and the Android developer community at large. I might be the singular dumbass who would be at an event where both [Adit Lal](https://x.com/aditlal) and [Jitin Sharma](https://jitinsharma.com/) were speaking and plan an itinerary that included neither of their talks. I am extremely sorry and will never live this down.

We arrived at the [Conrad Bengaluru](https://www.hilton.com/en/hotels/blrkrci-conrad-bengaluru/) a little before 9 AM to an already bustling space and settled into the Fireside Chat with Google's DevRel Team. Lots of talk about AI as expected, but also the topic of passkeys and [Credential Manager](https://developer.android.com/identity/credential-manager) potentially doing away with the ridiculous OTP authentication flows used by banks here in India (🤞 one can hope).

After a short break we attended our first talk, [Suresh Maidaragi](https://www.linkedin.com/in/suresh-maidaragi/) speaking about Building Mobile Apps at Scale with Kotlin Multiplatform. It was a case study on their experience at Physics Wallah of unifying a lagging iOS app with their higher development velocity Android app via KMP. I was interested in learning some new things here as my work has involved a [Kotlin Multiplatform powered SDK](https://realtime.cloudflare.com/) for \~2 years now, but was left a little disappointed as the talk was rather shallow on technical details. I was rather ~~surprised~~ horrified to hear that their app takes _2 hours_ to build in their release CI with their current setup!

Another short break and then one of my highlights for the day: [Rahul Ravikumar](https://www.linkedin.com/in/rahulrav/)'s "A Busy Android App Developer's Guide to Perfetto". Inspired by [Lalit Maganti](https://lalitm.com/)'s recent writing I had been teaching myself how to use Perfetto to debug some performance issues at work, so this was perfect for me and the colleagues I had dragged along to the conference (I joke, they came willingly. I think). This talk was very information-dense, I learned a lot about navigating Perfetto and making sense of its seemingly endless UI components. We got a sneak peek at the in-development [Tracing 2.0](https://github.com/androidx/androidx/tree/c347e7ecf3ea6dcdb302ee0f641b6409a44c4f33/tracing/tracing) library and all the problems it's solving from Tracing 1. Especially exciting was [context propagation](https://github.com/androidx/androidx/tree/c347e7ecf3ea6dcdb302ee0f641b6409a44c4f33/tracing/tracing), which can connect parent coroutines to their children in the Perfetto UI allowing you to effectively trace multistep async operations.

The next talk I attended was [Himanshu Singh](https://www.linkedin.com/in/himanshoe/) speaking about "Building Android Open Source Libraries: Managing Public APIs with Intention". Another talk I found to be rather underwhelming, as the synopsis in the agenda made me assume this would carry a little more technical content than it ended up with. Himanshu mostly spoke about the social aspects of starting and managing open source projects in general before mentions of [Kotlin BCV](https://github.com/kotlin/binary-compatibility-validator) and release automation towards the end.

After the talk we had a lunch break, and I got to catch up with [Pratul Kalia](https://pratul.com/) who used to be my CTO at [Obvious](https://www.obvious.in/). He's now building [Tramline](https://tramline.app) to make mobile releases as streamlined as deploying to the web. I'm a happy solo user of the product, but am otherwise not paid to shill it here :P

We skipped the 1:30 PM to 2:00 PM time slot since and just hung out since none of the talks particularly appealed to our small group of 4.

At 2:00 PM we headed to [Sid Patil](https://www.linkedin.com/in/patilsid/) and [Rutvik Bhatt](https://www.linkedin.com/in/rutvikbhatt/)'s talk: "The Art of Re-architecture: Lessons from the Trenches at Foodpanda & Delivery Hero". As someone currently in the weeds of planning a re-architecture myself, their deep insights on how to evaluate the desired outcomes and engaging stakeholders of an engineering investment like this were very helpful. The mantra of "Refactor for today, Re-architect for tomorrow" was particularly inspiring as the resident refactorman of my team 👌

Next up was [Rajesh Hadiya](https://linkedin.com/in/hadiyarajesh) with "Build Kotlin Compiler Plugins for Production level Android Apps". Despite the extremely dense topic he did a great job at making it fun and approachable. I've tried to solve a logging-related problem earlier last year with a [Kotlin compiler plugin](https://github.com/msfjarvis/tracelog) so I was pretty familiar with the pain involved in dealing with the Kotlin IR and the various compiler backends. Rajesh was able to explain the compiler fundamentals that enable the various frontend/backend compiler plugins work the way they do in a succinct manner.

We skipped the 3:45 PM to 04:05 PM slot as well due to nothing particularly appealing to the group.

[Omkar Tenkale](https://www.linkedin.com/in/omkartenkale/)'s talk titled "Building the Coroutine Framework from Scratch" fully delivered on the premise. We started by talking about the distinctions between `kotlinx.coroutines` and `kotlin.coroutines`, then fully throwing away the former and just relying on the standard library + compiler intrinsics to rebuild the primitives we've come to rely on from `kotlinx.coroutines` such as `runBlocking`, `launch`, `Dispatchers` , `GlobalScope` and such. The talk was packed to the gills with low level details yet was very approachable and I left the room a lot more knowledgeable and appreciative of `kotlinx.coroutines`! Omkar's was easily my second favorite talk here after Rahul's Perfetto deep dive.

The last talk we attended was [Nikheel Vishwas Savant](https://www.linkedin.com/in/nikheel-savant/) from Meta talking about their experience building up a "Cross-Platform Bluetooth Architecture for Android, iOS, and Embedded Devices" for the Meta RayBan glasses. It was expected yet disappointing that we didn't see any code in this talk, but there were a lot of great nuggets of information that I expect to take back to my work on RealtimeKit.

And that was it for droidcon! By 5:30 PM we were all pretty exhausted so I bid my goodbyes to the people staying back and explored the nearby Church Street area with a couple of friends before heading home.

This was my first proper con-style event in a _long_ time (the last time I was at one was [Google Developer Days](https://developers.google.com/events/gdd-india/schedule/day1) back in 2017!) so I was somewhat nervous but it ended up being a great time. I missed a few people who were also there which was sad, but now that I'm in Bengaluru full time I hope to take more opportunities to show up at meetups and see people more than once every 3 years :)
