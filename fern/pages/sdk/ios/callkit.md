# CallKit

Integrating Voximplant with Apple's CallKit framework allows your application to blend seamlessly with the native iOS calling experience:

* Displays the native system incoming call interface (including on the lock screen and over other active applications).
* Displays native system in-call and failure screens when the device is locked.
* Resolves call contention across cellular calls and other VoIP apps (switching between calls, managing calls on hold, and call waiting).
* Integrates directly with native iOS Call History (Recents).
* Escalates audio session priority to the system maximum, preventing interruptions from other audio-playing apps.
* Respects system settings such as Do Not Disturb, Silent Mode, system volume, and blocked contact lists.
* Alerts users across connected accessories (Bluetooth, CarPlay, Apple Watch) using native ringing behavior.

You can explore a complete reference implementation in the [AudioCallKit demo]().

---

## Outgoing call integration with CallKit API

To make an outgoing call through CallKit, create a `CXStartCallAction` with a generated `UUID` and submit it to your `CXCallController` instance. 

You also follow this pattern when handling call initiation [through the native Phone app Recents tab or via Siri]():

<CodeBlocks>
```swift title="Swift"
let callController = CXCallController()

func startOutgoingCall(to contactUsername: String) {
    let uuid = UUID()
    let handle = CXHandle(type: .generic, value: contactUsername)
    let startCallAction = CXStartCallAction(call: uuid, handle: handle)
    let transaction = CXTransaction(action: startCallAction)

    callController.request(transaction) { error in
        if let error = error {
            // Handle transaction request error
        }
    }
}
```

```objc title="Objective-C"
CXCallController *callController = [[CXCallController alloc] init];

- (void)startOutgoingCallTo:(NSString *)contactUsername {
    NSUUID *uuid = [[NSUUID alloc] init];
    CXHandle *handle = [[CXHandle alloc] initWithType:CXHandleTypeGeneric value:contactUsername];
    CXStartCallAction *startOutgoingCall = [[CXStartCallAction alloc] initWithCallUUID:uuid handle:handle];
    CXTransaction *transaction = [[CXTransaction alloc] initWithAction:startOutgoingCall];

    [callController requestTransaction:transaction completion:^(NSError * _Nullable error) {
        if (error) {
            // Handle transaction request error
        }
    }];
}
```
</CodeBlocks>

After the transaction is requested, CallKit invokes `CXProviderDelegate.provider(_:perform:)` with the `CXStartCallAction`. Inside this delegate callback:

1. Create a [VICall]() instance using `VIClient.call()`.
2. Assign the [VICall.callKitUUID]() property from the action's `callUUID`.
3. Fulfill the action, start the call using [VICall.start](), and notify CallKit that connection has begun via `reportOutgoingCall(with:startedConnectingAt:)`:

<CodeBlocks>
```swift title="Swift"
var client: VIClient

func provider(_ callProvider: CXProvider, perform startCallAction: CXStartCallAction) {
    let callSettings = VICallSettings()
    callSettings.videoFlags = VIVideoFlags.videoFlags(receiveVideo: false, sendVideo: false)

    if let call: VICall = client.call(startCallAction.handle.value, settings: callSettings) {
        call.callKitUUID = startCallAction.callUUID
        startCallAction.fulfill()
        call.start()
        callProvider.reportOutgoingCall(with: call.callKitUUID, startedConnectingAt: nil)
    } else {
        // Fails if client is not logged in or arguments are invalid
        startCallAction.fail()
    }
}
```

```objc title="Objective-C"
VIClient *client;

- (void)provider:(CXProvider *)callProvider performStartCallAction:(CXStartCallAction *)startCallAction {
    VICallSettings *callSettings = [[VICallSettings alloc] init];
    callSettings.videoFlags = [VIVideoFlags videoFlagsWithReceiveVideo:NO sendVideo:NO];
    VICall *call = [client call:startCallAction.handle.value settings:callSettings];

    if (call) {
        call.callKitUUID = startCallAction.callUUID;
        [startCallAction fulfill];
        [call start];
        [callProvider reportOutgoingCallWithUUID:startCallAction.callUUID startedConnectingAtDate:nil];
    } else {
        // Fails if client is not logged in or arguments are invalid
        [startCallAction fail];
    }
}
```
</CodeBlocks>

