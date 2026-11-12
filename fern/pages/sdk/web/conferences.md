# Voice and video conferences

Learn how to implement multi-party audio and video conferences in web applications using the Voximplant Web SDK.

Before getting started, make sure you have imported the Web SDK, connected to the Voximplant Cloud, and authenticated a user. Refer to the [Web SDK quickstart]() to set up your client.

<Info title="Ready-to-use conference demo">
Voximplant provides an open-source, production-ready video conference client you can test immediately at [videoconf.voximplant.com]().
</Info>

---

## Voice conferences

Creating a voice conference with the Web SDK follows the same lifecycle as a one-on-one voice call, with the exception that you invoke `callConference()` instead of `call()`.

### 1. Join a voice conference

Prepare your call settings with video disabled and invoke `callConference()`, passing your target conference name or room number:

```javascript title="Join an audio conference"
const joinVoiceConference = (conferenceId) => {
  const callSettings = {
    number: conferenceId,
    video: {
      sendVideo: false,
      receiveVideo: false
    }
  };

  const conferenceCall = sdk.callConference(callSettings);

  conferenceCall.addEventListener(VoxImplant.CallEvents.Connected, () => {
    console.log("Connected to voice conference");
  });

  conferenceCall.addEventListener(VoxImplant.CallEvents.Disconnected, () => {
    console.log("Disconnected from conference");
  });

  conferenceCall.addEventListener(VoxImplant.CallEvents.Failed, (event) => {
    console.error("Failed to connect to conference:", event.reason);
  });
};
```

To leave the conference, call `conferenceCall.hangup()`.

### 2. Cloud routing requirements

When your web client initiates a conference call, Voximplant evaluates your application's [routing rules](). Ensure you have a routing rule whose regex pattern matches the conference `number` passed to `callConference()`, bound to a scenario that initializes a [VoxEngine conference]().

---

## Video conferences

Video conferences support multi-party video rooms with simulcast video quality management, local and remote video rendering, and dedicated participation modes.

### 1. Configure call settings and simulcast

When joining a video conference, enable `simulcast` in your call settings. Simulcast transmits multiple video qualities from the client, allowing the Voximplant media server to distribute optimal resolutions to each participant based on their network conditions and grid layout size:

```javascript title="Join a video conference"
const joinVideoConference = (conferenceId) => {
  const callSettings = {
    number: conferenceId,
    simulcast: true, // Enables adaptive video quality management
    video: {
      sendVideo: true,
      receiveVideo: true
    }
  };

  const conferenceCall = sdk.callConference(callSettings);
};
```

<Info title="Video settings requirement">
Setting `receiveVideo: true` is mandatory for receiving remote participant streams in a video conference. Setting `sendVideo` is optional and can be toggled dynamically during the call.
</Info>

### 2. Specialized joining modes

In addition to standard two-way audio and video participation, the Web SDK supports restricted joining modes:

* **Join as viewer ([joinAsViewer()]())**: Joins the conference in receive-only mode. Viewers receive incoming audio and video streams without sending local camera or microphone tracks.
* **Join as screen share ([joinAsSharing()]())**: Joins the conference as a secondary, dedicated screen-sharing participant, allowing you to stream your desktop alongside your camera feed.

```javascript title="Join as viewer or screen share"
// Join as receive-only viewer
const viewerCall = sdk.joinAsViewer("my_conference_room");

// Join as dedicated screen-sharing stream
const sharingCall = sdk.joinAsSharing("my_conference_room", {
  sendAudio: false
});
```

---

## Video rendering setup

### 1. Create DOM containers

Declare container elements in your HTML to render local and remote video streams:

```html title="HTML video containers"
<div id="localvideo"></div>
<div id="remotevideo"></div>
```

Specify these container IDs during SDK initialization:

```javascript title="Configure video containers on SDK init"
await sdk.init({
  localVideoContainerId: "localvideo",
  remoteVideoContainerId: "remotevideo"
});
```

### 2. Render local camera preview

To display your own camera stream, call `sdk.showLocalVideo(true)` once connected. Alternatively, you can manage the local video renderer manually using `StreamManager`:

```javascript title="Render local camera video"
// Method A: Automatic rendering using initialized container ID
sdk.showLocalVideo(true);

// Method B: Manual rendering using StreamManager
const streamManager = VoxImplant.Hardware.StreamManager.get();

streamManager.on(VoxImplant.Hardware.HardwareEvents.MediaRendererAdded, (event) => {
  const localContainer = document.getElementById("localvideo");
  event.renderer.render(localContainer);
});
```

### 3. Render remote participant video streams

In Voximplant, each remote participant in a conference is represented as an **Endpoint**. Endpoints emit stream events when participants connect and activate their video.

Subscribe to `EndpointAdded` on the call, then listen for `RemoteMediaAdded` to attach participant video streams to the DOM:

```javascript title="Render remote conference participants"
let conferenceCall;

const startConference = (conferenceId) => {
  const callSettings = {
    number: conferenceId,
    simulcast: true,
    video: {
      sendVideo: true,
      receiveVideo: true
    }
  };

  conferenceCall = sdk.callConference(callSettings);

  conferenceCall.addEventListener(VoxImplant.CallEvents.Connected, () => {
    // Show local camera stream
    sdk.showLocalVideo(true);
  });

  // Listen for participants joining the conference
  conferenceCall.on(VoxImplant.CallEvents.EndpointAdded, (event) => {
    const endpoint = event.endpoint;

    // Create a dedicated container for this participant
    const participantContainer = document.createElement("div");
    participantContainer.id = `participant-${endpoint.id}`;
    document.getElementById("remotevideo").appendChild(participantContainer);

    // Render video when participant stream arrives
    endpoint.on(VoxImplant.EndpointEvents.RemoteMediaAdded, (mediaEvent) => {
      mediaEvent.mediaRenderer.render(participantContainer);
    });

    // Clean up DOM when participant stream is removed
    endpoint.on(VoxImplant.EndpointEvents.RemoteMediaRemoved, () => {
      participantContainer.remove();
    });
  });

  conferenceCall.addEventListener(VoxImplant.CallEvents.Disconnected, () => {
    sdk.showLocalVideo(false);
  });
};
```

---

## Check participant camera status

To detect whether a connecting participant has their camera turned on or off, inspect the `kind` property inside the endpoint's `RemoteMediaAdded` event:

```javascript title="Inspect participant media type"
conferenceCall.addEventListener(VoxImplant.CallEvents.EndpointAdded, (event) => {
  event.endpoint.addEventListener(VoxImplant.EndpointEvents.RemoteMediaAdded, (mediaEvent) => {
    if (mediaEvent.mediaRenderer.kind === "video") {
      console.log(`Participant ${event.endpoint.id} enabled camera`);
    } else if (mediaEvent.mediaRenderer.kind === "audio") {
      console.log(`Participant ${event.endpoint.id} connected audio`);
    }
  });
});
```

---

## See also

* [Voximplant Tiler]() — An open-source layout library that automatically calculates and arranges video grids for conference rooms.
* [Web: Screen sharing]() — Learn how to share your screen or application window during a conference.