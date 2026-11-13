# Recording and streaming

Learn how to record one-on-one audio and video calls, as well as composite multi-party video conferences into single video files in Voximplant.

Recordings can be stored in the Voximplant Cloud or exported directly to your own [custom S3-compatible storage]().

---

## One-on-one call recording

VoxEngine provides two approaches for recording individual calls:

1. **`call.record()`**: The quickest method to record an active call. Supports both audio and video recording.
2. **`Recorder` module**: Provides fine-grained media routing using `VoxEngine.createRecorder()` and `call.sendMediaTo()`. Audio-only.

### Using call.record()

To record an active call, invoke `call.record()` inside your scenario:

```javascript title="Record audio or video call"
// Record audio only
call.record();

// Record audio and video
call.record({ video: true });
```

### Using the Recorder module

Alternatively, use the `Recorder` module for audio recording:

```javascript title="Record audio via Recorder module"
require(Modules.Recorder);

const recorder = VoxEngine.createRecorder();
call.sendMediaTo(recorder);
```

<Warning title="Active recorder limit">
The maximum number of concurrent media player and recorder instances per JavaScript session is 10.
</Warning>

### Recorder customization parameters

You can pass configuration parameters to `call.record()` or `VoxEngine.createRecorder()`:

* **`expire`**: Specifies retention duration in cloud storage (3 months, 6 months, 1 year, 2 years, or 3 years).
* **`contentDispositionFilename`**: Sets a custom filename for the recorded file.
* **`hd_audio`**: When `true`, records at 192 kbps / 48 kHz (default is 32 kbps / 8 kHz).
* **`lossless`**: When `true`, records uncompressed audio in FLAC format.
* **`stereo`**: When `true`, records distinct left and right channels for call participants.

```javascript title="Customizing recorder parameters"
// Custom parameters on Call.record()
call.record({
  hd_audio: true,
  stereo: true,
  expire: RecordExpireTime.YEAR_1,
});

// Custom parameters on createRecorder()
require(Modules.Recorder);

const recorder = VoxEngine.createRecorder({
  hd_audio: true,
  stereo: true,
});
call.sendMediaTo(recorder);
```

For a full list of configuration options, refer to [RecorderParameters]().

<Info title="Video recording formats">
One-on-one video calls can be recorded in MP4 (H.264 codec) or WebM (VP8 codec), depending on client SDK capabilities. In the Web SDK, you can set the optional `H264first` parameter to `true` to prioritize MP4 encoding.
</Info>

### Retrieving call recordings

To retrieve the download URL for a completed recording in your scenario, subscribe to the [CallEvents.RecordStarted]() event on the call object:

```javascript title="Retrieve recording URL"
call.addEventListener(CallEvents.RecordStarted, (event) => {
  Logger.write(`Recording started: ${event.url}`);
});
```

Recordings are also accessible via the [GetCallHistory]() Management API method and the **Call history** section of the Control Panel.

---

## Multi-party conference recording

Voximplant allows you to composite and record all video conference participants into a single mixed MP4 video file.

In a conference recording, participant video frames automatically adjust as participants join or leave. If a participant shares their screen, the screen stream automatically appears as an additional pane and closes when sharing ends.

### Conference recording layouts

The `layout` parameter defines how participant video feeds are arranged:

* **`grid`** *(Default)*: All participant frames have equal dimensions arranged in a dynamic grid.
* **`tribune`**: The primary active speaker is displayed in a prominent large frame above a smaller grid of other participants. You can dynamically pin specific participants to the main frame.
* **`custom`**: Allows custom coordinate positioning for each participant frame via the `layoutSettings` array.

### Video quality profiles

Video conference recordings are encoded in MP4 (H.264 codec) according to the configured `profile`:

| Profile | Resolution & Framerate | Bitrate |
| :--- | :--- | :--- |
| **`HD`** | 1280×720 @ 30 fps | 4,096 kbps |
| **`FHD`** | 1920×1080 @ 30 fps | 8,192 kbps |
| **`QHD`** | 2560×1440 @ 30 fps | 16,384 kbps |
| **`4K`** | 3840×2160 @ 30 fps | 32,768 kbps |

### Setting up conference recording

To record a video conference:

1. Require the `Recorder` module in your scenario:

