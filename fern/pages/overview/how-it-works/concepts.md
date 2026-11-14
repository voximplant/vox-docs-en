# Basic concepts

Voximplant uses a serverless JavaScript runtime called VoxEngine to execute applications defined by [JS scenarios]().

VoxEngine is built on the [ECMAScript 2022]() standard and powered by the [Firefox 115]() SpiderMonkey engine, supporting all modern JavaScript features native to that engine.

You can develop scenarios directly in the [Cloud IDE]() or use a third-party local IDE. Local setups allow you to leverage tools like TypeScript and bundlers. However, ensure your build output is clean and readable, as heavily obfuscated code makes troubleshooting and debugging difficult for your team and Voximplant support.

We recommend using [VoxEngine CI]() to automate scenario deployment when developing in external IDEs.

## Event-based model

VoxEngine scenarios follow an event-driven architecture, enabling developers to structure application logic by subscribing to and handling platform events.

Some events are **nested**, meaning you must **first subscribe to a parent event** before accessing child events. For example, to handle [CallEvents](), such as [Connected]() or [ToneReceived](), you must first subscribe to the parent [CallAlerting]() event. Handling [CallAlerting]() provides the [Call]() object, which emits its own events:

```javascript title="Handle nested call events"
VoxEngine.addEventListener(AppEvents.CallAlerting, (e) => {
  // The incoming call object is available in e.call
  e.call.handleTones(true); // Enable processing tone signals
  e.call.answer();          // Answer the incoming call

  // Subscribe to child events on the call object
  e.call.addEventListener(CallEvents.ToneReceived, (toneEvent) => {
    e.call.say(`You pushed the ${toneEvent.tone} button`, { voice: VoiceList.Amazon.en_US_Joanna });
  });

  e.call.addEventListener(CallEvents.Disconnected, () => VoxEngine.terminate());
});
```

Without subscribing to the parent event, an **incoming** call object and its child events are not accessible. For **outgoing** calls initiated by the scenario, create the call object directly via call methods:

```javascript title="Create and handle an outgoing call"
VoxEngine.addEventListener(AppEvents.Started, () => {
  // Create an outbound call when the scenario starts
  const call = VoxEngine.callPSTN("numberToCall", "confirmedCallerId");

  // Subscribe to events on the newly created call object
  call.addEventListener(CallEvents.Connected, () => {
    call.say("Wake up, Neo!", { voice: VoiceList.Amazon.en_US_Joanna });
  });
});
```

<Info title="What is considered an incoming call?">
When placing a call from a web or mobile SDK, the session consists of two call legs: **SDK → scenario** and **scenario → destination**. The SDK → scenario leg is treated as an incoming call inside the scenario and must be handled using the [CallAlerting]() event. Read [How to process calls in a scenario]() to learn more.
</Info>

Some events are **sequential**, meaning one event only fires after a preceding event has completed. For example, the media player's [PlaybackFinished]() event (which indicates that the [media player]() has finished playing audio) can only fire after the player's [Started]() event has occurred.

<Warning title="Subscribe to events before processing them">
Before executing scenario logic (such as sending media between endpoints), ensure you have subscribed to all necessary events.
</Warning>

## Session lifecycle

Every attempt to start a call using Voximplant creates a new independent call session in VoxEngine (with the exception of conferences, where incoming calls join an existing shared session):

* A session begins with the [Started]() event triggered by an incoming call or an HTTP request.
* The subsequent event depends on how the session was initiated: [CallAlerting]() for incoming calls, or [HttpRequest]() for HTTP requests.
* During an active session, various [CallEvents]() fire as calls connect, are put on hold, start recording, and more.

Session termination proceeds in the following steps:

1. The [terminate]() method is called, an unhandled error occurs, or the session reaches an idle timeout with no active calls or ACD requests.
2. The [Terminating]() event fires. Timers and external resources become unavailable, but you can make one final HTTP request inside the event handler (for example, to notify an external backend that the session has finished).
3. Once that final request completes (or drains), the [Terminated]() event fires.

<Info title="Idle timeout">
A session with no active calls and no ACD requests is automatically terminated after 60 seconds.
</Info>

To learn more about session constraints, refer to [Limits and restrictions]().

## Standard library

VoxEngine provides standard utility functions such as [setTimeout](), [clearTimeout](), [str2Bytes](), [base64_encode](), [uuidgen](), and a suite of [crypto]() methods.

Some functions have naming conventions or behaviors specific to VoxEngine. Consult the [VoxEngine reference]() before implementing them to ensure compatibility.

## Logging

Use the [Logger.write]() method to output messages to the session logger.

When a session terminates, its log is immediately available in Call History. You can access logs via the [Calls]() section in the Control Panel or retrieve them programmatically using the [GetCallHistory]() API method.

### Key features

* Copy a log or its direct link to your clipboard.
* Download logs in `.txt` format via the button in the top-right corner.
* View highlighted events and timestamps for easy reading.
* Navigate long logs using the minimap in the top-right corner.
* Isolate individual call legs by expanding the leg panel on the left and toggling **Highlight call lines**.