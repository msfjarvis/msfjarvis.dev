+++
title = "Nix `builtins.toString` behaves in a surprising manner"
date = 2025-06-30T20:01:25Z
tags = ["Nix"]
+++

Nix's `builtins.toString` doesn't stringify a Boolean directly but instead returns an empty string for false and `"1"` for true. The reason for this is apparently that the result is optimized for use in shell pipelines, so the result is expected to go into a `[ -z $result ]` on the result of calling the function.

Lost entirely too much time to this.
