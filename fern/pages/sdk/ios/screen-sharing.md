# Screen sharing

The Voximplant iOS SDK supports two screen sharing mechanisms depending on your application requirements:

* **In-app screen sharing**: Streams only the UI views belonging to your host application (e.g., for customer support or co-browsing in a banking app).
* **Broadcast screen sharing**: Streams the entire device screen, including the home screen, notifications, and other third-party apps, using an Apple Broadcast Upload Extension.

Screen sharing requires **iOS 11.0** or higher.

---

## In-app screen sharing

In-app screen sharing captures only views rendered inside your application process. To start sharing, call [startInAppScreenSharing()]() on the active `VICall` instance:

<CodeBlocks>
```swift title="Swift"
call.startInAppScreenSharing { error in
    if let error = error {
        // Failed to start screen sharing
        return
    }
    // Screen sharing started successfully
}
```

```objc title="Objective-C"
[call startInAppScreenSharing:^(NSError * _Nullable error) {
    if (error) {
        // Failed to start screen sharing
    } else {
        // Screen sharing started successfully
    }
}];
```
</CodeBlocks>

The system presents an iOS permission prompt to the user. User approval is session-based and must be requested on each application launch.

To stop sharing, call [setSendVideo()]():
* Pass `true` to stop screen sharing and resume sending camera video.
* Pass `false` to stop screen sharing and mute all outgoing video.

---

## Broadcast screen sharing

Broadcast screen sharing captures the complete system screen.

<Warning title="Conference requirement">
Broadcast screen sharing on iOS is supported exclusively in multi-party [conferences]() because Apple renders and processes broadcast frames inside an independent operating system extension process.
</Warning>

### 1. Add a Broadcast Upload Extension in Xcode

1. Open your project in Xcode.
2. Navigate to **File** → **New** → **Target**.
3. Select **Broadcast Upload Extension** and click **Next**.
4. Enter a target name (e.g., `ScreenShareExtension`) and uncheck **Include UI Extension**.
5. Click **Finish**.

### 2. Present the broadcast picker

To initiate the broadcast, users can:
* Use the system Control Center screen recording toggle (iOS 11+).
* Tap an in-app [RPSystemBroadcastPickerView]() button (iOS 12+).

### 3. Authenticate in the extension

When the user starts broadcasting, control transfers to `RPBroadcastSampleHandler.broadcastStarted(withSetupInfo:)`.

Because the extension runs in an isolated process, configure an **App Group** to share credentials (such as an access token and `roomId`) between your main app and the extension:

<CodeBlocks>
```swift title="Swift"
class SampleHandler: RPBroadcastSampleHandler, VIClientSessionDelegate {
    let client = VIClient.shared

    override func broadcastStarted(withSetupInfo setupInfo: [String: NSObject]?) {
        client.delegate = self
        client.connect()
    }

    func clientSessionDidConnect(_ client: VIClient) {
        // Token-based login is recommended
        client.login(withUser: username, token: accessToken, success: { displayName, authParams in
            self.startScreenSharingCall()
        }, failure: { error in
            // Handle error
        })
    }
}
```

```objc title="Objective-C"
@interface SampleHandler () <VIClientSessionDelegate>
@property (strong, nonatomic) VIClient *client;
@end

@implementation SampleHandler

- (void)broadcastStartedWithSetupInfo:(NSDictionary<NSString *, NSObject *> *)setupInfo {
    self.client = [VIClient shared];
    self.client.delegate = self;
    [self.client connect];
}

- (void)clientSessionDidConnect:(VIClient *)client {
    [self.client loginWithUser:username token:accessToken success:^(NSString *displayName, VIAuthParams *authParams) {
        [self startScreenSharingCall];
    } failure:^(NSError *error) {
        // Handle error
    }];
}

@end
```
</CodeBlocks>

### 4. Configure the screen sharing call

App extensions are subject to a strict **50 MB RAM limit** enforced by iOS. To stay within this boundary:
* Disable incoming audio (`receiveAudio = false`)
* Disable incoming video (`receiveVideo: false`)
* Disable outgoing audio (`sendAudio = false`)
* Force the video codec to **H.264**

<CodeBlocks>
```swift title="Swift"
let screenVideoSource = VICustomVideoSource(screenCastFormat: ())

func startScreenSharingCall() {
    let settings = VICallSettings()
    settings.preferredVideoCodec = .H264
    settings.receiveAudio = false
    settings.videoFlags = VIVideoFlags.videoFlags(receiveVideo: false, sendVideo: true)

    if let screenCall = client.callConference(roomId, settings: settings) {
        screenCall.videoSource = screenVideoSource
        screenCall.sendAudio = false
        screenCall.start()
    }
}
```

