# Automated call lists

Voximplant's **Call Lists** engine allows you to launch high-volume, automated outbound calling campaigns using CSV data files processed directly by VoxEngine scenarios.

Common use cases include appointment reminders, service notifications, customer surveys, debt collection alerts, and automated multi-attempt outreach.

## Contents

- [Prerequisites](#prerequisites)
- [Structuring the call list CSV](#structuring-the-call-list-csv)
  - [Daily calling windows](#daily-calling-windows)
  - [Custom weekly schedules](#custom-weekly-schedules)
  - [Task priorities](#task-priorities)
- [Scenario setup](#scenario-setup)
- [Launching campaigns via Management API](#launching-campaigns-via-management-api)
- [Handling retries and dynamic editing](#handling-retries-and-dynamic-editing)
  - [Real-time editable fields](#real-time-editable-fields)
  - [Scheduling future retry dates](#scheduling-future-retry-dates)
  - [requestNextAttempt and requestNextAttemptAsync](#requestnextattempt-and-requestnextattemptasync)
- [Processing user feedback](#processing-user-feedback)
  - [Handle DTMF keypad input](#handle-dtmf-keypad-input)
  - [Handle speech recognition (STT)](#handle-speech-recognition-stt)
- [Frequently asked questions](#frequently-asked-questions)

---

## Prerequisites

Before launching a call list campaign:

1. Create an [application]().
2. Create a [scenario]().
3. Create a [routing rule]() and bind it to your scenario.
4. Rent a [phone number]() to use as your verified outbound caller ID.
5. Prepare a CSV file containing your contact records.

---

## Structuring the call list CSV

A call list CSV file contains the target phone numbers along with custom parameters passed as variables into each VoxEngine session. The first line of the file defines the parameter headers:

```csv title="Basic call list CSV"
first_name;last_name;phone_number;appointment_date
Jon;Snow;+16501234567;November 15th
Daenerys;Targaryen;+16501234568;November 16th
```

### Daily calling windows

You can restrict calling hours for individual contacts by adding start and end times in UTC (24-hour `HH:mm:ss` format):

```csv title="Call list with daily calling windows"
first_name;last_name;phone_number;appointment_date;start_time;end_time
Jon;Snow;+16501234567;November 15th;17:00:00;22:00:00
Daenerys;Targaryen;+16501234568;November 16th;10:00:00;15:00:00
```

<Info title="Overnight calling windows">
If `start_execution_time` is later than `end_execution_time`, calling attempts span across midnight (starting after `start_execution_time` on one calendar day and concluding before `end_execution_time` on the next day).
</Info>

### Custom weekly schedules

To restrict calls to specific days and timeframes, add a `call_schedule` column containing a JSON array of allowed windows:

```json title="Custom weekly schedule payload"
{
  "call_schedule": [
    {
      "day_of_week": "mon",
      "start": "10:00:00",
      "end": "12:00:00"
    },
    {
      "day_of_week": "tue",
      "start": "14:00:00",
      "end": "17:00:00"
    }
  ]
}
```

The `day_of_week` property accepts standard 3-letter abbreviations (`mon`, `tue`, `wed`) or full day names. You can define multiple windows for the same day.

### Task priorities

By default, the call list engine processes tasks with a baseline priority of `50`. You can prioritize specific contacts by adding a `task_priority` column:

* Priority values are numerical, where **`0` represents the highest priority**.
* Incomplete prioritized records are dialed before standard records.
* Records with identical priority values are processed in order of task ID.
* Non-numeric values in this column will cause the upload to fail with `The 'task_priority' parameter is invalid`.

---

## Scenario setup

In your VoxEngine scenario, require the `CallList` module. The scenario processes each CSV row sequentially. Variables corresponding to your CSV column headers are populated automatically.

The following scenario answers the call, uses [voicemail detection]() to filter answering machines, and announces an appointment date using [text-to-speech]():

```javascript title="Call list scenario example"
require(Modules.AI);

// The storage for the scenario data
const storage = {
  callerId: '+1234567890', // rented or verified phone number
  playbackCounter: 0,
  appointmentDate: '',
  firstName: '',
  lastName: '',
  phoneNumber: ''
};

const handleCallConnected = (e) => {
  setTimeout(() => {
    e.call.say(
      `Hello ${storage.firstName}! Your appointment scheduled for ${storage.appointmentDate}`,
      { voice: VoiceList.Amazon.en_US_Joanna }
    );
  }, 500);
  e.call.addEventListener(CallEvents.PlaybackFinished, handlePlaybackFinished);
};

const handleCallDisconnected = async (e) => {
  try {
    // Tell CallList processor about successful call result
    await CallList.reportResultAsync({
      result: true,
      duration: e.duration
    });
    VoxEngine.terminate();
  } catch (error) {
    Logger.write(`'CallList.reportResultAsync' error:`);
    Logger.write(JSON.stringify(error));
  }
};

const handleCallFailed = async (e) => {
  try {
    /**
     * Depending on the request options it either try to launch the scenario again after some time
     *  or write the result (failed call) into result_data column of the CSV file with results
     */
    await CallList.reportErrorAsync({
      result: false,
      msg: 'Failed',
      code: e.code
    });
    VoxEngine.terminate();
  } catch (error) {
    Logger.write(`'CallListAsync.reportError' error:`);
    Logger.write(JSON.stringify(error));
  }
};

const handlePlaybackFinished = (e) => {
  e.call.removeEventListener(CallEvents.PlaybackFinished, handlePlaybackFinished);
  storage.playbackCounter++;
  // If the message was played 4 times - hangup
  if (storage.playbackCounter === 4) {
    e.call.hangup();
  } else {
    // Play one more time
    setTimeout(() => {
      e.call.say(`Your appointment scheduled for ${storage.appointmentDate}`, {
        voice: VoiceList.Amazon.en_US_Joanna
      });
      e.call.addEventListener(CallEvents.PlaybackFinished, handlePlaybackFinished);
    }, 2000);
  }
};

const handleDetectionComplete = async (result) => {
  Logger.write(`Machine answer detection is complete.`);
  if (result.resultClass === AMD.ResultClass.VOICEMAIL) {
    Logger.write(`Voicemail detected with a ${result.confidence}% confidence.`);
    try {
      await CallList.reportErrorAsync('Voicemail');
      VoxEngine.terminate();
    } catch (error) {
      Logger.write(`'CallList.reportErrorAsync' error:`);
      Logger.write(JSON.stringify(error));
    }
  } else {
    Logger.write('Voicemail not detected.');
  }
};

const handleDetectionError = (error) => {
  Logger.write(`Detection failed with an error:`);
  Logger.write(error);
};

VoxEngine.addEventListener(AppEvents.Started, () => {
  const customData = VoxEngine.customData(); // data from CSV string in JSON format
  const { first_name, last_name, phone_number, appointment_date } = JSON.parse(customData);

  storage.firstName = first_name;
  storage.lastName = last_name;
  storage.phoneNumber = phone_number;
  storage.appointmentDate = appointment_date;

  Logger.write(`Calling ${storage.firstName} ${storage.lastName} on ${storage.phoneNumber}`);

  // Create an AMD instance
  const amdParameters = {
    model: AMD.Model.RU
  };
  const amd = AMD.create(amdParameters);
  // Add amd event listeners
  amd.addEventListener(AMD.Events.DetectionComplete, handleDetectionComplete);
  amd.addEventListener(AMD.Events.DetectionError, handleDetectionError);

  // Make a call
  const callPSTNParameters = {
    amd
  };
  const call = VoxEngine.callPSTN(storage.phoneNumber, storage.callerId, callPSTNParameters);
  // Add call event listeners
  call.addEventListener(CallEvents.Connected, handleCallConnected);
  call.addEventListener(CallEvents.Failed, handleCallFailed);
  call.addEventListener(CallEvents.Disconnected, handleCallDisconnected);
});
```

---

## Launching campaigns via Management API

Call lists are created and started using the [CreateCallList]() Management API method.

Key request parameters:

* **`rule_id`**: The ID of the application routing rule bound to your scenario.
* **`file_content`**: The raw CSV file content passed in the request body.
* **`max_simultaneous`**: Maximum number of concurrent outbound calls.
* **`num_attempts`**: Number of dial attempts allowed per contact if `CallList.reportError` is invoked.
* **`interval_seconds`**: Interval between successive dial attempts in seconds.
* **`priority`**: Overall priority of this call list relative to other lists.
* **`delimiter`**: CSV delimiter character (default is `;`).
* **`encoding`**: Character encoding of the CSV file (default is `UTF-8`).

<Warning title="Balance requirement">
Call lists require an account balance of at least $1.00 USD. If your balance drops below this threshold, processing pauses automatically and resumes once your account is topped up.
</Warning>

### Inspecting campaign progress

Retrieve real-time task statuses and execution results using the [GetCallListDetails]() method:

```csv title="Call list execution details response"
"appointment_date";"last_name";"phone_number";"first_name";"__end_execution_time";"__start_execution_time";"result_data";"last_attempt";"attempts_left";"status_id";status
November 15th;Jon;16501234567;Snow;;;"{""result"":true,""duration"":27}";"2021-05-24 19:21:39";1;2;Processed
November 16th;Daenerys;16501234568;Targaryen;;;"{""result"":true,""duration"":18}";"2021-05-24 19:22:10";1;2;Processed
```

---

## Handling retries and dynamic editing

When a call attempt fails (such as reaching a busy signal or voicemail), you can modify the task parameters in real time and reschedule a retry instead of marking the task as failed.

### Real-time editable fields

Using `CallList.requestNextAttempt()`, you can modify parameters for the **current task** without altering the global call list configuration:

| Parameter | Type | Description |
| :--- | :--- | :--- |
| **`start_at`** | Unix timestamp | Earliest time (in seconds) to execute the next attempt. |
| **`next_attempt_time`** | ISO 8601 string | Specific target retry date (e.g., `2026-10-31T15:00:00+00:00`). |
| **`attempts_left`** | Integer | Remaining attempts for this task. Setting to `0` marks the task as failed. If omitted, the count decrements by 1 automatically. |
| **`custom_data`** | String / JSON | Updated data payload passed to the next scenario run (e.g., alternate phone numbers or updated notes). |
| **`start_execution_time`** | `HH:MM:SS` (24h UTC) | Start of the daily calling window. |
| **`end_execution_time`** | `HH:MM:SS` (24h UTC) | End of the daily calling window. |
| **`error`** | String | Error description explaining why the attempt was rescheduled. |

### Scheduling future retry dates

You can specify a target retry date in three ways:

1. **Via Management API**: Pass `next_attempt_time` to [EditCallListTask]().
2. **In the initial CSV file**: Include a `next_attempt_time` column with ISO 8601 timestamps.
3. **In the VoxEngine scenario**: Pass `next_attempt_time` to `CallList.requestNextAttempt()`.

```javascript title="Reschedule next attempt date in scenario"
VoxEngine.addEventListener(AppEvents.Started, function (e) {
  setTimeout(function () {
    updatedCallListSync();
    VoxEngine.terminate();
  }, 1000);
});

function updatedCallListSync() {
  const updatedCallListData = {};
  updatedCallListData['next_attempt_time'] = '2024-10-15T10:40:12.000+03:00';
  let response;
  try {
    Logger.write('Update the call list');
    response = CallList.requestNextAttempt(updatedCallListData);
    Logger.write(JSON.stringify(response));
  } catch (error) {
    Logger.write('Update error: ' + JSON.stringify(error));
  }
}
```

<Warning title="Timestamp restrictions">
* You cannot specify a timestamp in the past. If a past timestamp is passed, the engine falls back to `request_time + interval_seconds`.
* You cannot specify a date further than **9 months** into the future.
</Warning>

### requestNextAttempt and requestNextAttemptAsync

You can apply updates using either callback or promise-based syntax:

#### Callback API (`CallList.requestNextAttempt`)

```javascript title="requestNextAttempt callback example"
VoxEngine.addEventListener(AppEvents.Started, (e) => {
  const data = JSON.parse(VoxEngine.customData());

  const numberToCall = 'numberToCall';
  const numberFrom = 'yourVoxNumber';
  let numberIndex = 0;

  const call = VoxEngine.callPSTN(numberToCall, numberFrom);

  call.addEventListener(CallEvents.Connected, () => {
    // implement some logic here. for example,
    // read a message to your customer via TTS

    call.addEventListener(CallEvents.Disconnected, () => {
      // report success, terminate session
      CallList.reportResult('success', VoxEngine.terminate);
    });
  });

  call.addEventListener(CallEvents.Failed, (err) => {
    // number is unreachable, try another one next time
    numberIndex = (numberIndex + 1) % numberToCall.length;
    data['index'] = numberIndex;

    const updatedCallListData = {};
    // update any of the fields below or all of them at once

    // updates the data source for the task
    updatedCallListData['custom_data'] = JSON.stringify(data);

    // updates the number of calling attempts left
    updatedCallListData['attempts_left'] = 1;

    // updates the earliest time for the next attempt
    // in this case we set this to current time + 1 second
    updatedCallListData['start_at'] = Math.ceil(new Date().getTime() / 1000 + 1);

    // updates the starting time for calling attempts
    updatedCallListData['start_execution_time'] = '05:00:00';

    // updates the ending time for calling attempts
    updatedCallListData['end_execution_time'] = '18:00:00';

    // sends the error event data for calling attempts
    updatedCallListData['error'] = err;

    CallList.requestNextAttempt(updatedCallListData, function (ev) {
      Logger.write(JSON.stringify(ev));
      VoxEngine.terminate();
    });
  });
});

```

#### Promise API (`CallList.requestNextAttemptAsync`)

```javascript title="requestNextAttemptAsync promise example"
VoxEngine.addEventListener(AppEvents.Started, async () => {
  const data = JSON.parse(VoxEngine.customData());
  const numberToCall = 'numberToCall';
  const numberFrom = 'yourVoxNumber';

  const call = VoxEngine.callPSTN(numberToCall, numberFrom);

  call.addEventListener(CallEvents.Connected, () => {
    call.addEventListener(CallEvents.Disconnected, () => {
      CallList.reportResultAsync('success').finally(() => VoxEngine.terminate());
    });
  });

  call.addEventListener(CallEvents.Failed, async (err) => {
    try {
      const updatedCallListData = {
        custom_data: JSON.stringify(data),
        attempts_left: 1,
        start_at: Math.ceil(new Date().getTime() / 1000 + 1),
        start_execution_time: '05:00:00',
        end_execution_time: '18:00:00',
        error: err,
      };

      const result = await CallList.requestNextAttemptAsync(updatedCallListData);
      Logger.write(JSON.stringify(result));
    } catch (error) {
      Logger.write(`CallList.requestNextAttemptAsync error: ${JSON.stringify(error)}`);
    } finally {
      VoxEngine.terminate();
    }
  });
});

```

The following scenario demonstrates reading secondary contact numbers from custom data and retrying with updated parameters when an initial attempt fails:

```javascript title="Dynamic retry scenario"
VoxEngine.addEventListener(AppEvents.Started, (e) => {
  const data = JSON.parse(VoxEngine.customData());

  // get the list of numbers from custom data
  const numbers = data['numbers'].split(',');
  // check which of the user numbers we need to dial
  let numberIndex = data['index'] || 0;

  const call = VoxEngine.callPSTN(numbers[numberIndex], 'some_caller_id');

  call.addEventListener(CallEvents.Connected, () => {
    // implement some logic here. for example,
    // read a message to your customer via TTS

    call.addEventListener(CallEvents.Disconnected, () => {
      // report success, terminate session
      CallList.reportResult('success', VoxEngine.terminate);
    });
  });

  call.addEventListener(CallEvents.Failed, () => {
    // number is unreachable, try another one next time
    numberIndex = (numberIndex + 1) % numbers.length;
    data['index'] = numberIndex;

    const updatedCallListData = {};
    // update any of the fields below or all of them at once

    // updates the data source for the task
    updatedCallListData['custom_data'] = JSON.stringify(data);

    // updates the number of calling attempts left
    updatedCallListData['attempts_left'] = 1;

    // updates the earliest time for the next attempt
    // in this case we set this to current time + 1 second
    updatedCallListData['start_at'] = Math.ceil(new Date().getTime() / 1000 + 1);

    // updates the starting time for calling attempts
    updatedCallListData['start_execution_time'] = '05:00:00';

    // updates the ending time for calling attempts
    updatedCallListData['end_execution_time'] = '18:00:00';

    CallList.requestNextAttempt(updatedCallListData, function (ev) {
      Logger.write(JSON.stringify(ev));
      VoxEngine.terminate();
    });
  });
});
```

---

## Processing user feedback

You can collect survey responses, confirmations, and user input through keypad tones or voice commands.

### Handle DTMF keypad input

Prompt the user to press a key (e.g., rate service quality from 1 to 5) and handle the [ToneReceived]() event:

```javascript title="Handle DTMF feedback"
// The storage for the scenario data
const storage = {
  playbackCounter: 0,
  firstName: '',
  appointmentDate: '',
  rating: ''
};

const handleCallConnected = (e) => {
  setTimeout(() => {
    e.call.say(
      `Hello ${storage.firstName}! Your appointment scheduled for ${storage.appointmentDate}`,
      { voice: VoiceList.Amazon.en_US_Joanna }
    );
  }, 500);
  e.call.addEventListener(CallEvents.PlaybackFinished, handlePlaybackFinished);
  e.call.addEventListener(CallEvents.ToneReceived, handleToneReceived);
};

const handleToneReceived = (e) => {
  e.call.removeEventListener(CallEvents.PlaybackFinished, handlePlaybackFinished);
  e.call.stopPlayback();
  storage.rating = e.tone;
  e.call.say('Thank you for your answer!', { voice: VoiceList.Amazon.en_US_Joanna });
  e.call.addEventListener(CallEvents.PlaybackFinished, (e) => e.call.hangup());
};

const handleCallDisconnected = async (e) => {
  try {
    // Tell CallList processor about successful call
    await CallList.reportResultAsync({
      result: true,
      duration: e.duration,
      rating: storage.rating
    });
    VoxEngine.terminate();
  } catch (error) {
    Logger.write(`'CallList.reportResultAsync' error:`);
    Logger.write(JSON.stringify(error));
  }
};

const handlePlaybackFinished = (e) => {
  e.call.removeEventListener(CallEvents.PlaybackFinished, handlePlaybackFinished);
  storage.playbackCounter++;
  // If the message was played 4 times - hangup
  if (storage.playbackCounter === 4) {
    e.call.hangup();
  } else {
    setTimeout(() => {
      e.call.say('Please rate the customer service quality from 1 to 5.', {
        voice: VoiceList.Amazon.en_US_Joanna
      });
      e.call.addEventListener(CallEvents.PlaybackFinished, handlePlaybackFinished);
    }, 2000);
  }
};
```

### Handle speech recognition (STT)

To capture spoken responses, import the `ASR` module, instantiate a recognition session with `createASR()`, and pipe the caller's audio stream:

```javascript title="Handle spoken feedback with speech-to-text"
require(Modules.AI);
require(Modules.ASR);

// The storage for the scenario data
const storage = {
  callerId: '+1234567890', // rented or verified phone number
  playbackCounter: 0,
  rating: '',
  firstName: '',
  lastName: '',
  phoneNumber: '',
  appointmentDate: '',
  call: null,
  asr: null
};

const handlePlaybackFinished = (e) => e.call.sendMediaTo(storage.asr);
const handleToneReceived = (e) => {
  e.call.removeEventListener(CallEvents.PlaybackFinished, handlePlaybackFinished);
  e.call.stopPlayback();
  storage.rating = e.tone;
  e.call.say('Thank you for your answer!', { voice: VoiceList.Amazon.en_US_Joanna });
  e.call.addEventListener(CallEvents.PlaybackFinished, (e) => e.call.hangup());
};

const handleCallConnected = (e) => {
  e.call.handleTones(true); // <-- enable input processing
  setTimeout(() => {
    e.call.say(
      `Hello ${storage.firstName}! Thank you for visiting our store, ` +
        `please rate the customer service quality from 1 to 5.`,
      {
        voice: VoiceList.Amazon.en_US_Joanna
      }
    );
  }, 1000);
  e.call.addEventListener(CallEvents.ToneReceived, handleToneReceived);
  e.call.addEventListener(CallEvents.PlaybackFinished, handlePlaybackFinished);
};

const handleCallDisconnected = async (e) => {
  try {
    // Tell CallList processor about successful call result
    await CallList.reportResultAsync({
      result: true,
      duration: e.duration,
      rating: storage.rating
    });
    VoxEngine.terminate();
  } catch (error) {
    Logger.write(`'CallList.reportResultAsync' error:`);
    Logger.write(JSON.stringify(error));
  }
};

const handleCallFailed = async (e) => {
  try {
    /**
     * Tell CallList processor that we could not get a call connected.
     *  Depending on the request options it either try to launch the scenario again after some time
     *  or write the result (failed call) into result_data column of the CSV file with results
     */
    await CallList.reportErrorAsync({
      result: false,
      msg: 'Failed',
      code: e.code
    });
    VoxEngine.terminate();
  } catch (error) {
    Logger.write(`'CallListAsync.reportError' error:`);
    Logger.write(JSON.stringify(error));
  }
};

const handleDetectionComplete = async (result) => {
  Logger.write(`Machine answer detection is complete.`);
  if (result.resultClass === AMD.ResultClass.VOICEMAIL) {
    Logger.write(`Voicemail detected with a ${result.confidence}% confidence.`);
    try {
      await CallList.reportErrorAsync('Voicemail');
      VoxEngine.terminate();
    } catch (error) {
      Logger.write(`'CallListAsync.reportError' error:`);
      Logger.write(JSON.stringify(error));
    }
  } else {
    Logger.write('Voicemail not detected.');
  }
};

const handleDetectionError = (error) => {
  Logger.write(`Detection failed with an error:`);
  Logger.write(JSON.stringify(error));
};

const handleAsrResult = (e) => {
  if (e.confidence > 50) {
    storage.call.removeEventListener(CallEvents.PlaybackFinished, handlePlaybackFinished);
    storage.call.stopPlayback();
    storage.call.say(
      `You gave us ${e.text}, we appreciate it, thank you again.`,
      VoiceList.Amazon.en_US_Joanna
    );
    storage.rating = e.text;
    storage.call.addEventListener(CallEvents.PlaybackFinished, () => {
      storage.asr.stop();
      storage.call.hangup();
    });
  } else {
    storage.call.say(
      'Could not recognize your answer, say it again.',
      VoiceList.Amazon.en_US_Joanna
    );
    storage.call.addEventListener(CallEvents.PlaybackFinished, handlePlaybackFinished);
  }
};

const handleAsrSpeechCaptured = () => {
  storage.call.stopMediaTo(storage.asr);
};

// AppEvents.Started dispatched for each CSV record
VoxEngine.addEventListener(AppEvents.Started, () => {
  const customData = VoxEngine.customData(); // data from CSV string in JSON format
  const { first_name, last_name, phone_number, appointment_date } = JSON.parse(customData);

  storage.firstName = first_name;
  storage.lastName = last_name;
  storage.phoneNumber = phone_number;
  storage.appointmentDate = appointment_date;

  Logger.write(`Calling ${storage.firstName} ${storage.lastName} on ${storage.phoneNumber}`);

  // Create an ASR instance
  storage.asr = VoxEngine.createASR({
    profile: ASRProfileList.Google.en_US,
    phraseHints: ['One', 'Two', 'Three', 'Four', 'Five']
  });
  // Add asr event listeners
  storage.asr.addEventListener(ASREvents.Result, handleAsrResult);
  storage.asr.addEventListener(ASREvents.SpeechCaptured, handleAsrSpeechCaptured);

  // Create an AMD instance
  const amdParameters = {
    model: AMD.Model.RU
  };
  const amd = AMD.create(amdParameters);
  // Add amd event listeners
  amd.addEventListener(AMD.Events.DetectionComplete, handleDetectionComplete);
  amd.addEventListener(AMD.Events.DetectionError, handleDetectionError);

  // Make a call
  const callPSTNParameters = {
    amd
  };
  storage.call = VoxEngine.callPSTN(storage.phoneNumber, storage.callerId, callPSTNParameters);
  // Add call event listeners
  storage.call.addEventListener(CallEvents.Connected, handleCallConnected);
  storage.call.addEventListener(CallEvents.Failed, handleCallFailed);
  storage.call.addEventListener(CallEvents.Disconnected, handleCallDisconnected);
});
```

Capture results in the `ASREvents.Result` handler and forward the data to your backend in real time using HTTP requests, or save responses to session custom data for retrieval via [GetCallHistory]().

---

## Frequently asked questions

**Q**: **Why did my call list stop running suddenly?**  
**A**: Call lists require an account balance of at least $1.00 USD. If your balance drops below $1.00, processing pauses automatically. Once you replenish your balance, campaigns resume.

**Q**: **Why can't I delete my call list in the Control Panel?**  
**A**: An active call list cannot be deleted while running. You must pause the list or wait until all records complete before deleting it.

**Q**: **Can I add new records to an existing call list?**  
**A**: To add new contacts to a running campaign, use the [AppendToCallList]() Management API method or upload a new CSV file.