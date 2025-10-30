+++
title = "Concatenating videos with FFmpeg"
date = 2025-06-30T20:01:25Z
tags = ["FFmpeg"]
+++

FFmpeg has support for concatenating files with no re-encoding

```
# file_list.txt
file 'source1.mp4'
file 'source2.mp4'

$ ffmpeg -f concat -safe 0 -i file_list.txt -c copy output.mp4
```
