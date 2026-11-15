# Video conference optimization

Multi-party video conferences bring together participants with varying hardware capabilities, CPU constraints, and network bandwidth. If a conference server broadcasts high-bitrate video to a participant on a weak mobile connection, that participant will experience frozen video and audio dropouts. Conversely, downgrading video quality for everyone degrades the experience for participants on high-speed connections.

Voximplant optimizes video conferences through two coordinated mechanisms:

1. **Simulcast and adaptive layering**: Transmitting multiple video resolutions simultaneously and adapting quality to each participant's hardware and screen layout.
2. **Automatic stream degradation**: Automatically disabling incoming video feeds for bandwidth-constrained participants to protect audio continuity.

## Contents

- [Simulcast and adaptive video quality](#simulcast-and-adaptive-video-quality)
  - [Camera optimization (Spatial layering)](#camera-optimization-spatial-layering)
  - [Screen sharing optimization (Temporal layering)](#screen-sharing-optimization-temporal-layering)
  - [Recipient-side optimization](#recipient-side-optimization)
- [Automatic video stream degradation](#automatic-video-stream-degradation)
  - [Disabling priority and recovery](#disabling-priority-and-recovery)
  - [Handling stream state events across SDKs](#handling-stream-state-events-across-sdks)
- [Client-side stream controls](#client-side-stream-controls)
- [VoxEngine cloud scenario controls](#voxengine-cloud-scenario-controls)

---

## Simulcast and adaptive video quality

When simulcast is enabled, the publishing client encodes and transmits multiple resolution layers (e.g., 720p, 360p, and 180p) over a single WebRTC connection.

The Voximplant media server inspects network health and viewport dimensions for every participant, dynamically routing the optimal video layer to each subscriber without transcoding.

### Camera optimization (Spatial layering)

For camera feeds, the server manages quality through resolution scaling. Participants with high bandwidth and large rendering windows receive full-resolution streams, while participants with restricted bandwidth or mobile screens receive lower-resolution layers.

### Screen sharing optimization (Temporal layering)

Lowering the spatial resolution of a screen share makes small text, spreadsheets, and source code unreadable. 

For screen sharing streams, Voximplant preserves full native resolution and manages network congestion by reducing the frame rate (FPS) instead. This keeps text crisp and readable even over constrained connections.

### Recipient-side optimization

Subscribing clients can optimize their own network and CPU utilization by:

* **Requesting viewport-matched dimensions**: Asking the server to send a video stream that matches the size of the container element on screen (`requestVideoSize()`).
* **Pausing hidden streams**: Disabling incoming video tracks for participants who are off-screen, minimized, or paginated.

---

## Automatic video stream degradation

When a participant experiences network congestion that cannot be resolved by dropping to the lowest simulcast layer, the Voximplant Cloud automatically disables incoming video feeds for that participant.

<Info title="Audio preservation">
Automatic video degradation never disables audio streams. The platform prioritizes audio continuity so participants can continue speaking and listening without interruption.
</Info>

### Disabling priority and recovery

The platform manages stream degradation based on participant activity:

1. **Disabling order**: Streams belonging to inactive participants (those who have been silent the longest) are disabled first.
2. **Screen sharing protection**: Active screen sharing streams are treated with highest priority and are never disabled automatically due to bandwidth drops.
3. **Recovery order**: When the participant's network connectivity recovers, the server automatically resumes video feeds, restoring the most active speakers first.

### Handling stream state events across SDKs

When incoming video feeds are enabled or disabled, the SDK emits events with a `reason` property:

* **`Automatic`**: Disabled by the Voximplant Cloud due to network degradation.
* **`Manual`**: Disabled intentionally by client code (e.g., `mediaRenderer.disable()`).

When receiving an `Automatic` disable event, update your UI to hide the video element and display a "poor network connection" indicator.

<CodeBlocks>
```typescript title="Web SDK"
const client = VoxImplant.getInstance();
const conference = await client.callConference("default-conf", {
  simulcast: true,
  video: { sendVideo: true, receiveVideo: true }
});

conference.on(VoxImplant.CallEvents.EndpointAdded, ({ endpoint }) => {
  // Listen for stream enablement
  endpoint.on(VoxImplant.EndpointEvents.MediaRenderEnabled, () => {
    // Show video renderer and hide network issue indicator
  });

  // Listen for stream disabling
  endpoint.on(VoxImplant.EndpointEvents.MediaRenderDisabled, ({ reason }) => {
    if (reason === VoxImplant.MediaRenderDisablingReason.Automatic) {
      // Hide video element and show "poor connection" indicator
    } else if (reason === VoxImplant.MediaRenderDisablingReason.Manual) {
      // Hide video element
    }
  });
});
```

```swift title="iOS SDK (Swift)"
extension ConferenceService: VIEndpointDelegate {
    func endpoint(_ endpoint: VIEndpoint, didStartReceivingVideoStream videoStream: VIRemoteVideoStream) {
        // Show video renderer and hide network issue indicator
    }
    
    func endpoint(
        _ endpoint: VIEndpoint,
        didStopReceivingVideoStream videoStream: VIRemoteVideoStream,
        reason: VIVideoStreamReceiveStopReason
    ) {
        if reason == .automatic {
            // Hide video element and show "poor connection" indicator
        } else if reason == .manual {
            // Hide video element
        }
    }
}
```

```kotlin title="Android SDK (Kotlin)"
class ConferenceService : IEndpointListener {
    override fun onStartReceivingVideoStream(
        endpoint: IEndpoint,
        videoStream: IRemoteVideoStream
    ) {
        // Show video renderer and hide network issue indicator
    }
    
    override fun onStopReceivingVideoStream(
        endpoint: IEndpoint,
        videoStream: IRemoteVideoStream,
        reason: VideoStreamReceiveStopReason
    ) {
        when (reason) {
            VideoStreamReceiveStopReason.AUTOMATIC -> {
                // Hide video element and show "poor connection" indicator
            }
            VideoStreamReceiveStopReason.MANUAL -> {
                // Hide video element
            }
        }
    }
}
```

```javascript title="React Native"
const subscribeToEndpointEvents = (endpoint) => {
  endpoint.on(Voximplant.EndpointEvents.StartReceivingVideoStream, () => {
    // Show video renderer and hide network issue indicator
  });

  endpoint.on(Voximplant.EndpointEvents.StopReceivingVideoStream, (event) => {
    if (event.reason === Voximplant.VideoStreamReceiveStopReason.AUTOMATIC) {
      // Hide video element and show "poor connection" indicator
    } else if (event.reason === Voximplant.VideoStreamReceiveStopReason.MANUAL) {
      // Hide video element
    }
  });
};
```

```dart title="Flutter"
void listenToEndpointEvents(VIEndpoint endpoint) {
  endpoint.onStartReceivingVideoStream = (endpoint, videoStream) {
    // Show video renderer and hide network issue indicator
  };
  
  endpoint.onStopReceivingVideoStream = (endpoint, videoStream, reason) {
    if (reason == VIVideoStreamReceiveStopReason.AUTOMATIC) {
      // Hide video element and show "poor connection" indicator
    } else if (reason == VIVideoStreamReceiveStopReason.MANUAL) {
      // Hide video element
    }
  };
}
```
</CodeBlocks>

---

## Client-side stream controls

In the Web SDK, you can control incoming video feeds and request specific resolutions dynamically.

### Enable simulcast on join

Pass `simulcast: true` when connecting to a conference:

```javascript title="Join conference with simulcast"
const conference = VoxImplant.getInstance().callConference({
  number: "conf_room_1",
  simulcast: true
});
```

### Toggle incoming participant video

You can pause and resume incoming video for specific participants:

```javascript title="Enable or disable remote video"
// Disable incoming video for an endpoint
await mediaRenderer.disable();

// Enable incoming video
await mediaRenderer.enable();

// Check if incoming video is enabled
const isEnabled = mediaRenderer.enabled();
```

### Request custom resolution

Ask the server to deliver a specific resolution tailored to your UI container:

```javascript title="Request specific resolution"
// Request 640x480 video layer from the server
await mediaRenderer.requestVideoSize(640, 480);

// Inspect the currently assigned resolution
console.log(mediaRenderer.videoSize); // { width: 640, height: 480 }
```

### Voice activity events

Listen for active speaker changes on endpoints to update visual highlights:

```javascript title="Subscribe to active speaker events"
// Participant started talking
endpoint.addEventListener(EndpointEvents.VoiceStart, ({ endpoint }) => {
  console.log(`Participant ${endpoint.id} started speaking`);
});

// Participant stopped talking
endpoint.addEventListener(EndpointEvents.VoiceEnd, ({ endpoint }) => {
  console.log(`Participant ${endpoint.id} stopped speaking`);
});
```

---

## VoxEngine cloud scenario controls

In your cloud scenario, you can manage conference endpoints and stream routing policies directly.

### Add and remove endpoints

```javascript title="Add and remove endpoints in scenario"
// Add an endpoint to the conference
conference.add({
  call,
  mode: ConferenceMode.Standard,
  direction: CallDirection.Both,
  scheme: CallScheme.Video
});

// Remove an endpoint
conference.remove(call);
```

### Inspect and manage stream directions

Query endpoints and control stream transmission programmatically:

```javascript title="Manage streams and directions"
// Inspect connected endpoints
const endpoints = conference.getList();
const endpoint = conference.get(endpointId);

// Query stream directions ('SEND' | 'RECEIVE' | 'BOTH')
const direction = endpoint.getDirection();
const { fromClientEndpoint, toClientEndpoint } = endpoint.getStreamsInfo();

// Dynamically enable or disable streams in the cloud
await stream.disable();
await stream.enable();

// Request video dimensions for an endpoint
endpoint.requestVideoSize(640, 480);
```

### Conference lifecycle events

Subscribe to conference events in your scenario to react to room changes:

```javascript title="Subscribe to conference stream events"
// Endpoint added to conference
conference.addEventListener(ConferenceEvents.EndpointAdded, (event) => {
  // Handle new participant
});

// Endpoint removed from conference
conference.addEventListener(ConferenceEvents.EndpointRemoved, (event) => {
  // Handle participant departure
});

// Incoming stream changed
endpoint.addEventListener(EndpointEvents.ToClientStreamUpdated, (event) => {
  // Stream attributes updated
});

// Outgoing stream disabled
endpoint.addEventListener(EndpointEvents.FromClientStreamDisabled, (event) => {
  // Outgoing video paused
});
```