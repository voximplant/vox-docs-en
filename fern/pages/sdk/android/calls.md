# Voice and video calls

Learn how to implement outbound and inbound voice and video calls in native Android applications using the Voximplant Android SDK.

Before getting started, ensure you have initialized `VICore` in your `Application` class, connected to the cloud, and authenticated a user. Refer to the [Android SDK quickstart]() and [Android permissions guide]().

---

## Cloud scenario requirements

Every call made or received by the Android SDK interacts with a VoxEngine cloud scenario through a [routing rule]().

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

To make an outgoing call, configure `CallSettings`, pass the destination to `client.call()`, and start the call.

### 1. Place a voice call

For voice-only calls, disable video flags in your call settings:

<CodeBlocks>
```kotlin title="Kotlin"
val callSettings = CallSettings().apply {
    videoFlags = VideoFlags(false, false)
}

val call = client.call("destination", callSettings)

try {
    call.addCallListener(object : ICallListener {
        override fun onCallConnected(call: ICall, headers: Map<String, String>?) {
            println("Call connected")
        }

        override fun onCallDisconnected(call: ICall, headers: Map<String, String>?, answeredElsewhere: Boolean) {
            println("Call disconnected")
        }

        override fun onCallFailed(call: ICall, code: Int, description: String, headers: Map<String, String>?) {
            println("Call failed: $description (code: $code)")
        }
    })
    call.start()
} catch (e: CallException) {
    println("Failed to start call: ${e.message}")
}
```

```java title="Java"
CallSettings callSettings = new CallSettings();
callSettings.videoFlags = new VideoFlags(false, false);

ICall call = client.call("destination", callSettings);

try {
    call.addCallListener(new ICallListener() {
        @Override
        public void onCallConnected(ICall call, Map<String, String> headers) {
            System.out.println("Call connected");
        }

        @Override
        public void onCallDisconnected(ICall call, Map<String, String> headers, boolean answeredElsewhere) {
            System.out.println("Call disconnected");
        }

        @Override
        public void onCallFailed(ICall call, int code, String description, Map<String, String> headers) {
            System.out.println("Call failed: " + description + " (code: " + code + ")");
        }
    });
    call.start();
} catch (CallException e) {
    System.out.println("Failed to start call: " + e.getMessage());
}
```
</CodeBlocks>

### 2. Place a video call

To place a video call:

1. **Request runtime permissions**: Ensure both `RECORD_AUDIO` and `CAMERA` permissions are granted before initiating the call.

<Warning title="Android runtime permissions">
Ensure both camera and microphone runtime permissions are granted before starting a video call. If permissions are missing, the SDK throws a `CallError.MISSING_PERMISSION` exception.
</Warning>

2. **Prepare layout video renderers**: Declare `SurfaceViewRenderer` elements in your layout XML:

```xml title="activity_call.xml"
<org.webrtc.SurfaceViewRenderer
    android:id="@+id/remote_video_view"
    android:layout_width="match_parent"
    android:layout_height="match_parent" />

<org.webrtc.SurfaceViewRenderer
    android:id="@+id/local_video_view"
    android:layout_width="120dp"
    android:layout_height="160dp"
    android:layout_gravity="top|end" />
```

3. **Configure call settings and bind renderers**: Enable video flags and subscribe to stream events to render camera feeds:

<CodeBlocks>
```kotlin title="Kotlin"
class VideoCallActivity : AppCompatActivity(), ICallListener, IEndpointListener {
    private var call: ICall? = null
    private lateinit var localRenderer: SurfaceViewRenderer
    private lateinit var remoteRenderer: SurfaceViewRenderer

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_call)

        localRenderer = findViewById(R.id.local_video_view)
        remoteRenderer = findViewById(R.id.remote_video_view)

        makeVideoCall("destination")
    }

    private fun makeVideoCall(destination: String) {
        val callSettings = CallSettings().apply {
            videoFlags = VideoFlags(true, true)
        }

        val newCall = client.call(destination, callSettings)
        this.call = newCall

        newCall.addCallListener(this)
        try {
            newCall.start()
        } catch (e: CallException) {
            println("Call error: ${e.message}")
        }
    }

    // Render local camera stream
    override fun onLocalVideoStreamAdded(call: ICall, videoStream: IVideoStream) {
        videoStream.addVideoRenderer(localRenderer, RenderScaleType.SCALE_FIT)
    }

    // Handle remote participant endpoint
    override fun onEndpointAdded(call: ICall, endpoint: IEndpoint) {
        endpoint.setEndpointListener(this)
    }

    // Render remote participant video stream
    override fun onRemoteVideoStreamAdded(endpoint: IEndpoint, videoStream: IVideoStream) {
        videoStream.addVideoRenderer(remoteRenderer, RenderScaleType.SCALE_FIT)
    }
}
```