```javascript title="1. Add recorder module"
require(Modules.Conference);
require(Modules.Recorder);
```

2. Configure recorder parameters:

```javascript title="2. Prepare recorder properties"
const createRecorderParams = {
  video: true,
  expire: RecordExpireTime.THREEMONTHS,
  videoopt: {
    mixing: true,
    profile: 'hd',
    background: '#FFFFFF',
    vad: true,
    labels: true,
    layout: 'tribune'
  }
};
```

Key `videoopt` configuration options:
* **`mixing`**: Set to `true` to composite all video streams into a single mixed file.
* **`profile`**: Set the target video resolution and bitrate (`HD`, `FHD`, `QHD`, or `4K`).
* **`background`**: Hexadecimal HTML color code for the recording canvas background (e.g., `#000000`).
* **`vad`**: When `true`, highlights the border of the currently speaking participant.
* **`labels`**: When `true`, displays participant display names over their video frames.
* **`layout`**: Layout mode (`'grid'`, `'tribune'`, or `'custom'`).

3. Instantiate the recorder and start recording when the conference begins:

```javascript title="3. Create recorder and attach to conference"
const recorder = VoxEngine.createRecorder(createRecorderParams);

conf.addEventListener(ConferenceEvents.Started, () => {
  // Start recording the conference stream
  conf.sendMediaTo(recorder);
});
```

Here is a complete scenario showing conference creation and mixed recording:

```javascript title="Complete conference recording scenario"
require(Modules.Conference);
require(Modules.Recorder);

let conference;
let recorder;
let isRecorderStopped = false;

VoxEngine.addEventListener(AppEvents.Started, () => {
  // create an empty conference on application started
  conference = VoxEngine.createConference({ hd_audio: true });

  // stop the recorder (or terminate the session) if the conference was stopped
  conference.addEventListener(ConferenceEvents.Stopped, () => {
    VoxEngine.terminate();
  });

  // stop the recorder (or terminate the session) if the conference was errored
  conference.addEventListener(ConferenceEvents.ConferenceError, () => {
    Logger.write('The conference error was handled!');
    // error handling
    VoxEngine.terminate();
  });

  // if there is no participants left, then stop the conference
  conference.addEventListener(ConferenceEvents.EndpointRemoved, () => {
    const hasActiveCalls = conference.getList().some((endpoint) => endpoint.getCall() !== null);

    if (!hasActiveCalls && !isRecorderStopped) {
      recorder.stop();
      isRecorderStopped = true;
    }
  });

  conference.addEventListener(ConferenceEvents.EndpointAdded, () => {
    // if this is the first conference participant, then create a new recorder
    if (!recorder) {
      const createRecorderParams = {
        video: true,
        expire: RecordExpireTime.THREEMONTHS,
        videoopt: {
          mixing: true,
          profile: 'hd',
          layout: 'grid',
          background: '#FFFFFF',
          vad: true,
          labels: true
        }
      };

      // create a new recorder instance
      recorder = VoxEngine.createRecorder(createRecorderParams);

      // stop the conference (or terminate the session) if the recorder was stopped
      recorder.addEventListener(RecorderEvents.Stopped, () => {
        conference.stop();
      });

      // stop the conference (or terminate the session) if the recorder was errored
      recorder.addEventListener(RecorderEvents.RecorderError, () => {
        Logger.write('The recorder error was handled!');
        // error handling
        VoxEngine.terminate();
      });

      recorder.addEventListener(RecorderEvents.Started, () => {
        // pass the conference object to the recorder
        recorder.setConference(conference);

        // send media from the conference to the recorder
        conference.sendMediaTo(recorder);

        // notify the conference participants that the conference is being recorded
        conference.getList().forEach((participant) => {
          participant.getCall().sendMessage(JSON.stringify({ command: 'record_started' }));
        });

        const updateRecorderParams = {
          layout: 'tribune',
          background: '#FF0000'
        };

        // dynamic recorder params changing
        setInterval(() => {
          recorder.update(updateRecorderParams);
          if (updateRecorderParams.layout === 'tribune') {
            updateRecorderParams.layout = 'grid';
            updateRecorderParams.background = '#FFFFFF';
          } else {
            updateRecorderParams.layout = 'tribune';
            updateRecorderParams.background = '#FF0000';
          }
        }, 5000);
      });
    }
  });
});

// add all new incoming calls to the conference
VoxEngine.addEventListener(AppEvents.CallAlerting, ({ call, scheme, displayName }) => {
  call.answer();

  const endpoint = conference.add({
    call,
    mode: 'FORWARD',
    direction: 'BOTH',
    scheme,
    displayName: displayName,
    maxVideoBitrate: 1200
  });

  Logger.write(`New endpoint was added: ${endpoint.id()}`);
});
```

