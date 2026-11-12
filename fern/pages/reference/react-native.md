# Overview

Welcome to the **Voximplant React Native SDK v2 reference**. This SDK provides a unified JavaScript and TypeScript API to ship native audio and video calling, peer-to-peer communication, and conferencing across iOS and Android from a single codebase.

SDK v2 is built directly on top of the native Voximplant iOS and Android SDKs, ensuring full native feature parity with modern React Native architectures.

---

## SDK architecture

The SDK is divided into dedicated, modular packages:

* **`@voximplant/react-native-core`**: Handles connection to Voximplant cloud nodes, user authentication, push notification tokens, and system audio routing.
* **`@voximplant/react-native-calls`**: Handles WebRTC media pipelines, audio/video call management, camera controls, and multi-party conferences.
* **`@voximplant/react-native-shared`**: Common types, error classes, and utilities shared between packages.

Applications manage sessions through centralized singleton controllers and event listeners:

* **Client management**: The [Client]() singleton in `@voximplant/react-native-core` manages socket connections, credentials, and global disconnection reasons.
* **State tracking**: Monitor connection transitions using the [Watchable]() API (`client.state.watch()`).
* **Calling & conferencing**: The `@voximplant/react-native-calls` module provides call controls, video view components, and in-call event handlers.

---

## Reference categories

Explore detailed API documentation across these core areas:

* **[Core Package Reference]()** — Complete reference for `@voximplant/react-native-core`, `Client`, nodes, and authentication error models.
* **[Calls Package Reference]()** — Methods, properties, and events for `@voximplant/react-native-calls`, call lifecycles, and conferencing.
* **[Audio Device Management]()** — Automatic and manual audio routing across speakerphone, earpiece, wired headsets, and Bluetooth devices.
* **[Video Views & Camera]()** — Native UI components for rendering local camera previews and remote video streams.
* **[Push Notifications]()** — Background VoIP incoming call handling using APNs and FCM integration.