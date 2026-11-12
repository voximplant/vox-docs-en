# Voice and video calls

Learn how to implement outbound and inbound voice and video calls in React Native applications for iOS and Android using the Voximplant React Native SDK.

Before getting started, ensure you have installed `@voximplant/react-native-core` and `@voximplant/react-native-calls`, connected to the cloud, and logged in. Refer to the [React Native SDK quickstart]() and [iOS configuration guide]().

---

## Cloud scenario requirements

Every call made or received by the React Native SDK interacts with a VoxEngine cloud scenario through a [routing rule]().

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

To make an outgoing call, obtain the client instance, prepare call settings, and call `client.call()`.

### 1. Place a voice call

For voice-only calls, disable video flags:

```javascript title="Place an outgoing voice call"
import { Client } from "@voximplant/react-native-core";
import { Voximplant } from "react-native-voximplant";

const placeVoiceCall = async (destination) => {
  const client = Client.getInstance();

  const callSettings = {
    video: {
      sendVideo: false,
      receiveVideo: false
    }
  };

  const call = await client.call(destination, callSettings);

  call.on(Voximplant.CallEvents.Connected, () => {
    console.log("Call connected");
  });

  call.on(Voximplant.CallEvents.Disconnected, () => {
    console.log("Call disconnected");
  });

  call.on(Voximplant.CallEvents.Failed, (event) => {
    console.error("Call failed:", event.reason);
  });
};
```

### 2. Place a video call

To place a video call:

1. Enable video flags in `callSettings`.
2. Track local and remote video stream IDs via call events.
3. Render the video streams using the native `<Voximplant.VideoView />` component:

```javascript title="Place an outgoing video call and render streams"
import React from "react";
import { View, StyleSheet } from "react-native";
import { Client } from "@voximplant/react-native-core";
import { Voximplant } from "react-native-voximplant";

export default class VideoCallScreen extends React.Component {
  state = {
    localVideoStreamId: null,
    remoteVideoStreamId: null
  };

  async componentDidMount() {
    const client = Client.getInstance();

    const callSettings = {
      video: {
        sendVideo: true,
        receiveVideo: true
      }
    };

    const call = await client.call("destination", callSettings);
    this.call = call;

    // Capture local video stream ID
    call.on(Voximplant.CallEvents.LocalVideoStreamAdded, (event) => {
      this.setState({ localVideoStreamId: event.videoStream.id });
    });

    // Capture remote participant video stream ID
    call.on(Voximplant.CallEvents.EndpointAdded, (endpointEvent) => {
      endpointEvent.endpoint.on(
        Voximplant.EndpointEvents.RemoteVideoStreamAdded,
        (streamEvent) => {
          this.setState({ remoteVideoStreamId: streamEvent.videoStream.id });
        }
      );
    });

    call.on(Voximplant.CallEvents.Connected, () => {
      console.log("Video call connected");
    });
  }

  render() {
    return (
      <View style={styles.container}>
        {this.state.remoteVideoStreamId && (
          <Voximplant.VideoView
            style={styles.remoteVideo}
            videoStreamId={this.state.remoteVideoStreamId}
            scaleType={Voximplant.RenderScaleType.SCALE_FIT}
          />
        )}
        {this.state.localVideoStreamId && (
          <Voximplant.VideoView
            style={styles.localVideo}
            videoStreamId={this.state.localVideoStreamId}
            scaleType={Voximplant.RenderScaleType.SCALE_FIT}
            showOnTop={true}
          />
        )}
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  remoteVideo: { flex: 1 },
  localVideo: { width: 120, height: 160, position: "absolute", top: 40, right: 20 }
});
```

---

## Process an incoming call

Listen for incoming calls by subscribing to `ClientEvent.IncomingCall` on the client.

### 1. Answer or decline a voice call

```javascript title="Handle incoming voice call"
client.on(Voximplant.ClientEvents.IncomingCall, (event) => {
  const call = event.call;

  const answerCall = async () => {
    await call.answer({
      video: { sendVideo: false, receiveVideo: false }
    });
  };

  const declineCall = () => {
    call.decline();
  };
});
```

### 2. Answer a video call

To answer an incoming call with video, pass enabled video flags to `call.answer()` and bind the stream IDs to state:

```javascript title="Handle incoming video call"
client.on(Voximplant.ClientEvents.IncomingCall, (event) => {
  const call = event.call;

  const answerVideoCall = async () => {
    call.on(Voximplant.CallEvents.LocalVideoStreamAdded, (streamEvent) => {
      this.setState({ localVideoStreamId: streamEvent.videoStream.id });
    });

    call.on(Voximplant.CallEvents.EndpointAdded, (endpointEvent) => {
      endpointEvent.endpoint.on(
        Voximplant.EndpointEvents.RemoteVideoStreamAdded,
        (streamEvent) => {
          this.setState({ remoteVideoStreamId: streamEvent.videoStream.id });
        }
      );
    });

    await call.answer({
      video: { sendVideo: true, receiveVideo: true }
    });
  };
});
```

---

## Download demo projects

Explore complete reference applications implementing voice and video calls with React Native:

* [React Native Demo Repository]()