+++
title = "Combining videos using FFmpeg"
date = 2025-06-30T20:01:25Z
tags = ["FFmpeg"]
+++

FFmpeg lets you mix videos together from different sources based on a zero-indexed map of input files. For the diagram given below, you can do `ffmpeg -i input_0.mp4 -i input_1.mp4 -c copy -map 0:v:0 -map 1:a:0 -shortest output.mp4` to take the video from `input_0.mp4` and audio from `input_1.mp4`.
![](https://i.sstatic.net/3ep4f.png)
