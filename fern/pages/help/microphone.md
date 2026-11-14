# Microphone troubleshooting

Learn how to monitor real-time microphone activity and build an automated audio testing service in VoxEngine.

---

## How to monitor microphone activity

Detecting microphone activity is useful for highlighting the active speaker in a multi-party conference, calculating talk time, or triggering automated prompts when a caller remains silent.

To track microphone status on an active call leg, call the [handleMicStatus()]() method on the `Call` instance with `handle` set to `true`, then subscribe to the [CallEvents.MicStatusChange]() event:

```javascript title="Monitor microphone activity"
// Incoming call processing
VoxEngine.addEventListener(AppEvents.CallAlerting, (e) => {
  const call = e.call;
  // Enable mic status tracking
  call.handleMicStatus(true);
  call.addEventListener(CallEvents.Connected, (e) => {
    Logger.write('Call connected');
  });
  // Add event listener for mic activity events
  call.addEventListener(CallEvents.MicStatusChange, (e) => {
    // Write mic activity info into log file
    Logger.write('Mic active: ' + e.active);
  });
  call.answer();
});
```

---

## Build a microphone echo test service

An automated echo testing service allows callers to verify that their microphone and speaker hardware are working properly before joining live calls. The service prompts the caller to speak, records the incoming audio stream, and plays it back to confirm two-way audio functionality.

Here is a complete VoxEngine scenario implementing an echo testing service:

```javascript title="Microphone echo test scenario"
require(Modules.Recorder);

let fileURL;
let call;

VoxEngine.addEventListener(AppEvents.CallAlerting, (e) => {
  call = e.call;
  e.call.answer();
  e.call.addEventListener(CallEvents.Connected, (e) => {
    call.say(
      'Hello, welcome to VoxImplant testing service.' +
        'After the beep please record your message,' +
        'afterwards your message will be played back to you.',
      VoiceList.Amazon.en_US_Joanna
    );
    call.addEventListener(CallEvents.PlaybackFinished, handleIntroPlayed);
  });
  e.call.addEventListener(CallEvents.Disconnected, VoxEngine.terminate);
});

function handleIntroPlayed(e) {
  call.removeEventListener(CallEvents.PlaybackFinished, handleIntroPlayed);
  call.startPlayback('https://cdn.zingaya.com/sounds/beep-1.mp3');
  call.addEventListener(CallEvents.PlaybackFinished, handleRecordStart);
}

function handleRecordStart(e) {
  call.removeEventListener(CallEvents.PlaybackFinished, handleRecordStart);
  let rec = VoxEngine.createRecorder();
  rec.addEventListener(RecorderEvents.Started, handleRecordingStarted);
  rec.addEventListener(RecorderEvents.Stopped, handleRecordingStopped);
  e.call.sendMediaTo(rec);
  setTimeout(() => {
    rec.stop();
  }, 6000);
}

function handleRecordingStarted(e) {
  fileURL = e.url;
}

function handleRecordingStopped(e) {
  call.startPlayback(fileURL);
  call.addEventListener(CallEvents.PlaybackFinished, (e) => {
    setTimeout(handleRecordPlayed, 1000);
  });
}

function handleRecordPlayed() {
  call.say(
    'If you were able to hear your own voice, ' +
      'then you have configured your audio recording device correctly.' +
      'If you hear this message but not your own voice then you need to configure' +
      ' your audio recording device. Goodbye.',
    VoiceList.Amazon.en_US_Joanna
  );
  call.addEventListener(CallEvents.PlaybackFinished, (e) => {
    VoxEngine.terminate();
  });
}
```