+++
title = "Default padding in Compose Material3 Scaffold"
date = 2025-06-30T20:01:25Z
tags = ["Jetpack Compose"]
+++

The default Material3 `Scaffold` component adds the height of the `bottomBar` parameter to the inner padding which resulted in the issues I was having with the floating navigation bar. Removing all calls to `Modifier.padding` and wiring down the padding parameter as `contentPadding` resolved the problem.
