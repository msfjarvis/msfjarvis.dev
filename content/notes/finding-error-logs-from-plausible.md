+++
title = "Finding error logs from Plausible"
date = 2025-06-30T20:01:25Z
tags = ["Plausible"]
+++

Plausible writes error logs only into its Postgres database. Errors are in the `errors` column of the `oban_jobs` table.
