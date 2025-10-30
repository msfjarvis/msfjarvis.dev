+++
title = "Rudimentary type-safety in Rust macro_rules macros"
date = 2025-06-30T20:01:25Z
tags = ["Rust"]
+++

Although Rust's `macro_rules` macros operates on syntax trees and thus cannot propagate types, there are ways to make the compiler do it for you. One such trick is to insert a function call that expects only the specific type you want, which then fails for the other types that are not expected by the macro. Picked up from StackOverflow: https://stackoverflow.com/a/34214916