When the call connects, the `VICallDelegate.call(_:didConnectWithHeaders:)` callback is triggered. Inform CallKit of the state transition so the system updates the in-call UI:

<CodeBlocks>
```swift title="Swift"
func call(_ call: VICall, didConnectWithHeaders headers: [AnyHashable: Any]?) {
    callProvider.reportOutgoingCall(with: call.callKitUUID, connectedAt: nil)
}
```

```objc title="Objective-C"
- (void)call:(VICall *)call didConnectWithHeaders:(NSDictionary *)headers {
    [callProvider reportOutgoingCallWithUUID:call.callKitUUID connectedAtDate:nil];
}
```
</CodeBlocks>

To update call metadata dynamically during a call (such as updating caller display names or video capabilities), create a `CXCallUpdate` object and call `CXProvider.reportCall`:

<CodeBlocks>
```swift title="Swift"
let callInfo = CXCallUpdate()
callInfo.hasVideo = false
callInfo.supportsHolding = true
callInfo.supportsGrouping = false
callInfo.supportsUngrouping = false
callInfo.supportsDTMF = true
callInfo.localizedCallerName = call.endpoints.first?.userDisplayName

callProvider.reportCall(with: call.callKitUUID, updated: callInfo)
```

```objc title="Objective-C"
CXCallUpdate *callInfo = [[CXCallUpdate alloc] init];
callInfo.hasVideo = NO;
callInfo.supportsHolding = YES;
callInfo.supportsGrouping = NO;
callInfo.supportsUngrouping = NO;
callInfo.supportsDTMF = YES;
callInfo.localizedCallerName = call.endpoints.firstObject.userDisplayName;

[callProvider reportCallWithUUID:call.callKitUUID updated:callInfo];
```
</CodeBlocks>

---

## Incoming call integration with CallKit API

When an incoming call arrives while the application is active or after processing a VoIP push notification, control transfers to the `client(_:didReceiveIncomingCall:withIncomingVideo:headers:)` delegate callback.

To present the native incoming call interface:

1. Retrieve the `callKitUUID` from the incoming [VICall]() object.
2. Extract caller identity information from the call endpoint.
3. Create a `CXCallUpdate` instance and report the incoming call to the system using `reportNewIncomingCall`:

<CodeBlocks>
```swift title="Swift"
func client(_ client: VIClient, didReceiveIncomingCall call: VICall, withIncomingVideo video: Bool, headers: [AnyHashable: Any]?) {
    guard let uuid = call.callKitUUID else { return }

    let username = call.endpoints.first?.user
    let displayName = call.endpoints.first?.userDisplayName

    let callInfo = CXCallUpdate()
    callInfo.remoteHandle = CXHandle(type: .generic, value: username ?? "")
    callInfo.localizedCallerName = displayName
    callInfo.hasVideo = video

    callProvider.reportNewIncomingCall(with: uuid, update: callInfo) { error in
        if let error = error {
            // CallKit may reject the incoming call (e.g., Do Not Disturb is active, or caller is blocked)
            call.reject(with: .decline, headers: nil)
        }
    }
}
```

```objc title="Objective-C"
- (void)client:(VIClient *)client didReceiveIncomingCall:(VICall *)call withIncomingVideo:(BOOL)video headers:(nullable NSDictionary *)headers {
    NSUUID *uuid = call.callKitUUID;
    NSString *username = call.endpoints.firstObject.user;
    NSString *displayName = call.endpoints.firstObject.userDisplayName;

    CXCallUpdate *callInfo = [[CXCallUpdate alloc] init];
    callInfo.remoteHandle = [[CXHandle alloc] initWithType:CXHandleTypeGeneric value:username];
    callInfo.localizedCallerName = displayName;
    callInfo.hasVideo = video;

    [callProvider reportNewIncomingCallWithUUID:uuid update:callInfo completion:^(NSError * _Nullable error) {
        if (error) {
            // CallKit may reject the incoming call (e.g., Do Not Disturb is active, or caller is blocked)
            [call rejectWithMode:VIRejectModeDecline headers:nil];
        }
    }];
}
```
</CodeBlocks>

