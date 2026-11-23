# Overview

Welcome to the **Voximplant Flutter SDK reference**. Distributed as the `flutter_voximplant` package, this SDK enables cross-platform Flutter applications to embed crystal-clear audio and video calling, peer-to-peer communication, and multi-party conferencing across iOS and Android.

The SDK wraps native mobile WebRTC libraries in clean Dart abstractions, offering idiomatic reactive widgets and event handlers.

---

## SDK architecture

The Flutter SDK provides a centralized client factory with dedicated controllers for calls, audio routing, and video widgets:

* **Client factory**: Access the platform through the root `Voximplant()` singleton, which instantiates the primary `VIClient`.
* **Call controllers**: Manage individual call lifecycles, hold/mute states, DTMF tones, and quality telemetry.
* **Video widgets**: Render camera feeds and remote participant video natively with Flutter widgets.

Applications interact with the SDK via Dart futures, streams, and state listeners:

* **Client management**: The [VIClient]() instance controls connection lifecycles, account node targets, and authentication responses.
* **Call lifecycles**: The [VICall]() interface manages call operations (answer, hangup, hold, mute) and emits lifecycle events via listeners.
* **Audio device management**: Control hardware audio routing across speakerphone, earpiece, and Bluetooth with the audio device manager.

---

## Reference categories

Explore detailed API documentation across these core areas:

* **[Client and connection reference]()** — Detailed docs for `Voximplant`, `VIClient`, connection states, and authentication results.
* **[Calls and conferences reference]()** — Methods, listeners, and properties for `VICall`, conference rooms, and call quality events.
* **[Video widgets and rendering]()** — `VIVideoView` widget configuration for displaying local camera feeds and incoming remote video.
* **[Audio device controls]()** — Manage microphone capture and system audio routing (speaker, earpiece, wired, and Bluetooth headsets).