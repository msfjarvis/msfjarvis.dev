+++
title = "Copying the timestamp of a file"
date = 2025-06-30T20:01:25Z
tags = ["FFmpeg"]
+++

You can use `touch -r old new` to copy the timestamp of an older file in a newly created file. Useful for doing bulk re-encodes with FFmpeg that benefit from preserving timestamps.
