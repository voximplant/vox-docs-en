# Overview

Welcome to the **Voximplant Android SDK v3 reference**. This SDK enables native Android applications to establish real-time voice and video calls, join multi-party conferences, and stream WebRTC media.

Android SDK v3 uses a modular architecture managed through a centralized Bill of Materials (BOM), delivering first-class support for modern Kotlin conventions and Jetpack Compose.

---

## SDK architecture

The SDK is divided into focused modules so you only bundle the dependencies your application needs:

* **`android-sdk-core`**: Core runtime for initialization, socket connection to Voximplant cloud nodes, and user authentication.
* **`android-sdk-calls`**: Audio and video call management, WebRTC media streaming, DTMF tones, and quality telemetry.
* **`android-sdk-renderer-compose`**: Declarative Jetpack Compose components and utilities for rendering local and remote camera feeds.

The Android SDK runtime follows modern Kotlin patterns using singleton controllers and asynchronous callbacks:

* **Core initialization**: [VICore]() prepares global native libraries and requires initialization once in your `Application.onCreate()`.
* **Client singleton**: The [Client]() object controls cloud connectivity, user sessions, and global network listeners ([ClientSessionListener]()).
* **Call interface**: The [Call]() interface provides methods to answer, hold, mute, send DTMF tones, and track call quality events via [CallListener]().

---

## Reference categories

Explore detailed API documentation across these core areas:

* **[Core & Connection Reference]()** — Detailed docs for `VICore`, `Client`, connection parameters, and authentication callbacks.
* **[Calls & Conferences Reference]()** — API references for `Call`, call settings, conference management, and DTMF signaling.
* **[Audio Device Management]()** — Automatic and manual audio routing across speakerphone, earpiece, wired headsets, and Bluetooth devices.
* **[Video Rendering & Compose]()** — UI components for displaying video streams in Jetpack Compose and traditional Android Views.
* **[Call Quality & Statistics]()** — Telemetry events for packet loss, network latency, codec mismatches, and connection degradation.