When the user answers the call via the CallKit UI, CallKit triggers `provider(_:perform:)` with a `CXAnswerCallAction`:

<CodeBlocks>
```swift title="Swift"
func provider(_ callProvider: CXProvider, perform answerCallAction: CXAnswerCallAction) {
    let callSettings = VICallSettings()
    callSettings.videoFlags = VIVideoFlags.videoFlags(receiveVideo: false, sendVideo: false)

    call.answer(with: callSettings)
    answerCallAction.fulfill()
}
```

```objc title="Objective-C"
- (void)provider:(CXProvider *)callProvider performAnswerCallAction:(CXAnswerCallAction *)answerCallAction {
    VICallSettings *callSettings = [[VICallSettings alloc] init];
    callSettings.videoFlags = [VIVideoFlags videoFlagsWithReceiveVideo:NO sendVideo:NO];

    [call answerWithSettings:callSettings];
    [answerCallAction fulfill];
}
```
</CodeBlocks>

---

## Handling additional call actions

Telephony interactions initiated through the native iOS call screen are dispatched as descendant classes of `CXAction`. Upon completing an action successfully, call `action.fulfill()`. If an error occurs, call `action.fail()`.

For example, handling call hold actions via `CXSetHeldCallAction`:

<CodeBlocks>
```swift title="Swift"
func provider(_ callProvider: CXProvider, perform holdAction: CXSetHeldCallAction) {
    call.setHold(holdAction.isOnHold) { error in
        if let error = error {
            holdAction.fail()
        } else {
            holdAction.fulfill()
        }
    }
}
```

```objc title="Objective-C"
- (void)provider:(CXProvider *)callProvider performSetHeldCallAction:(CXSetHeldCallAction *)holdAction {
    [call setHold:holdAction.isOnHold completion:^(NSError * _Nullable error) {
        if (error) {
            [holdAction fail];
        } else {
            [holdAction fulfill];
        }
    }];
}
```
</CodeBlocks>

---

## Managing audio session privileges with CallKit

Audio session priorities escalate and de-escalate automatically when iOS coordinates audio through CallKit. This prevents background apps from interrupting an active call while automatically muting lower-priority audio sessions (such as music players or podcasts).

To ensure the Voximplant SDK coordinates correctly with CallKit's audio lifecycle, notify the SDK when CallKit activates or deactivates the audio session:

1. Configure the audio session on application startup:

<CodeBlocks>
```swift title="Swift"
VIAudioManager.shared().callKitConfigureAudioSession(nil)
```

```objc title="Objective-C"
[VIAudioManager.sharedAudioManager callKitConfigureAudioSession:nil];
```
</CodeBlocks>

2. Notify [VIAudioManager]() when the system activates or deactivates the audio session inside `CXProviderDelegate` callbacks using [callKitStartAudio]() and [callKitStopAudio]():

<CodeBlocks>
```swift title="Swift"
func provider(_ provider: CXProvider, didActivate audioSession: AVAudioSession) {
    VIAudioManager.shared().callKitStartAudio()
}

func provider(_ provider: CXProvider, didDeactivate audioSession: AVAudioSession) {
    VIAudioManager.shared().callKitStopAudio()
}
```

```objc title="Objective-C"
- (void)provider:(CXProvider *)provider didActivateAudioSession:(AVAudioSession *)audioSession {
    [[VIAudioManager sharedAudioManager] callKitStartAudio];
}

- (void)provider:(CXProvider *)provider didDeactivateAudioSession:(AVAudioSession *)audioSession {
    [[VIAudioManager sharedAudioManager] callKitStopAudio];
}
```
</CodeBlocks>

---

## See also

* [CallKit integration for Flutter applications on iOS]()