```java title="Java"
public class VideoCallActivity extends AppCompatActivity implements ICallListener, IEndpointListener {
    private ICall call;
    private SurfaceViewRenderer localRenderer;
    private SurfaceViewRenderer remoteRenderer;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_call);

        localRenderer = findViewById(R.id.local_video_view);
        remoteRenderer = findViewById(R.id.remote_video_view);

        makeVideoCall("destination");
    }

    private void makeVideoCall(String destination) {
        CallSettings callSettings = new CallSettings();
        callSettings.videoFlags = new VideoFlags(true, true);

        ICall newCall = client.call(destination, callSettings);
        this.call = newCall;

        newCall.addCallListener(this);
        try {
            newCall.start();
        } catch (CallException e) {
            System.out.println("Call error: " + e.getMessage());
        }
    }

    // Render local camera stream
    @Override
    public void onLocalVideoStreamAdded(ICall call, IVideoStream videoStream) {
        videoStream.addVideoRenderer(localRenderer, RenderScaleType.SCALE_FIT);
    }

    // Handle remote participant endpoint
    @Override
    public void onEndpointAdded(ICall call, IEndpoint endpoint) {
        endpoint.setEndpointListener(this);
    }

    // Render remote participant video stream
    @Override
    public void onRemoteVideoStreamAdded(IEndpoint endpoint, IVideoStream videoStream) {
        videoStream.addVideoRenderer(remoteRenderer, RenderScaleType.SCALE_FIT);
    }
}
```
</CodeBlocks>

---

## Process an incoming call

To receive calls, your user must be logged in. Subscribe to the `onIncomingCall` callback on `IClientIncomingCallListener`.

### 1. Answer or decline a voice call

<CodeBlocks>
```kotlin title="Kotlin"
val incomingCallListener = object : IClientIncomingCallListener {
    override fun onIncomingCall(call: ICall, video: Boolean, headers: Map<String, String>?) {
        // Answer voice call
        try {
            val callSettings = CallSettings().apply {
                videoFlags = VideoFlags(false, false)
            }
            call.answer(callSettings)
        } catch (e: CallException) {
            println("Answer error: ${e.message}")
        }

        // Or to decline:
        // call.reject(RejectMode.DECLINE, null)
    }
}
```

```java title="Java"
IClientIncomingCallListener incomingCallListener = new IClientIncomingCallListener() {
    @Override
    public void onIncomingCall(ICall call, boolean video, Map<String, String> headers) {
        // Answer voice call
        try {
            CallSettings callSettings = new CallSettings();
            callSettings.videoFlags = new VideoFlags(false, false);
            call.answer(callSettings);
        } catch (CallException e) {
            System.out.println("Answer error: " + e.getMessage());
        }

        // Or to decline:
        // call.reject(RejectMode.DECLINE, null);
    }
};
```
</CodeBlocks>

### 2. Answer a video call

To answer an incoming call with video, pass enabled video flags to `call.answer()` and bind the stream renderers:

<CodeBlocks>
```kotlin title="Kotlin"
override fun onIncomingCall(call: ICall, video: Boolean, headers: Map<String, String>?) {
    this.call = call
    call.addCallListener(this)

    val callSettings = CallSettings().apply {
        videoFlags = VideoFlags(true, true)
    }

    try {
        call.answer(callSettings)
    } catch (e: CallException) {
        println("Answer error: ${e.message}")
    }
}
```

```java title="Java"
@Override
public void onIncomingCall(ICall call, boolean video, Map<String, String> headers) {
    this.call = call;
    call.addCallListener(this);

    CallSettings callSettings = new CallSettings();
    callSettings.videoFlags = new VideoFlags(true, true);

    try {
        call.answer(callSettings);
    } catch (CallException e) {
        System.out.println("Answer error: " + e.getMessage());
    }
}
```
</CodeBlocks>

---

## Download demo projects

Explore complete reference applications implementing voice and video calls with the Android SDK:

* [Android SDK Audio Call Demo]()
* [Android SDK Video Call Demo]()