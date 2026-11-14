# Call quality detection

Delivering clear communication is essential for a great voice experience. Voximplant provides built-in tools to evaluate call streams in real time, allowing you to identify the audio tier of an active connection.

Capturing audio quality data enables dynamic UI and business logic adaptations—such as displaying an "HD Audio" badge to reassure users of a premium connection, routing calls differently, or logging quality tiers for internal QoS analytics.

---

## How to detect call quality

To detect call quality in your [scenario](), subscribe to the [AudioQualityDetected]() event on the call object. The event payload returns either `HD` or `STANDARD` in its `quality` property:

```javascript title="Detect call quality in a scenario"
VoxEngine.addEventListener(AppEvents.CallAlerting, (e) => {
  const callerId = '18005555555';
  const numberToCall = '18005556677';

  const call = VoxEngine.callPSTN(numberToCall, callerId);

  VoxEngine.easyProcess(e.call, call, () => {});

  e.call.addEventListener(CallEvents.AudioQualityDetected, (e) => {
    Logger.write(`The 'CallEvents.AudioQualityDetected' event is detected!`);
    Logger.write(JSON.stringify(e));
  });

  e.call.addEventListener(CallEvents.Failed, (e2) => {
    Logger.write('Call failed: ' + e2.reason);
    VoxEngine.terminate();
  });

  e.call.addEventListener(CallEvents.Disconnected, () => VoxEngine.terminate());
});

```

You can inspect the detected quality tier directly in your session debug logs or forward it to client applications using custom data or in-call messaging.