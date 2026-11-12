# Voice and video calls

Learn how to implement outbound and inbound voice and video calls in native Apple applications using the Voximplant iOS SDK.

Before getting started, ensure you have integrated the SDK and configured camera and microphone permissions in your application target. Refer to the [iOS SDK quickstart]() and [iOS permissions guide]().

---

## Cloud scenario requirements

Every call made or received by the iOS SDK interacts with a VoxEngine cloud scenario through a [routing rule]().

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

To place an outgoing call, configure `VICallSettings`, obtain a `VICall` instance from `VIClient`, assign your class as the `VICallDelegate`, and call `start()`.

### 1. Place a voice call

<CodeBlocks>
```swift title="Swift"
import VoximplantCore
import VoximplantCalls

class CallManager: NSObject, VICallDelegate {
    private let client = VIClient.shared
    private var call: VICall?

    func makeVoiceCall(to destination: String) {
        let settings = VICallSettings()
        settings.videoFlags = VIVideoFlags.videoFlags(receiveVideo: false, sendVideo: false)

        guard let newCall = client.call(destination, settings: settings) else {
            print("Failed to create call")
            return
        }

        self.call = newCall
        newCall.add(self)
        newCall.start()
    }

    // MARK: - VICallDelegate
    func call(_ call: VICall, didConnectWithHeaders headers: [AnyHashable: Any]?) {
        print("Call connected")
    }

    func call(_ call: VICall, didDisconnectWithHeaders headers: [AnyHashable: Any]?, answeredElsewhere: NSNumber) {
        print("Call disconnected")
    }

    func call(_ call: VICall, didFailWithError error: Error, headers: [AnyHashable: Any]?) {
        print("Call failed with error: \(error.localizedDescription)")
    }
}
```

```objc title="Objective-C"
@interface CallManager () <VICallDelegate>
@property (nonatomic, strong) VIClient *client;
@property (nonatomic, strong) VICall *call;
@end

@implementation CallManager

- (void)makeVoiceCallTo:(NSString *)destination {
    VICallSettings *settings = [[VICallSettings alloc] init];
    settings.videoFlags = [VIVideoFlags videoFlagsWithReceiveVideo:NO sendVideo:NO];

    self.call = [self.client call:destination settings:settings];
    if (self.call) {
        [self.call addDelegate:self];
        [self.call start];
    }
}

// MARK: - VICallDelegate
- (void)call:(VICall *)call didConnectWithHeaders:(NSDictionary *)headers {
    NSLog(@"Call connected");
}

- (void)call:(VICall *)call didDisconnectWithHeaders:(NSDictionary *)headers answeredElsewhere:(NSNumber *)answeredElsewhere {
    NSLog(@"Call disconnected");
}

- (void)call:(VICall *)call didFailWithError:(NSError *)error headers:(NSDictionary *)headers {
    NSLog(@"Call failed: %@", error.localizedDescription);
}

@end
```
</CodeBlocks>

### 2. Place a video call

To place a video call:

1. **Prepare UI container views**: Create `UIView` containers in your UI layout to hold local camera and remote participant streams.
2. **Configure call settings**: Enable video flags on `VICallSettings`.
3. **Render local and remote streams**: Use `VIVideoRendererView` to project video streams onto your container views:

<CodeBlocks>
```swift title="Swift"
import VoximplantCore
import VoximplantCalls

class VideoCallViewController: UIViewController, VICallDelegate, VIEndpointDelegate {
    @IBOutlet weak var localVideoContainer: UIView!
    @IBOutlet weak var remoteVideoContainer: UIView!

    private let client = VIClient.shared
    private var call: VICall?

    func makeVideoCall(to destination: String) {
        let settings = VICallSettings()
        settings.videoFlags = VIVideoFlags.videoFlags(receiveVideo: true, sendVideo: true)

        guard let newCall = client.call(destination, settings: settings) else { return }

        self.call = newCall
        newCall.add(self)
        newCall.start()
    }

    // MARK: - Render Local Video Stream
    func call(_ call: VICall, didAddLocalVideoStream videoStream: VILocalVideoStream) {
        let renderer = VIVideoRendererView(containerView: localVideoContainer)
        renderer.resizeMode = .fill
        videoStream.addRenderer(renderer)
    }

    // MARK: - Handle Remote Endpoints
    func call(_ call: VICall, didAdd endpoint: VIEndpoint) {
        endpoint.delegate = self
    }

    // MARK: - Render Remote Video Stream
    func endpoint(_ endpoint: VIEndpoint, didAddRemoteVideoStream videoStream: VIRemoteVideoStream) {
        let renderer = VIVideoRendererView(containerView: remoteVideoContainer)
        renderer.resizeMode = .fit
        videoStream.addRenderer(renderer)
    }

    func call(_ call: VICall, didConnectWithHeaders headers: [AnyHashable: Any]?) {
        print("Video call connected")
    }
}
```

