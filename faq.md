---
title: FAQ
description: Commonly Asked Questions
---
## Updating

Q: I'm having trouble with the Auto Update function

A: As of Version 0.0.8 - all MacOS packages are code signed and notarized, auto update will not work. Please make sure you have at least v0.1.0 installed. 

## Usage

Q: Why was the cancellation button removed?

A: I need to do some troubleshooting with the underlying transport library to see why the requests are not cancellable once the connection has been established. For now the cancel button has been removed. Please close / re-open the app instead. 

## Suported OSes

Q: When will Linux be supported?

A: RiftShare uses the Wails framework. Wails should support Linux by January 2022, so at that time I will evaluate distributing the app for Linux. 

Q: Why am I getting security warnings on Windows?

A: The security warning is because the code has not been signed on the Windows version. If there is enough demand, I will purchase a signing certificate to remove the warning. For now though there is nothing to worry about. 
