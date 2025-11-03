+++
title = "GPT-5 seems to forget things well within its context window"
date = "2025-11-03T16:32:00+05:30"
lastmod = "2025-11-03T16:32:00+05:30"
summary = "An instance of LLMs seemingly not being able to utilize their context window effectively"
tags = [ "LLMs", "AI" ]
draft = false
+++
> I wish I had the session transcript to share for this but OpenCode doesn't show my old session anymore so I can't share it.

Yesterday I threw GPT-5 via GitHub Copilot at a relatively simple problem: My Prometheus alerts give me a relatively useless message when an alert fires from the [prometheus-blackbox-exporter](https://github.com/prometheus/blackbox_exporter). I would like to see the URL that it's failing to reach. I used [OpenCode](https://opencode.ai/) to drive this in an agentic manner.

At one point, the LLM hallucinated a `subject` field in the Prometheus [Alertmanager config for email alerts](https://prometheus.io/docs/alerting/latest/configuration/#email_config). I pointed out the error, after which it changed the `subject` to correctly be `headers { Subject = "..."; };` instead. A few iterations on other parts of the config later, it randomly went back to that line and reverted it back to the wrong `subject` field saying that the right version was actually incorrect.

This happened around the 45K tokens mark in its context window, which is well under the claimed values. Ultimately this was an easy mistake to fix again, but I was relatively surprised to see the LLM repeat a mistake within the same session.
