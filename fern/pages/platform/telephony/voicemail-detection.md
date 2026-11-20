# Voicemail detection

Voximplant enables developers to detect voicemails and automated prompts on outbound calls using the [Answering Machine Detection (AMD) module](). Additionally, you can detect specific audio tones and voicemail beeps at designated frequencies.

## Contents

- [Voicemail and answering machine detection](#voicemail-and-answering-machine-detection)
- [Beep detection](#beep-detection)

---

## Voicemail and answering machine detection

The AMD module uses machine learning to determine whether an outgoing call was answered by a live human, an automated voicemail greeting, or an interactive bot. Depending on the detection result, your scenario can adjust its flow dynamically—such as waiting for the tone to leave a pre-recorded message or hanging up immediately to save call costs.

<Info title="Supported countries">
The machine learning voicemail detection model is currently optimized for Brazil, Colombia, Kazakhstan, Mexico, and Russia. If you require answering machine detection for another country, contact [support](/help/support) to request model activation.
</Info>

### Outbound PSTN calls

To detect voicemails on calls placed to standard mobile or landline numbers, pass your AMD instance to the outbound call configuration:

```javascript title="Voicemail detection for PSTN calls"
require(Modules.AI);

const amdParameters = {
  model: AMD.Model.RU
};
const amd = AMD.create(amdParameters);

const callPSTNParameters = {
  amd
};

const call = VoxEngine.callPSTN(
  'phone number to call',
  'rented or verified phone number',
  callPSTNParameters
);

amd.addEventListener(AMD.Events.DetectionComplete, (result) => {
  Logger.write(`Machine answer detection is complete.`);
  if (result.resultClass === AMD.ResultClass.VOICEMAIL) {
    Logger.write(`Voicemail detected with a ${result.confidence}% confidence.`);
    call.startPlayback('URLtoMP3');
    // Hangup call after mp3 message was played to the inbox
    call.addEventListener(CallEvents.PlaybackFinished, () => {
      call.hangup();
    });
  } else {
    Logger.write('Voicemail not detected.');
  }
});

amd.addEventListener(AMD.Events.DetectionError, (error) => {
  Logger.write(`Detection failed with an error:`);
  Logger.write(JSON.stringify(error));
});
```

### Outbound SIP calls

Voicemail detection operates identically across external SIP trunks and PBX endpoints:

```javascript title="Voicemail detection for SIP calls"
require(Modules.AI);

const amdParameters = {
  model: AMD.Model.RU
};

const amd = AMD.create(amdParameters);

const callSIPParameters = { amd };
const call = VoxEngine.callSIP('sip:alice@example.com', callSIPParameters);

amd.addEventListener(AMD.Events.DetectionComplete, (result) => {
  Logger.write(`Machine answer detection is complete.`);
  if (result.resultClass === AMD.ResultClass.VOICEMAIL) {
    Logger.write(`Voicemail detected with a ${result.confidence}% confidence.`);
    call.startPlayback('URLtoMP3');
    // Hangup call after mp3 message was played to the inbox
    call.addEventListener(CallEvents.PlaybackFinished, () => {
      call.hangup();
    });
  } else {
    Logger.write('Voicemail not detected.');
  }
});

amd.addEventListener(AMD.Events.DetectionError, (error) => {
  Logger.write(`Detection failed with an error:`);
  Logger.write(JSON.stringify(error));
});
```

### Alternative initialization methods

Instead of instantiating AMD before placing a call, you can create the detector directly on an existing call object. You can implement this using either event listeners or asynchronous promises:

#### Event-based approach

```javascript title="Event-based AMD initialization"
require(Modules.AI);

const call = VoxEngine.callPSTN('phone number to call', 'rented or verified phone number');

/**
 * Keeping in mind that some voicemail systems can work in pre-connected state (early media),
 *  it's better to use AudioStarted event
 */
call.addEventListener(CallEvents.AudioStarted, () => {
  try {
    const amdParameters = {
      model: AMD.Model.RU,
      call
    };
    const detector = AMD.create(amdParameters);

    detector.addEventListener(AMD.Events.DetectionComplete, (result) => {
      Logger.write(`Machine answer detection is complete.`);
      if (result.resultClass === AMD.ResultClass.VOICEMAIL) {
        Logger.write(`Voicemail detected with a ${result.confidence}% confidence.`);
        call.startPlayback('URLtoMP3');
        // Hangup call after mp3 message was played to the inbox
        call.addEventListener(CallEvents.PlaybackFinished, () => {
          call.hangup();
        });
      } else {
        Logger.write('Voicemail not detected.');
      }
    });

    detector.addEventListener(AMD.Events.DetectionError, (error) => {
      Logger.write(`Detection failed with an error:`);
      Logger.write(JSON.stringify(error));
    });

    // Enable voicemail detection
    detector.detect();
  } catch (error) {
    Logger.write(`AMD failed with an error:`);
    Logger.write(JSON.stringify(error));
  }
});
```

#### Async/await approach

```javascript title="Async/await AMD initialization"
require(Modules.AI);

const call = VoxEngine.callPSTN('phone number to call', 'rented or verified phone number');

/**
 * Keeping in mind that some voicemail systems can work in pre-connected state (early media),
 *  it's better to use AudioStarted event
 */
call.addEventListener(CallEvents.AudioStarted, async () => {
  try {
    const amdParameters = {
      model: AMD.Model.RU,
      call
    };
    const detector = AMD.create(amdParameters);

    // Enable voicemail detection
    const result = await detector.detect();

    Logger.write(`Machine answer detection is complete.`);
    if ('resultClass' in result && result.resultClass === AMD.ResultClass.VOICEMAIL) {
      Logger.write(`Voicemail detected with a ${result.confidence}% confidence.`);
      call.startPlayback('URLtoMP3');
      // Hangup call after mp3 message was played to the inbox
      call.addEventListener(CallEvents.PlaybackFinished, () => {
        call.hangup();
      });
    } else {
      Logger.write('Voicemail not detected.');
    }
  } catch (error) {
    Logger.write(`AMD failed with an error:`);
    Logger.write(JSON.stringify(error));
  }
});
```

---

## Beep detection

The beep detector allows scenarios to listen for audio tones at specific frequencies—commonly used to detect the exact moment a voicemail system finishes playing its greeting and begins recording.

### Methods

* [enableBeepDetection()](/reference/voxengine/call#enablebeepdetection): Activates tone detection on the current call. Accepts a configuration object:
  * `frequencies`: An array of target frequencies in Hertz (Hz).
  * `timeout`: The maximum detection window in milliseconds.
* [disableBeepDetection()](/reference/voxengine/call#disablebeepdetection): Deactivates tone detection on the active call.

### Events

* [BeepDetectionComplete](/reference/voxengine/call#beepdetectioncomplete): Fires when a tone matching one of the target frequencies is detected or when the detection timeout expires:
  * `frequencies`: An array containing the detected frequency values.
  * `timeout`: A boolean indicating whether the operation timed out (`undefined` if a beep was successfully detected, `true` if the timeout elapsed, or `false` if detection was manually disabled).
* [BeepDetectionError](/reference/voxengine/call#beepdetectionerror): Fires if an error occurs during detection. The event payload includes a `reason` property describing the failure.

```javascript title="Beep detection scenario"
const params = { frequencies: [915, 1371, 1777], timeout: 6000 };
call.enableBeepDetection(params);

call.addEventListener(CallEvents.BeepDetectionComplete, (e) => {
  if (e.frequencies !== undefined) {
    // Beep detected; start playing message to voicemail inbox
    console.log("Beep detected at frequencies:", e.frequencies);
  } else {
    // Timeout reached without detecting a beep
    console.log("Detection timed out");
  }
});

call.addEventListener(CallEvents.BeepDetectionError, (e) => {
  console.error("Beep detection error:", e.reason);
});
```