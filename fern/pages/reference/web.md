# Overview

Welcome to the **Voximplant Web SDK v5 reference**. This SDK allows you to embed real-time voice and video communication, peer-to-peer calling, and multi-party conferencing directly into modern browser applications.

Web SDK v5 is distributed as the `@voximplant/websdk` NPM package. Built around an Inversion of Control (IoC) container with native TypeScript support, it features a modular architecture that lets you load calling and media capabilities on demand to keep bundle sizes lean.

---

## SDK architecture

The SDK is organized around a centralized Core container with modular extensions:

* **Core runtime**: The base `@voximplant/websdk` package provides container initialization ([Core]()) and the built-in [Client]() for connection and authentication.
* **Module loaders**: Optional capabilities are registered through loaders, such as `CallLoader` for voice/video calls, `StreamLoader` for media devices, and `NoiseSuppressionBalancedLoader` for AI audio filtering.

Applications initialize the Core container, register necessary modules, and interact with the platform through watchables and event emitters:

* **Connection & authentication**: The [Client]() interface handles socket connectivity to your account's assigned node and manages login credentials.
* **Reactive state**: Watch connection transitions in real time using the [Watchable]() API (e.g., `client.state.watch()`).
* **Call management**: The registered `CallManager` manages active audio/video calls, screen sharing, and media streams.

---

## Reference categories

Explore detailed API documentation across these core areas:

* **[Core & Client Reference]()** — Detailed docs for `Core`, module registration, `Client` methods, and connection events.
* **[Calls & Conferences Reference]()** — API references for `CallManager`, `Call` instances, call controls, and quality telemetry.
* **[Media Streams & Hardware]()** — Camera and microphone capture, audio device selection, and local/remote stream rendering.
* **[Audio Processing Modules]()** — Specialized modules for AI-powered background noise suppression and custom audio transforms.