<Info title="Post-processing duration">
Mixed conference recordings undergo transcoding before appearing in Call History. Processing typically takes approximately 1/5 of the total conference duration.
</Info>

---

## Managing layout priorities

By default, the video conference recorder orders participant panes chronologically based on when they joined. You can control which participant appears in the prominent frame (especially in `tribune` layout) by adjusting layout priorities.

To manage layout priorities, pass the conference instance to the recorder via `setConference()`:

```javascript title="Bind conference for priority management"
recorder.setConference(conf);
```

Manage priorities dynamically using the following methods:
* **`recorder.getPriority()`**: Returns an array of active endpoints in order of current priority.
* **`recorder.setPriority()`**: Accepts an ordered array of endpoints and updates layout positions in real time.

In `tribune` layout, the endpoint with the highest priority occupies the primary large pane:

```javascript title="Manage layout priorities"
require(Modules.Conference);
require(Modules.Recorder);

VoxEngine.addEventListener(AppEvents.Started, () => {
  // create an empty conference
  const conference = VoxEngine.createConference({ hd_audio: true });

  // terminate the session if a conference ends
  conference.addEventListener(ConferenceEvents.Stopped, () => {
    setTimeout(() => {
      VoxEngine.terminate();
    }, 1000);
  });

  //create a recorder instance
  let recorder;

  conference.addEventListener(ConferenceEvents.EndpointAdded, async () => {
    // if this is the first conference participant, then create a new recorder
    if (!recorder) {
      recorder = VoxEngine.createRecorder({
        video: true,
        videoParameters: {
          mixing: true,
          profile: RecorderProfile.HD,
          layout: RecorderLayout.tribune,
          background: '#FFFFFF',
          vad: { thickness: 1, color: '#b813ffff' },
          labels: {
            position: RecorderLabelPosition.BOTTOM_CENTER,
            textAlign: RecorderLabelTextAlign.TOP_CENTER
          }
        }
      });
      if ('setConference' in recorder) {
        recorder.setConference(conference);
      }
      conference.sendMediaTo(recorder);
      // notify the conference participants that the conference is being recorded
      conference.getList().forEach((participant) => {
        participant.getCall().sendMessage(JSON.stringify({ command: 'record_started' }));
      });
    }

    // get a list of all existing endpoints in the conference with a call object inside
    // the filter is to avoid non-call endpoints, like the recorder itself
    const endpoints = conference.getList().filter((endpoint) => endpoint.getCall());

    // invert the endpoints list order
    const priority = [];
    for (let i = endpoints.length - 1; i >= 0; i--) {
      priority.push(endpoints[i]);
    }

    // pass new priorities array to the recorder
    // use try..catch to catch any possible errors in your setup
    try {
      await recorder.setPriority(priority);
    } catch (err) {
      Logger.write(JSON.stringify(err));
    }
  });

  // add all new incoming calls to the conference
  VoxEngine.addEventListener(AppEvents.CallAlerting, ({ call, scheme, displayName }) => {
    call.answer();
    conference.add({
      call,
      mode: 'FORWARD',
      direction: 'BOTH',
      scheme,
      displayName,
      maxVideoBitrate: 1200
    });

    // if there is no participants left, then stop the conference
    call.addEventListener(CallEvents.Disconnected, () => {
      const callEndpointsCount = conference.getList().filter((endpoint) => endpoint.getCall())
        .length;

      if (callEndpointsCount === 1) {
        conference.stop();
      }
    });
  });
});
```

---

## AWS S3-compatible storage

By default, recordings are saved in the Voximplant Cloud. You can automatically export completed recordings directly to your own Amazon S3 or S3-compatible storage bucket (such as Google Cloud Storage or MinIO).