```objc title="Objective-C"
VICustomVideoSource *screenVideoSource = [VICustomVideoSource initScreenCastFormat];

- (void)startScreenSharingCall {
    VICallSettings *settings = [[VICallSettings alloc] init];
    settings.preferredVideoCodec = VIVideoCodecH264;
    settings.receiveAudio = NO;
    settings.videoFlags = [VIVideoFlags videoFlagsWithReceiveVideo:NO sendVideo:YES];

    VICall *screenCall = [self.client callConference:roomId settings:settings];
    if (screenCall) {
        screenCall.videoSource = screenVideoSource;
        screenCall.sendAudio = NO;
        [screenCall start];
    }
}
```
</CodeBlocks>

### 5. Process and stream sample buffers

In `processSampleBuffer(_:with:)`, filter for `.video` frames, extract the pixel buffer, calculate orientation, and forward the frame to [VICustomVideoSource]():

<CodeBlocks>
```swift title="Swift"
override func processSampleBuffer(_ sampleBuffer: CMSampleBuffer, with sampleBufferType: RPSampleBufferType) {
    guard sampleBufferType == .video,
          let pixelBuffer: CVPixelBuffer = CMSampleBufferGetImageBuffer(sampleBuffer) else {
        return
    }

    var rotation: VIRotation = ._0
    if let orientationAttachment = CMGetAttachment(sampleBuffer, key: RPVideoSampleOrientationKey as CFString, attachmentModeOut: nil) as? NSNumber {
        switch CGImagePropertyOrientation(rawValue: orientationAttachment.uint32Value) {
        case .up?, .upMirrored?:
            rotation = ._0
        case .right?, .rightMirrored?:
            rotation = ._270
        case .left?, .leftMirrored?:
            rotation = ._90
        case .down?, .downMirrored?:
            rotation = ._180
        default:
            rotation = ._0
        }
    }

    self.screenVideoSource.sendVideoFrame(pixelBuffer, rotation: rotation)
}
```

```objc title="Objective-C"
- (void)processSampleBuffer:(CMSampleBufferRef)sampleBuffer withType:(RPSampleBufferType)sampleBufferType {
    if (sampleBufferType != RPSampleBufferTypeVideo) {
        return;
    }

    CVPixelBufferRef pixelBuffer = CMSampleBufferGetImageBuffer(sampleBuffer);
    if (!pixelBuffer) {
        return;
    }

    VIRotation rotation = VIRotation_0;
    NSNumber *orientationAttachment = (__bridge NSNumber *)CMGetAttachment(sampleBuffer, (__bridge CFStringRef)RPVideoSampleOrientationKey, NULL);
    if (orientationAttachment) {
        switch ((CGImagePropertyOrientation)orientationAttachment.unsignedIntValue) {
        case kCGImagePropertyOrientationUp:
        case kCGImagePropertyOrientationUpMirrored:
            rotation = VIRotation_0;
            break;
        case kCGImagePropertyOrientationRight:
        case kCGImagePropertyOrientationRightMirrored:
            rotation = VIRotation_270;
            break;
        case kCGImagePropertyOrientationLeft:
        case kCGImagePropertyOrientationLeftMirrored:
            rotation = VIRotation_90;
            break;
        case kCGImagePropertyOrientationDown:
        case kCGImagePropertyOrientationDownMirrored:
            rotation = VIRotation_180;
            break;
        default:
            rotation = VIRotation_0;
            break;
        }
    }

    [self.screenVideoSource sendVideoFrame:pixelBuffer rotation:rotation];
}
```
</CodeBlocks>

### Synchronize call states

Because the broadcast extension runs in a separate process from your main application, synchronize call states (such as session termination) between the processes using Darwin notification centers (`CFNotificationCenterGetDarwinNotifyCenter`).

<Error title="Known issues and troubleshooting">
1. **Storyboard picker crash**: `RPSystemBroadcastPickerView` may fail when instantiated directly in a Storyboard. Instantiate it programmatically in code: `let _ = RPSystemBroadcastPickerView()`.
2. **Memory termination**: If your extension crashes with `EXC_RESOURCE RESOURCE_TYPE_MEMORY (limit = 50 MB)`, verify that `preferredVideoCodec` is explicitly set to `.H264`. Software encoders like VP8 exceed extension memory limits.
</Error>