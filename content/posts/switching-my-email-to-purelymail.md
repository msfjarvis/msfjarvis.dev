+++
categories = ["email"]
date = 2020-04-13T17:12:27+05:30
draft = true
slug = "switching-my-email-to-purelymail"
tags = ["email", "purelymail"]
title = "Switching my email to Purelymail"
description = "I recently moved from forwarding my email through Google to hosting it through Purelymail.com. Here are some thoughts about the process and motivation"
+++

Email is a very crucial part of my workflow, and I enjoy using it (and also why I'm beyond excited for what Basecamp has in store with [hey.com](https://hey.com)). I have switched emails a couple times over the many years I have had an internet presence, finally settling on {{< cloakemail "me@msfjarvis.dev" >}} when I bought my domain. There began the problem.

I attempt to self-host things when reasonable, to retain some control and not have a single point of failure outside my control that would lock me out. With email, that part is a constant, uphill battle against spam filters to ensure your domain doesn't land in a big filter list that will then start trashing all your email and make life hard. Due to this, I never self-hosted email, instead choosing to forward it through Google Domains (the registrar for this domain) to my existing Google account. While this is a very reliable approach, it still involves depending heavily on my Google account. This has proven to be a problem in many ways, including [being locked out after opting into Advanced Protection](https://twitter.com/MSF_Jarvis/status/1217534500550234112) and people's accounts being banned for a number of reasons completely unrelated to email. If something like this were to happen to me, I would lose both my Google as well as my domain email instantly. A very scary position to be in for anybody.

A couple days ago, [Jake Wharton](https://twitter.com/JakeWharton) retweeted a blog post from [Roland Szabo](https://twitter.com/rolisz) titled ['Moving away from GMail'](https://rolisz.ro/2020/04/11/moving-away-from-gmail/). I read through it, looked at PurelyMail, and was convinced that it was really the solution for my little problem. I am a big believer in paying in dollaroos rather than data so I really loved the transparency behind pricing, data use, infrastructure and just about everything else. Signed up!

## Migration

Like any other email provider, all you need to configure for PurelyMail to work is DNS. I use Cloudflare for my sites, so there was nothing to do on the Google Domains side of things. I left the forwarding setup as-is to allow any lagging DNS resolvers to still be able to get email to me, even if its to my Google account. I hope to get rid of that setting in the near future since I believe the change will have propagated by then. I maintain my DNS settings under a git repository, using StackExchange's excellent [dnscontrol](http://stackexchange.github.io/dnscontrol/) tool. DNSControl operates on a JS-like syntax that is parsed, evaluated and then used to publish to the DNS provider of choice. Neat stuff! The changes required looked something like this:

```diff
diff --git dnsconfig.js dnsconfig.js
index 29b8d1a927ab..01ea2af1d448 100644
--- dnsconfig.js
+++ dnsconfig.js
@@ -6,7 +6,7 @@

 var REG_NONE = NewRegistrar('none', 'NONE');
 var DNS_CF = NewDnsProvider('cloudflare', 'CLOUDFLAREAPI');
+var CF_PROXY_OFF = {'cloudflare_proxy': 'off'};     // Proxy disabled.

@@ -18,25 +18,17 @@ var RECORDS = [
+    CNAME('_dmarc', '_dmarcroot.purelymail.com.', CF_PROXY_OFF),
+    CNAME('purelymail1._domainkey', 'key1._dkimroot.purelymail.com.', CF_PROXY_OFF),
+    CNAME('purelymail2._domainkey', 'key2._dkimroot.purelymail.com.', CF_PROXY_OFF),
+    CNAME('purelymail3._domainkey', 'key3._dkimroot.purelymail.com.', CF_PROXY_OFF),
-    MX('@', 10, 'alt1.gmr-smtp-in.l.google.com.', TTL('1d')),
-    MX('@', 20, 'alt2.gmr-smtp-in.l.google.com.', TTL('1d')),
-    MX('@', 30, 'alt3.gmr-smtp-in.l.google.com.', TTL('1d')),
-    MX('@', 40, 'alt4.gmr-smtp-in.l.google.com.', TTL('1d')),
-    MX('@', 5, 'gmr-smtp-in.l.google.com.', TTL('1d')),
-    TXT('@', 'v=spf1 include:_spf.google.com ~all', TTL('3600s')),
+    MX('@', 50, 'mailserver.purelymail.com.'),
+    TXT('@', 'v=spf1 include:_spf.purelymail.com ~all'),
+    TXT('@', 'purelymail_ownership_proof=**redacated**'),
 ];
```

The only 'unexpected' change I had to make was to disable Cloudflare's proxy feature for the CNAME records. Once that was done, PurelyMail was instantly able to verify all DNS records and I was in business.

## Pros and Cons of the switch

I've been on PurelyMail for about a day now and poked around enough to have a comprehensive idea of what's different from my usual GMail flow, so let's get into that.

### Pros

#### You pay for it

By now everybody must have realized a simple fact: If you're not paying, you're the product. I do not wish to be a product. Your hard-earned money is more likely to keep companies from being shady than your emails. PurelyMail is a one man operation, which makes it more trustworthy to me than Google's massive scale. Google does not care for a single user, PurelyMail will.

#### Transparency

PurelyMail tells you upfront about what they charge and how they arrive at that number. There is no contract period, and if you wish to have fine grained control over what you pay, you can use their advanced pricing section to calculate your costs based on your exact needs. The website is straightforward and to the point, there is no glossy advertising to obscure flaws, and their security practices are all [documented](https://purelymail.com/docs/security) on their site, front and center.

#### Failsafe

My GMail is tied to my Google account, which means anything that flags my Google account will bring down my ability to have email. This is a scary position to be in. Having my email separate from my Google account frees me from that looming danger.

#### Easy export

PurelyMail has a tool called [`mailPort`](https://purelymail.com/docs/mailPort) that lets you move email between PurelyMail and other providers. You can bring your entire mailbox to PurelyMail when switching to it, or back to wherever you go next should it not feel sufficient for your needs. No questions asked, and no bullshit. It just works.

#### No client lock-in

Because PurelyMail has no bells and whistles, you won't be penalized on the feature side of things if you use one client compared to another. Things stay consistent.

### Cons

#### You pay for it

I am in a fortunate position where I can pay for things solely based on principle, without having to worry *too* much. Not everybody is similarly blessed, or you may simply have technical issues with being able to pay online for internet things. Stripe and PayPal are not available globally, and fees are often insane. I completely understand.

#### Roundcube is great, but it ain't no GMail

PurelyMail uses the Roundcube frontend for its webmail offering, with a couple extra themes. It's not the prettiest, and does not have a lot of bells and whistles that you might get accustomed to from GMail. The change is a bit rough honestly, but the pros certainly outweigh the cons. On the bright side, its easier to influence product direction at PurelyMail, so get on the issue tracker and request or vote for features!

#### No dedicated client

Not having a specialized client unfortunately also means that you'll have to shop around for what works. I still use the GMail mobile app, but K-9 Mail is also pretty decent.

## Conclusion

I have begun moving my various accounts to my domain mail as and when they remind me of their existence (55 left still, if my [pass](https://passwordstore.org/) repository is to be believed), and hope to eventually be able to get by without the pinned GMail tab in my browser :)

PurelyMail has proven to be an excellent platform so far. Support has been swift and helpful, and I haven't had any bad surprises. I hope to be a content user for as long as I possibly can :)