To configure custom storage buckets, refer to the [S3-compatible storage guide]().

---

## Troubleshooting recorder errors

Common causes of recording failures include:

* **Insufficient account balance**: If your account balance drops below zero during a session, ongoing recording operations may fail to finalize.
* **S3 permission failures**: If using external S3 storage, ensure your AWS IAM credentials grant `s3:PutObject` and `s3:AbortMultipartUpload` permissions on the target bucket.
* **Invalid video profiles**: Ensure profile identifiers (`HD`, `FHD`, `QHD`, `4K`) use exact case-sensitive strings.
* **Resource limit exceeded**: Sessions attempting to instantiate more than 10 media players or recorders will fail with resource allocation errors.

---

## Video conference recording billing

When recording a conference, charges consist of:
1. Video recording runtime
2. Video composition and cloud storage retention

Composition and storage pricing depends on your selected **video quality profile** and cloud **storage retention duration** (`expire`). Review current rates in the **Billing** section of the [Control Panel]().

---

## Call streaming

Voximplant allows you to stream live audio and video from an active call directly to external RTMP-compatible streaming platforms (such as YouTube Live, Twitch, or Restream.io).

Currently, the platform supports streaming a single **Call** object. Multi-party conference video mixing to external RTMP destinations is not currently supported.

### Obtaining RTMP streaming credentials

To stream from Voximplant to any external platform, you must obtain two parameters:
* **Server URL**: The RTMP ingest endpoint provided by the platform.
* **Stream name / Stream key**: The unique token that identifies your broadcast channel.

#### YouTube Live

To locate your RTMP credentials in YouTube:

1. Log in to your Google account and open **YouTube Studio**.
2. Click **Create** (the camera icon) in the upper-right corner and select **Go live**.
3. If live streaming has not been enabled on your channel previously, complete channel verification (activation can take up to 24 hours).
4. In the live stream control room settings, copy the **Stream URL** and **Stream key**.

#### Twitch

To locate your RTMP credentials in Twitch:

1. Log in to your Twitch account and open the **Creator Dashboard** (or **Video Producer**).
2. In the left navigation menu, go to **Settings** → **Stream**.
3. Copy your **Primary Stream Key** (note: two-factor authentication must be enabled on your account to view the key).
4. Select the closest RTMP ingest endpoint for your region from the [Twitch ingest recommendations]() list (for example, `rtmp://live-sfo.twitch.tv/app`). Do not include a trailing slash.

#### Restream.io

To broadcast across multiple social destinations simultaneously via Restream:

1. Log in to your Restream.io dashboard.
2. Click **Add Channel** to link target destinations (such as YouTube, Twitch, or Facebook).
3. In the streaming settings panel on the right side of the dashboard, copy your **RTMP URL** and **Stream Key**.
4. Select an ingest server location close to your traffic or keep it set to Autodetect.

### Streaming in a VoxEngine scenario

#### Prerequisites

Before setting up streaming in code:

1. Create an [application]().
2. Create a [scenario]().
3. Create a [routing rule]() and bind it to the scenario.
4. Create an application [user]() to authenticate your client SDK.

You also need a working client application capable of transmitting video. Refer to [Processing video calls in SDKs]() for client implementation details.

### Scenario setup

In your VoxEngine scenario, require the `StreamingAgent` module and create a streaming instance using [VoxEngine.createStreamingAgent]():

* Pass your RTMP server URL and stream key to the streaming agent configuration.
* Specify `H264` as your video codec. RTMP streaming requires the **H.264** codec.
* Send audio and video from the call to the streaming agent using [call.sendMediaTo()]().

```javascript title="Streaming scenario example"
require(Modules.StreamingAgent);

VoxEngine.setVideoCodec(VideoCodecs.H264);

VoxEngine.addEventListener(AppEvents.CallAlerting, function (e) {
  const streaming = VoxEngine.createStreamingAgent({
    protocol: 'RTMP',
    url: 'rtmp://live-sfo.twitch.tv/app',
    streamName: 'live_********************',
    keyframeInterval: 4,
  });

  e.call.sendMediaTo(streaming);

  e.call.answer();

  e.call.addEventListener(CallEvents.Disconnected, function (e) {
    setTimeout(VoxEngine.terminate, 6000);
  });
});

```