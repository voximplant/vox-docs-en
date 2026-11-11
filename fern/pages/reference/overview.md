# API Reference

Everything in Voximplant is programmable. If you can click it in the control panel, hear it over a phone line, or render it on a screen, there is an API or SDK built to control it.

This reference section is your technical source of truth across the entire Voximplant ecosystem—spanning cloud backend runtimes, infrastructure REST APIs, and client-side communication SDKs.

---

## Cloud Backend & Infrastructure

### [VoxEngine]()
The real-time serverless JavaScript runtime executing directly inside Voximplant's global media nodes. VoxEngine scenarios live right next to the audio and video streams:
- React to call lifecycle events (`CallAlerting`, `Connected`, `Disconnected`).
- Bridge calls between PSTN, SIP, WebRTC, and conferences.
- Process audio pipelines in real time with text-to-speech, speech recognition, and Voice AI models.
- Send and receive HTTP requests and WebSocket streams directly during active calls.

### [Management API]()
The OpenAPI-compatible REST API that gives your server complete programmatic control over your Voximplant account. Anything you can do in the dashboard, you can automate with code:
- Provision and configure phone numbers, SIP registrations, and caller IDs.
- Deploy applications, scenarios, and routing rules dynamically.
- Manage users, access keys, and role-based permissions.
- Trigger outbound calls, launch automated campaigns, and retrieve call history records (CDRs) and recordings.

---

## Client SDKs

Embed crystal-clear voice, video, and multi-party conferencing directly into your client applications.

- **[Web SDK]()** — Modular, TypeScript-native SDK (v5) designed for modern browsers, React, Vue, Angular, and vanilla web environments.
- **[iOS & macOS SDK]()** — Native Swift SDK (v3) distributed via Swift Package Manager, featuring native CallKit, PushKit, and cross-Apple platform support.
- **[Android SDK]()** — Native Kotlin SDK (v3) built with BOM dependency management, Jetpack Compose video rendering, and background audio handling.
- **[React Native SDK]()** — Cross-platform SDK (v2) with separate core and calling packages to deliver native calling experiences from a single codebase.
- **[Flutter SDK]()** — Multi-platform Dart package for building real-time voice and video applications across iOS and Android.

---

## How it fits together

A typical Voximplant architecture connects these layers in harmony:

1. **Management API**: Your backend provisions users, manages phone numbers, or triggers outbound calls.
2. **VoxEngine**: Cloud scenarios run your business logic, route calls, manipulate media, and orchestrate AI assistants.
3. **Client SDKs**: Mobile and web apps connect users to the call with low latency, handling device switching, cameras, and local UI controls.