# Voice and video calls

Learn how to implement outbound and inbound voice and video calls in cross-platform Flutter applications using the Voximplant Flutter SDK (`flutter_voximplant`).

Before getting started, ensure you have added the plugin, configured platform permissions, connected to the cloud, and logged in. Refer to the [Flutter SDK quickstart]().

---

## Cloud scenario requirements

Every call made or received by the Flutter SDK interacts with a VoxEngine cloud scenario through a [routing rule]().

Calls initiated from the SDK consist of two call legs:
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

To make an outgoing call, instantiate `VICallSettings`, configure video flags, and call `client.call()`.

### 1. Place a voice call

For voice-only calls, disable video flags:

```dart title="Place an outgoing voice call"
import 'package:flutter_voximplant/flutter_voximplant.dart';

Future<void> makeVoiceCall(VIClient client, String destination) async {
  final callSettings = VICallSettings();
  callSettings.videoFlags = VIVideoFlags(receiveVideo: false, sendVideo: false);

  final call = await client.call(destination, callSettings);

  call.onCallConnected = (call, headers) {
    print("Call connected");
  };

  call.onCallDisconnected = (call, headers, answeredElsewhere) {
    print("Call disconnected");
  };

  call.onCallFailed = (call, code, description, headers) {
    print("Call failed: $description (code: $code)");
  };
}
```

### 2. Place a video call

To place a video call:

1. Enable video flags on `VICallSettings`.
2. Manage stream rendering using `VIVideoViewController`.
3. Display video streams using the native `VIVideoView` widget:

```dart title="Place an outgoing video call and render streams"
import 'package:flutter/material.dart';
import 'package:flutter_voximplant/flutter_voximplant.dart';

class VideoCallPage extends StatefulWidget {
  final VIClient client;
  final String destination;

  const VideoCallPage({Key? key, required this.client, required this.destination}) : super(key: key);

  @override
  State<VideoCallPage> createState() => _VideoCallPageState();
}

class _VideoCallPageState extends State<VideoCallPage> {
  final VIVideoViewController _localVideoController = VIVideoViewController();
  final VIVideoViewController _remoteVideoController = VIVideoViewController();
  VICall? _call;

  @override
  void initState() {
    super.initState();
    _startCall();
  }

  Future<void> _startCall() async {
    final callSettings = VICallSettings();
    callSettings.videoFlags = VIVideoFlags(receiveVideo: true, sendVideo: true);

    final call = await widget.client.call(widget.destination, callSettings);
    setState(() => _call = call);

    // Bind local camera stream to controller
    call.onLocalVideoStreamAdded = (call, videoStream) {
      _localVideoController.streamId = videoStream.streamId;
    };

    // Bind remote participant stream to controller
    call.onEndpointAdded = (call, endpoint) {
      endpoint.onRemoteVideoStreamAdded = (endpoint, videoStream) {
        _remoteVideoController.streamId = videoStream.streamId;
      };
    };

    call.onCallConnected = (call, headers) {
      print("Video call connected");
    };
  }

  @override
  void dispose() {
    _localVideoController.dispose();
    _remoteVideoController.dispose();
    _call?.hangup();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Stack(
        children: [
          Positioned.fill(
            child: VIVideoView(_remoteVideoController),
          ),
          Positioned(
            top: 40,
            right: 20,
            width: 120,
            height: 160,
            child: VIVideoView(_localVideoController),
          ),
        ],
      ),
    );
  }
}
```

---

## Process an incoming call

Handle incoming calls by listening to `onIncomingCall` on your `VIClient` instance.

### 1. Answer or decline a voice call

```dart title="Handle incoming voice call"
widget.client.onIncomingCall = (client, call, video, headers) async {
  // To answer:
  final callSettings = VICallSettings();
  callSettings.videoFlags = VIVideoFlags(receiveVideo: false, sendVideo: false);
  await call.answer(callSettings);

  // Or to decline:
  // await call.decline();
};
```

### 2. Answer a video call

To answer an incoming call with video, pass enabled video flags to `call.answer()` and bind video stream controllers:

```dart title="Handle incoming video call"
widget.client.onIncomingCall = (client, call, video, headers) async {
  call.onLocalVideoStreamAdded = (call, videoStream) {
    _localVideoController.streamId = videoStream.streamId;
  };

  call.onEndpointAdded = (call, endpoint) {
    endpoint.onRemoteVideoStreamAdded = (endpoint, videoStream) {
      _remoteVideoController.streamId = videoStream.streamId;
    };
  };

  final callSettings = VICallSettings();
  callSettings.videoFlags = VIVideoFlags(receiveVideo: true, sendVideo: true);
  await call.answer(callSettings);
};
```

---

## Download demo projects

Explore complete reference applications implementing voice and video calls with the Flutter SDK:

* [Flutter Audio Call Demo]()
* [Flutter Video Call Demo]()