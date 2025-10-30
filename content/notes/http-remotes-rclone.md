+++
title = "HTTP remotes in rclone"
date = 2025-06-30T20:01:25Z
tags = ["rclone"]
+++

`rclone` can use HTTP hosts as a remote, so it's often faster and easier to move things between servers via a file-server rather than over SSH using `rsync` assuming the contents aren't private.
