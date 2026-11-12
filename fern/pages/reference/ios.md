# Overview

Welcome to the **Voximplant iOS and macOS SDK v3 reference**. This SDK allows you to embed crystal-clear audio and video calling, peer-to-peer communication, and multi-party conferencing into native Apple applications.

SDK v3 is distributed as binary XCFrameworks via Swift Package Manager (SPM) and features a modular architecture that unifies support across **iOS (12.0+)** and **macOS (11.5+)**.

---

## SDK architecture

The SDK is split into two specialized products:

* **`VoximplantCore`**: Manages cloud connectivity, socket lifecycles, and user authentication with the Voximplant platform.
* **`VoximplantCalls`**: Handles WebRTC media pipelines, audio/video call controls, camera inputs, and multi-party conferencing.

Applications interact with the SDK through centralized singleton managers and delegate callbacks:

* **Client management**: The [VIClient]() singleton is your primary interface for connecting to your account's node and authenticating users.
* **Session events**: Implement [VIClientSessionDelegate]() to handle global connection status changes and network drops.
* **Call control**: The [VICall]() class manages active call lifecycles, handling answering, muting, holding, sending DTMF tones, and stream routing via [VICallDelegate]().

---

## Reference categories

Explore detailed API documentation across these core areas:

* **[VoximplantCore Reference]()** — Comprehensive guide to `VIClient`, connection nodes, session delegates, and authentication models.
* **[VoximplantCalls Reference]()** — Methods, properties, and delegates for `VICall`, conference controls, and call quality events.
* **[Audio & Hardware Management]()** — Manage system audio routing (earpiece, speaker, Bluetooth) and microphone permissions.
* **[Video & Stream Rendering]()** — Camera management, local preview rendering, and remote video stream views (`VIVideoView`).
* **[CallKit & PushKit Integration]()** — Native system calling UI, VoIP background push processing, and CallKit audio session handling.