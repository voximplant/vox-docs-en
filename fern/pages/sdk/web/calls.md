# Voice and video calls

Learn how to implement outbound and inbound voice and video calling in modern web applications using the Voximplant Web SDK.

Before integrating calling functionality, ensure you have initialized the SDK, established a connection to the Voximplant Cloud, and authenticated a user. Refer to the [Web SDK quickstart]() to set up your client.

---

## Cloud scenario requirements

Every call initiated from or received by the Web SDK interacts with a VoxEngine cloud scenario through a [routing rule]().

Calls initiated from an SDK involve two call legs:
1. **SDK → VoxEngine scenario**: Treated as an incoming call inside your cloud scenario, handled via the `AppEvents.CallAlerting` event.
2. **VoxEngine scenario → destination**: Outgoing leg dialed to another user, PSTN number, or SIP endpoint.

### Voice scenario
In your scenario, answer the incoming call leg and bridge it to the destination using `VoxEngine.easyProcess()`:

```javascript title="VoxEngine: Voice call routing scenario"
// Initiate an outgoing call based on the dialed number
VoxEngine.addEventListener(AppEvents.CallAlerting, (e) => {
  const newCall = VoxEngine.callUser({
    username: e.destination,
    callerid: e.callerid,
    displayName: e.displayName,
    video: true,
    scheme: e.scheme
  });
  VoxEngine.easyProcess(e.call, newCall, () => {});
});
```

### Video scenario
For video calls, enable video support on the call legs in your scenario:

```javascript title="VoxEngine: Enable video support"
VoxEngine.addEventListener(AppEvents.CallAlerting, (e) => {
  const newCall = VoxEngine.callUser({
    username: e.destination,
    callerid: e.callerid,
    displayName: 'test call',
    video: true,
    scheme: e.scheme
  });
  VoxEngine.easyProcess(e.call, newCall, () => {});
});
```

To establish direct peer-to-peer connections between two Voximplant users without routing media through cloud servers, use `VoxEngine.callUserDirect()`:

```javascript title="VoxEngine: Peer-to-peer video scenario"
VoxEngine.addEventListener(AppEvents.CallAlerting, (e) => {
  const newCall = VoxEngine.callUserDirect(e.call, e.destination, {
    callerid: e.callerid,
    displayName: 'test call'
  });
  VoxEngine.easyProcess(e.call, newCall, () => {}, true);
});
```

---

## Make an outgoing call

To make an outgoing call, configure your call settings, pass them to the SDK's `call()` method, and subscribe to call lifecycle events.

### 1. Place a voice call

For voice-only calls, disable video flags in your call settings:

```javascript title="Place an outgoing voice call"
const placeVoiceCall = (destination) => {
  const callSettings = {
    number: destination,
    video: {
      sendVideo: false,
      receiveVideo: false
    }
  };

  const call = sdk.call(callSettings);

  call.addEventListener(VoxImplant.CallEvents.Connected, () => {
    console.log("Call connected");
  });

  call.addEventListener(VoxImplant.CallEvents.Disconnected, () => {
    console.log("Call disconnected");
  });

  call.addEventListener(VoxImplant.CallEvents.Failed, (event) => {
    console.error("Call failed:", event.reason);
  });
};
```

To terminate an active call, invoke `call.hangup()`.

### 2. Place a video call

To place a video call:

1. **Prepare DOM video containers**: Create container elements in your HTML for rendering local and remote video streams:

```html title="HTML video containers"
<div id="localvideo"></div>
<div id="remotevideo"></div>
```

<Info title="Video tags are generated automatically">
Do not manually add `<video>` tags inside your containers. The SDK automatically generates and attaches `<video>` elements when video rendering begins.
</Info>

2. **Configure SDK initialization**: Specify the container IDs during SDK initialization:

```javascript title="Register video containers on SDK init"
await sdk.init({
  localVideoContainerId: "localvideo",
  remoteVideoContainerId: "remotevideo"
});
```

<Warning title="Browser autoplay policies">
Most web browsers block autoplay of video with sound unless initiated by explicit user interaction. Always trigger video playback through interactive elements (such as a call button) to avoid autoplay errors. Refer to [SDK error handling]() for more details.
</Warning>

