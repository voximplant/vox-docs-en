# Autoplay and device access

Understand browser media autoplay policies, handle microphone and camera permission flows, and troubleshoot common WebRTC device exceptions in the Voximplant Web SDK.

---

## Autoplay policies in browsers

Modern web browsers (including Google Chrome, Apple Safari, and Microsoft Edge) restrict media autoplay with sound by default to prevent unwanted audio playback. In some browsers, users can customize site-specific permissions to allow or block media playback.

Web developers *should not assume* that incoming audio or video will play automatically when a call connects. If a user has not established an engagement history on your domain, browser policies may block the stream, requiring you to **render a manual play button** to resume playback.

### Media Engagement Index (MEI)

Chromium-based browsers use the Media Engagement Index (MEI) to evaluate user interaction with media on a site. An origin gains higher MEI scores when:

* The browser tab hosting the video is active.
* The video dimensions exceed 200×140 pixels.
* Media playback lasts longer than 7 seconds.
* An unmuted audio track is present.

Sites with high MEI scores are granted automatic video and audio playback privileges.

### Handling playback failures

If the browser blocks automated media playback, the SDK emits the [PlaybackError]() event. Handle this event by revealing an interactive UI button that calls `play()` on the target media element:

```javascript title="Handle PlaybackError with a manual play button"
const sdk = VoxImplant.getInstance();

sdk.on(VoxImplant.Events.PlaybackError, (event) => {
  const playButton = document.getElementById("playVideoManual");
  playButton.style.display = "block";

  playButton.onclick = () => {
    event.element.play();
    playButton.style.display = "none";
  };
});
```

---

## Microphone and camera access errors

To initiate or receive calls and conferences, users must grant browser permissions to access their microphone and camera. When initializing the SDK or calling [call()]() and [callConference()](), the browser triggers a native permission prompt.

In the Web SDK, *users cannot join a call or conference without granting microphone access*. If a user denies the microphone prompt, the call fails immediately with the [CallEvents.Failed]() event.

Browsers typically request camera and microphone permissions together in a single dialog. If a user approves microphone access but declines the camera, the SDK falls back to audio-only mode, allowing the user to join the call without video.

---

## Troubleshooting device access errors

To monitor how users respond to permission prompts, subscribe to the [MicAccessResult]() event. The event payload returns `true` when access is granted and `false` when denied:

```javascript title="Handle MicAccessResult event"
const sdk = VoxImplant.getInstance();

sdk.on(VoxImplant.Events.MicAccessResult, (event) => {
  if (event.result) {
    console.log("Microphone access granted");
  } else {
    console.warn("User declined microphone permission");
  }
});
```

### Common WebRTC device exceptions

When hardware initialization fails, the browser rejects device requests with DOM exceptions. Inspect your browser developer console to identify the root cause:

| Exception | Description |
| :--- | :--- |
| **`AbortError`** | The user granted permission and the hardware is functional, but an unexpected system issue prevented device usage. Most commonly caused by browser autoplay policy enforcement. |
| **`NotAllowedError`** | The user explicitly denied microphone or camera access, or permissions were disabled in site settings or OS preferences. |
| **`NotFoundError`** | No audio or video capture device was detected on the system (e.g., no webcam plugged in, missing hardware drivers). |
| **`NotReadableError`** | The camera or microphone is locked or in use by another application or process (e.g., Zoom, Teams, or another browser window). |
| **`OverconstrainedError`** | The requested [video constraints]() or [audio constraints]() cannot be met by the available hardware (e.g., requesting an unsupported frame rate or 4K resolution on a 720p webcam). |
| **`PermissionDismissedError`** | The user dismissed or closed the browser permission dialog without granting or denying access. |

---

## See also

* [Autoplay policies in WebKit]()
* [Autoplay policies in Chromium]()