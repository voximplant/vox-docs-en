# Screen sharing

The Voximplant Web SDK allows users to share their desktop screen in one-on-one calls and multi-party conferences.

Screen sharing is supported across all modern desktop browsers, including Chrome, Microsoft Edge, Safari, and Firefox.

<Warning title="Mobile browser limitation">
Mobile web browsers do not support screen sharing.
</Warning>

---

## Screen sharing in one-on-one calls

In a one-on-one call, invoking [shareScreen()]() replaces the camera video stream with the screen share stream. The SDK does not support transmitting camera video and screen share simultaneously in a standard one-on-one call.

```javascript title="Start screen sharing during a call"
// During an active call
call
  .shareScreen()
  .then(() => {
    // Screen sharing started successfully
  })
  .catch((error) => {
    // Screen sharing failed (e.g., user dismissed the browser prompt)
    console.error("Screen sharing error:", error);
  });
```

<Warning title="Browser autoplay policies">
Most browsers restrict video autoplay without explicit user interaction. Ensure your UI includes an interactive element that triggers video playback on the DOM video element. Refer to [SDK error handling]() for more information.
</Warning>

To stop sharing, call [stopSharingScreen]():

```javascript title="Stop screen sharing"
call.stopSharingScreen();
```

Users can also stop sharing at any time using the browser's native screen sharing control banner.

---

## Screen sharing in conferences

In a conference, you have two options for sharing your screen:

### Option 1: Replace camera video
Call [shareScreen()]() on the active conference call object to replace your existing camera feed with the screen stream.

### Option 2: Transmit video and screen simultaneously
To share your screen alongside your camera feed, join the conference a second time as a dedicated sharing participant using [joinAsSharing()]():

```javascript title="Join conference as a sharing participant"
const sharingCall = client.joinAsSharing("my_conf_room", {
  sendAudio: false, // Optional: specify whether to send system audio
  extraHeaders: { "X-Screen-Share": "true" } // Optional SIP headers
});
```

To stop sharing, terminate the secondary sharing connection:

```javascript title="Stop conference screen sharing"
sharingCall.hangup();
```

---

## Track video source transitions

To detect when a participant switches between camera video and screen sharing, subscribe to the [MediaRendererUpdated]() event on the client. The `type` property in the event payload indicates the active source:

```javascript title="Track media renderer updates"
client.addEventListener(VoxImplant.Hardware.HardwareEvents.MediaRendererUpdated, (event) => {
  if (event.type === "sharing") {
    console.log("The video source switched to screen sharing");
  } else if (event.type === "video") {
    console.log("The video source switched back to camera video");
  }
});
```