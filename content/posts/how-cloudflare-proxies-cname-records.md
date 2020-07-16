+++
categories = ["webdev"]
date = 2020-05-08
description = "Everybody probably understands how Cloudflare proxies A/AAAA records, but how it proxies CNAME records is also pretty interesting. Let's dive into how that happens and why it can often break other products that need you to set CNAME records."
slug = "how-cloudflare-proxies-cname-records"
socialImage = "uploads/cf_proxy_social.webp"
tags = ["#100DaysToOffload", "cloudflare"]
title = "How Cloudflare proxies CNAME records"
+++

As people who've read my previous post would know, I recently started using [Purelymail](https://purelymail.com/) for my email needs (the how and why of it can be found [here](/posts/switching-my-email-to-purelymail/)). I also mentioned there, that Cloudflare's proxy-by-default nature caused Purelymail to not detect my CNAME settings and disabling the proxy did the job. I contacted Purelymail's Scott about this and he eventually pushed a fix out that \*should\* have fixed it, but since he did not have a Cloudflare account, he couldn't verify this exact case.

Well, the fix didn't work.

This made me wonder, _why?_ I trust that Scott is more aware of what he's doing than I am so the fix must have been legitimate and that something is special about Cloudflare's handling of this. So I did some testing! (yes I still use [dnscontrol](https://stackexchange.github.io/dnscontrol/))

```diff
diff --git a/dnsconfig.js b/dnsconfig.js
index f5fd1836f8ec..a53bab70de84 100644
--- a/dnsconfig.js
+++ b/dnsconfig.js
@@ -24,6 +24,8 @@ var DEV_RECORDS = [
     CNAME('purelymail2._domainkey', 'key2._dkimroot.purelymail.com.', CF_PROXY_OFF),
     CNAME('purelymail3._domainkey', 'key3._dkimroot.purelymail.com.', CF_PROXY_OFF),
     CNAME('status', 'stats.uptimerobot.com.', CF_PROXY_OFF),
+    CNAME('test_domain_no_proxy', 'msfjarvis.github.io.', CF_PROXY_OFF),
+    CNAME('test_domain_with_proxy', 'msfjarvis.github.io.'),
     MX('@', 50, 'mailserver.purelymail.com.'),
     TXT('@', 'v=spf1 include:_spf.purelymail.com ~all'),
     TXT('@', 'purelymail_ownership_proof=0xd34db33f'),
```

Running [dig](https://linux.die.net/man/1/dig) on both the subdomains, I spotted something interesting.

```bash
$ dig @1.1.1.1 test_domain_no_proxy.msfjarvis.dev
...
;; ANSWER SECTION:
test_domain_no_proxy.msfjarvis.dev. 289	IN CNAME msfjarvis.github.io.
msfjarvis.github.io.	3589	IN	A	185.199.109.153
msfjarvis.github.io.	3589	IN	A	185.199.111.153
msfjarvis.github.io.	3589	IN	A	185.199.108.153
msfjarvis.github.io.	3589	IN	A	185.199.110.153
...
```

```bash
$ dig @1.1.1.1 test_domain_with_proxy.msfjarvis.dev
...
;; ANSWER SECTION:
test_domain_with_proxy.msfjarvis.dev. 300 IN A	104.28.14.93
test_domain_with_proxy.msfjarvis.dev. 300 IN A	104.28.15.93
...
```

The proxied CNAME record isn't actually a CNAME after all! Cloudflare creates an A record for it and handles the redirection internally. This makes the CNAME aspect of the record opaque to DNS lookups which in turn trips software like Purelymail's backend. I've reported my findings to Scott and am awaiting his response.

And that's it! Nothing too fancy, just something I found kinda weird.
