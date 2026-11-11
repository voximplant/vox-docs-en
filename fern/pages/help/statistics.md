# SDK statistics

Voximplant client SDKs provide real-time connection telemetry and call quality metrics. This guide explains how to monitor basic quality issues and collect advanced diagnostic statistics during active calls.

## Basic call quality events

Voximplant SDKs emit dedicated events when network or hardware issues degrade call quality. You can listen for these events to alert users or adapt your UI:

* **Codec mismatch** ([Android](), [iOS]()): Triggered when local audio, video, or screen sharing is encoded using a codec different from the one specified in initialization or call settings.
* **High media latency** ([Android](), [iOS]()): Triggered when significant round-trip network media latency is detected.
* **ICE disconnected** ([Android](), [iOS]()): Triggered when the underlying WebRTC ICE connection switches to a disconnected state during an active call.
* **Local video degradation** ([Android](), [iOS]()): Triggered when transmitted video resolution drops below captured camera resolution due to bandwidth constraints or CPU throttling.
* **Packet loss** ([Android](), [iOS]()): Emitted every 2.5 seconds to report packet loss percentage over the previous interval.
* **No audio captured** ([Android](), [iOS]()): Triggered when the local microphone captures no audio signal (e.g., hardware mute, system permission issues).
* **No audio received** ([Android](), [iOS]()): Triggered when no audio stream is received from the remote endpoint.
* **No video received** ([Android](), [iOS]()): Triggered when no video stream is received from the remote endpoint.

## Advanced connection statistics

For custom monitoring dashboards or automated network diagnostics, you can collect granular WebRTC telemetry.

Telemetry is collected continuously during an active call across two scopes:
* **CallStats**: Aggregate connection metrics for the entire call session (e.g., protocol, total bandwidth, connection state).
* **EndpointStats**: Individual metrics for each participant in a 1-on-1 call or multi-party conference.

<Info title="Web SDK 1-on-1 calls">
In the Web SDK, during a peer-to-peer call with two participants, `CallStats` and `EndpointStats` contain identical metrics.
</Info>

### Receiving statistics

<Aside>
```swift title="iOS (Swift)"
// 1. Conform to VICallDelegate
class CallManager: NSObject, VICallDelegate {
    var call: VICall?

    override init() {
        super.init()
        // 2. Assign the call delegate
        call?.add(self)
    }

    func call(_ call: VICall, didReceiveStatistics stat: VICallStats) {
        // 3. Process telemetry metrics
        print("Received stats: \(stat)")
    }
}
```
```objc title="iOS (Objective-C)"
// 1. Conform to VICallDelegate
@interface CallManager : NSObject <VICallDelegate>
@property (strong, nonatomic) VICall *call;
@end

@implementation CallManager

- (instancetype)init {
    self = [super init];
    if (self) {
        // 2. Assign the call delegate
        [self.call addDelegate:self];
    }
    return self;
}

- (void)call:(VICall *)call didReceiveStatistics:(VICallStats *)stat {
    // 3. Process telemetry metrics
    NSLog(@"Received stats: %@", stat);
}

@end
```
</Aside>

On iOS, subscribe to `VICallDelegate` and implement the `didReceiveStatistics` method to receive `VICallStats`:

<Aside>
```kotlin title="Android (Kotlin)"
// 1. Implement ICallListener
class CallManager : ICallListener {
    var call: ICall? = null

    init {
        // 2. Add the call listener
        call?.addCallListener(this)
    }

    override fun onCallStatsReceived(call: ICall, callStats: CallStats) {
        // 3. Process telemetry metrics
    }
}
```
```java title="Android (Java)"
// 1. Implement ICallListener
class CallManager implements ICallListener {
    ICall call;

    CallManager() {
        // 2. Add the call listener
        call.addCallListener(this);
    }

    @Override
    public void onCallStatsReceived(ICall call, CallStats callStats) {
        // 3. Process telemetry metrics
    }
}
```
</Aside>

On Android, implement `ICallListener` and process incoming telemetry in the `onCallStatsReceived` callback:

### Adjusting collection intervals

By default, telemetry events arrive every 5 seconds on iOS and Android. You can customize the reporting frequency by modifying the `statsCollectionInterval` property (in milliseconds):

<Aside>
```swift title="Set collection interval (iOS)"
let settings = VICallSettings()
settings.statsCollectionInterval = 1000 // Report stats every 1 second

self.call = self.client?.call(numberField.text!, settings: settings)
```
</Aside>

On iOS, configure `statsCollectionInterval` on your `VICallSettings` object before initiating or answering a call:

<Aside>
```kotlin title="Set collection interval (Android Kotlin)"
val config = ClientConfig()
config.statsCollectionInterval = 1000 // Report stats every 1 second

val client = Voximplant.getClientInstance(
    Executors.newSingleThreadExecutor(),
    applicationContext,
    config
)
```
```java title="Set collection interval (Android Java)"
ClientConfig config = new ClientConfig();
config.statsCollectionInterval = 1000; // Report stats every 1 second

IClient client = Voximplant.getClientInstance(
    Executors.newSingleThreadExecutor(),
    getApplicationContext(),
    config
);
```
</Aside>

On Android, configure `statsCollectionInterval` on your `ClientConfig` instance during client initialization:

<Info title="RAM utilization">
Telemetry is buffered in memory during the interval specified by `statsCollectionInterval`. Shorter intervals deliver faster updates, while longer intervals accumulate larger data batches in memory before dispatching.
</Info>

### Validating timestamps

Each received statistics payload includes a [timestamp]() value. When monitoring active calls, verify that each payload has a newer timestamp than the previous one. If consecutive events report identical timestamps, this indicates a stall in stats gathering.