```objc title="Objective-C"
@interface VideoCallViewController () <VICallDelegate, VIEndpointDelegate>
@property (nonatomic, weak) IBOutlet UIView *localVideoContainer;
@property (nonatomic, weak) IBOutlet UIView *remoteVideoContainer;
@property (nonatomic, strong) VIClient *client;
@property (nonatomic, strong) VICall *call;
@end

@implementation VideoCallViewController

- (void)makeVideoCallTo:(NSString *)destination {
    VICallSettings *settings = [[VICallSettings alloc] init];
    settings.videoFlags = [VIVideoFlags videoFlagsWithReceiveVideo:YES sendVideo:YES];

    self.call = [self.client call:destination settings:settings];
    if (self.call) {
        [self.call addDelegate:self];
        [self.call start];
    }
}

// Render local camera stream
- (void)call:(VICall *)call didAddLocalVideoStream:(VILocalVideoStream *)videoStream {
    VIVideoRendererView *renderer = [[VIVideoRendererView alloc] initWithContainerView:self.localVideoContainer];
    [videoStream addRenderer:renderer];
}

// Handle remote endpoint
- (void)call:(VICall *)call didAddEndpoint:(VIEndpoint *)endpoint {
    endpoint.delegate = self;
}

// Render remote participant stream
- (void)endpoint:(VIEndpoint *)endpoint didAddRemoteVideoStream:(VIRemoteVideoStream *)videoStream {
    VIVideoRendererView *renderer = [[VIVideoRendererView alloc] initWithContainerView:self.remoteVideoContainer];
    [videoStream addRenderer:renderer];
}

@end
```
</CodeBlocks>

---

## Process an incoming call

To receive incoming calls, assign your class as the delegate for `VIClient` or `VICallManager` to listen for incoming call notifications.

### 1. Answer or decline a voice call

<CodeBlocks>
```swift title="Swift"
class IncomingCallHandler: NSObject, VIClientCallManagerDelegate {
    private var activeCall: VICall?

    func client(_ client: VIClient, didReceiveIncomingCall call: VICall, withIncomingVideo video: Bool, headers: [AnyHashable: Any]?) {
        self.activeCall = call

        // Example: Answer voice call
        let settings = VICallSettings()
        settings.videoFlags = VIVideoFlags.videoFlags(receiveVideo: false, sendVideo: false)
        call.answer(with: settings)

        // Or to decline:
        // call.reject(with: .decline, headers: nil)
    }
}
```

```objc title="Objective-C"
@interface IncomingCallHandler () <VIClientCallManagerDelegate>
@property (nonatomic, strong) VICall *activeCall;
@end

@implementation IncomingCallHandler

- (void)client:(VIClient *)client didReceiveIncomingCall:(VICall *)call withIncomingVideo:(BOOL)video headers:(NSDictionary *)headers {
    self.activeCall = call;

    // Answer call
    VICallSettings *settings = [[VICallSettings alloc] init];
    settings.videoFlags = [VIVideoFlags videoFlagsWithReceiveVideo:NO sendVideo:NO];
    [call answerWithSettings:settings];

    // Or decline:
    // [call rejectWithMode:VIRejectModeDecline headers:nil];
}

@end
```
</CodeBlocks>

### 2. Answer a video call

To answer an incoming call with video, pass enabled video flags to `call.answer(with:)`, subscribe as `VICallDelegate`, and bind the video renderers:

<CodeBlocks>
```swift title="Swift"
extension VideoCallViewController: VIClientCallManagerDelegate {
    func client(_ client: VIClient, didReceiveIncomingCall call: VICall, withIncomingVideo video: Bool, headers: [AnyHashable: Any]?) {
        self.call = call
        call.add(self)

        let settings = VICallSettings()
        settings.videoFlags = VIVideoFlags.videoFlags(receiveVideo: true, sendVideo: true)

        call.answer(with: settings)
    }

    @IBAction func declineTapped(_ sender: Any) {
        call?.reject(with: .decline, headers: nil)
    }
}
```

```objc title="Objective-C"
- (void)client:(VIClient *)client didReceiveIncomingCall:(VICall *)call withIncomingVideo:(BOOL)video headers:(NSDictionary *)headers {
    self.call = call;
    [call addDelegate:self];

    VICallSettings *settings = [[VICallSettings alloc] init];
    settings.videoFlags = [VIVideoFlags videoFlagsWithReceiveVideo:YES sendVideo:YES];

    [call answerWithSettings:settings];
}

- (IBAction)declineTapped:(id)sender {
    [self.call rejectWithMode:VIRejectModeDecline headers:nil];
}
```
</CodeBlocks>

---

## Download demo projects

Explore complete reference applications implementing voice and video calls with native Apple frameworks and CallKit integration:

* [iOS SDK Audio Call Demo]()
* [iOS SDK Audio CallKit Demo]()
* [iOS SDK Video Call Demo]()
* [iOS SDK Video CallKit Demo]()