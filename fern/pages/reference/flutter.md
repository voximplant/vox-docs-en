# Overview

Welcome to the **Voximplant Flutter SDK reference**. Distributed as the `flutter_voximplant` package, this SDK enables cross-platform Flutter applications to embed crystal-clear audio and video calling, peer-to-peer communication, and multi-party conferencing across iOS and Android.

The SDK wraps native mobile WebRTC libraries in clean Dart abstractions, offering idiomatic reactive widgets and event handlers.

---

## SDK architecture

The Flutter SDK provides a centralized client factory with dedicated controllers for calls, audio routing, and video widgets:

* **Client factory**: Access the platform through the root `Voximplant()` singleton, which instantiates the primary `VIClient`.
* **Call controllers**: Manage individual call lifecycles, hold/mute states, DTMF tones, and quality telemetry.
* **Video widgets**: Render camera feeds and remote participant video natively using Flutter widgets.

<Aside>
```dart title="Initialize and log in with VIClient"
import 'package:flutter_voximplant/flutter_voximplant.dart';

// 1. Obtain the client instance
final client = Voximplant().getClient();

// 2. Connect to your account's assigned node
await client.connect(node: VINode.NodeX);

// 3. Authenticate with user credentials
final authResult = await client.login(
  'user@app.account.voximplant.com',
  'password',
);

print('Logged in successfully as: ${authResult.displayName}');
```
</Aside>

Applications interact with the SDK using Dart futures, streams, and state listeners:

* **Client management**: The [VIClient]() instance controls connection lifecycles, account node targets, and authentication responses.
* **Call lifecycles**: The [VICall]() interface manages call operations (answer, hangup, hold, mute) and emits lifecycle events via listeners.
* **Audio device management**: Control hardware audio routing across speakerphone, earpiece, and Bluetooth using the audio device manager.

---

## Reference categories

Explore detailed API documentation across these core areas:

* **[Client & Connection Reference]()** — Detailed docs for `Voximplant`, `VIClient`, connection states, and authentication results.
* **[Calls & Conferences Reference]()** — Methods, listeners, and properties for `VICall`, conference rooms, and call quality events.
* **[Video Widgets & Rendering]()** — `VIVideoView` widget configuration for displaying local camera feeds and incoming remote video.
* **[Audio Device Controls]()** — Manage microphone capture and system audio routing (speaker, earpiece, wired, and Bluetooth headsets).