3. **Render local and remote video streams**: Show the local camera preview and subscribe to endpoint events to display the remote video stream:

```javascript title="Place an outgoing video call"
// Show local camera stream
sdk.showLocalVideo(true);
const streamManager = VoxImplant.Hardware.StreamManager.get();

streamManager.on(VoxImplant.Hardware.HardwareEvents.MediaRendererAdded, (event) => {
  const localContainer = document.getElementById("localvideo");
  event.renderer.render(localContainer);
});

// Place call with video enabled
const placeVideoCall = (destination) => {
  const callSettings = {
    number: destination,
    video: {
      sendVideo: true,
      receiveVideo: true
    }
  };

  const call = sdk.call(callSettings);

  // Subscribe to remote endpoint events to render remote video
  call.on(VoxImplant.CallEvents.EndpointAdded, (event) => {
    event.endpoint.on(VoxImplant.EndpointEvents.RemoteMediaAdded, (mediaEvent) => {
      const remoteContainer = document.getElementById("remotevideo");
      mediaEvent.mediaRenderer.render(remoteContainer);
    });
  });

  call.addEventListener(VoxImplant.CallEvents.Connected, () => {
    console.log("Video call connected");
  });

  call.addEventListener(VoxImplant.CallEvents.Disconnected, () => {
    console.log("Video call disconnected");
  });

  call.addEventListener(VoxImplant.CallEvents.Failed, (err) => {
    console.error("Video call failed:", err);
  });
};
```

---

## Process an incoming call

To receive calls, your user must be logged in. Subscribe to the `IncomingCall` event on the client to present incoming call controls to the user.

### 1. Answer or decline a voice call

```javascript title="Handle incoming voice call"
sdk.on(VoxImplant.Events.IncomingCall, (event) => {
  const call = event.call;

  document.getElementById("answerBtn").onclick = () => {
    call.answer();
  };

  document.getElementById("declineBtn").onclick = () => {
    call.decline();
  };

  call.addEventListener(VoxImplant.CallEvents.Connected, () => {
    console.log("Call connected");
    document.getElementById("hangupBtn").onclick = () => {
      call.hangup();
    };
  });

  call.addEventListener(VoxImplant.CallEvents.Disconnected, () => {
    console.log("Call disconnected");
  });

  call.addEventListener(VoxImplant.CallEvents.Failed, (err) => {
    console.error("Call failed:", err);
  });
});
```

### 2. Answer a video call

To answer an incoming call with video, pass video flags to `call.answer()` and render the local and remote media containers:

```javascript title="Handle incoming video call"
sdk.on(VoxImplant.Events.IncomingCall, (event) => {
  const call = event.call;

  document.getElementById("answerVideoBtn").onclick = () => {
    // Answer with video enabled
    call.answer(
      undefined,
      undefined,
      { sendVideo: true, receiveVideo: true }
    );

    // Show local camera preview
    sdk.showLocalVideo(true);
    const streamManager = VoxImplant.Hardware.StreamManager.get();
    streamManager.on(VoxImplant.Hardware.HardwareEvents.MediaRendererAdded, (mediaEvent) => {
      const localContainer = document.getElementById("localvideo");
      mediaEvent.renderer.render(localContainer);
    });
  };

  document.getElementById("declineBtn").onclick = () => {
    call.decline();
  };

  // Render incoming remote video stream
  call.on(VoxImplant.CallEvents.EndpointAdded, (endpointEvent) => {
    endpointEvent.endpoint.on(VoxImplant.EndpointEvents.RemoteMediaAdded, (mediaEvent) => {
      const remoteContainer = document.getElementById("remotevideo");
      mediaEvent.mediaRenderer.render(remoteContainer);
    });
  });

  call.addEventListener(VoxImplant.CallEvents.Connected, () => {
    console.log("Video call connected");
  });
});
```

---

## Download demo projects

Explore complete reference applications implementing voice and video calling with the Web SDK:

* [Web SDK Basic Demo]()