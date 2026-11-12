# Overview

Welcome to the **VoxEngine API reference**. VoxEngine is the serverless JavaScript runtime executing directly inside Voximplant’s global media nodes alongside live audio and video streams.

This reference documents all global objects, classes, event listeners, and integrated modules available when writing scenario code.

---

## Core runtime building blocks

VoxEngine scenarios are asynchronous and event-driven. Your code interacts with incoming calls, controls media pipelines, and hooks into external services:

* **Global functions & namespaces**: The [VoxEngine]() root object provides primary call-control methods (`callPSTN`, `callUser`, `createConference`, `sendMediaBetween`, `terminate`), utility functions, and cryptographic primitives.
* **Call management**: The [Call]() class controls individual call legs—handling answering, hanging up, DTMF tone processing, audio routing, and in-call messaging.
* **Audio & conferencing**: Classes for media playback ([Player]()), recording ([Recorder]()), and multi-party room control ([Conference]()).
* **Event system**: Strong event-driven architecture dividing between application lifecycle events ([AppEvents]()) and stream-level events ([CallEvents](), [PlayerEvents](), [ASREvents]()).

---

## Reference categories

Explore the detailed references across these functional areas:

* **[Core & Global API]()** — Root `VoxEngine` methods, timers, session controls, and logging utilities.
* **[Call Control]()** — Methods and properties for managing incoming and outgoing `Call` objects.
* **[Event Reference]()** — Comprehensive list of all event payloads, status codes, and callbacks.
* **[Modules & Extensions]()** — Specialized add-on modules:
  * **Speech & Audio**: `Modules.ASR` (speech recognition), `Modules.TTS`, and streaming players.
  * **Voice AI**: Real-time modules for `ElevenLabs`, `Cartesia`, `xAI`, and `Inworld`.
  * **Networking**: `Modules.WebSocket` and raw media stream exchange.
* **[Conferencing]()** — Methods and events for hosting multi-party audio and video rooms.