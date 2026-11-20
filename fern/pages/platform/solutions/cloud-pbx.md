# Cloud PBX

Build a scalable, cloud-based Private Branch Exchange (PBX) for your organization using Voximplant's serverless JavaScript runtime.

## Contents

- [What is a cloud PBX](#what-is-a-cloud-pbx)
- [Setting up a cloud PBX](#setting-up-a-cloud-pbx)
  - [Scenario 1: Incoming calls and business hours](#scenario-1-incoming-calls-and-business-hours)
  - [Scenario 2: Internal extension calls](#scenario-2-internal-extension-calls)
  - [Scenario 3: Outbound calls to PSTN](#scenario-3-outbound-calls-to-pstn)
  - [Routing rules configuration](#routing-rules-configuration)
- [Setting up user workspaces (Softphones)](#setting-up-user-workspaces-softphones)

---

## What is a cloud PBX

A Private Branch Exchange (PBX) is an organizational telephony system that routes internal calls between extensions and manages inbound and outbound connections with the public telephone network (PSTN).

With Voximplant, you can build a software-defined cloud PBX featuring:

* **Extension dialing**: Employees share primary company phone numbers while retaining unique internal extension numbers (e.g., `101`, `102`).
* **Call transferring**: Attended and blind transfers between extensions without dropping the caller.
* **Business hours routing**: Route calls to IVR menus, hunt groups, or on-call staff depending on operating schedules and holiday calendars.
* **Call queues & music on hold**: Hold incoming callers in prioritized queues with dynamic wait-time announcements.
* **Multi-party conferencing**: Host internal or customer-facing audio and video conference rooms.
* **Call recording and CDRs**: Automatically record calls and log Call Detail Records (CDRs) for compliance, training, and auditing.

---

## Setting up a cloud PBX

To set up a cloud PBX in Voximplant:

1. Create an [application](/platform/getting-started/create-an-application).
2. Create [users](/platform/getting-started/create-users) for each employee or extension in your PBX (you can automate user provisioning in bulk using the [AddUser](/reference/management-api/reference/users/add-user) Management API method).
3. Create three distinct [scenarios](/platform/getting-started/create-a-scenario) to handle the core call flows:
   * **Inbound calls**: Handles business hours logic, greetings, extension routing, and hunt groups.
   * **Internal extension calls**: Manages internal calling between employees and records sessions.
   * **Outbound PSTN calls**: Connects internal users to external mobile and landline numbers.

### Scenario 1: Incoming calls and business hours

This scenario evaluates whether a call arrives during operating hours:
* **During business hours**: Plays a greeting and prompts the caller to dial an extension number or wait to be routed to all available extensions.
* **Outside business hours**: Plays an after-hours prompt and directs the caller to leave a voicemail.

```javascript title="Inbound PBX scenario"
// String used to store DTMF input
let input = '';
// used to store Caller ID
let callerid;
// user to store Display Name of the caller
let displayName;
let operatorTimer;
// Timeout to let the caller enter extension number
let TIMEOUT = 3000;
// PBX extensions used marked as operators, usernames should look like 101@appname.accountname.voximplant.com
let operators = ['101', '102', '103'];
let operatorCalls = {};
let nOperatorCalls = 0;
let GMT_offset = 4; // time difference with GMT
/**
 * Working hours, calls are forwarded to extensions only during working hours,
 * for non-working hours pre-recorded message will be played
 */
let workingHours = [
  [0, 0], // Sun
  [10, 19], // Mon
  [10, 19], // Tue
  [10, 19], // Wed
  [10, 19], // Thu
  [10, 19], // Fri
  [0, 0] // Sat
];
// flag for non-working hours
let nonWorkingHours = false;
// used to store active call object
let activeOperatorCall;
// URL to mp3 file with standard greeting
let workingHoursGreetingURL = 'http://yourdomain.com/ivr.mp3';
// URL to mp3 file with custom greeting for non-working hours
let nonWorkingHoursGreetingURL = 'http://yourdomain.com/ivr_nwh.mp3';
/**
 * used to specify Caller ID for outgoing calls,
 * number can be authorized in VoxImplant Control Panel -> Settings -> Caller IDs
 */
let officeNumber = 'your_authorized_caller_id';

/**
 * Forward incoming call to agents
 */
function forwardCallToOperator(call) {
  // disable tones processing
  call.handleTones(false);
  nOperatorCalls = 0;
  // play progress tone, see http://voximplant.com/docs/references/appengine/Call.html#playProgressTone for details
  call.playProgressTone('RU');
  // call all agents simultaneously
  for (let i in operators) {
    let j = operators[i];
    nOperatorCalls++;
    // see http://voximplant.com/docs/references/appengine/VoxEngine.html#callUser for details
    operatorCalls[j] = VoxEngine.callUser({ username: j, callerid, displayName });
    operatorCalls[j].addEventListener(CallEvents.Failed, function (e) {
      if (typeof activeOperatorCall == 'undefined') {
        delete operatorCalls[e.call.number()];
        nOperatorCalls--;
        if (nOperatorCalls == 0) {
          // see http://voximplant.com/docs/references/appengine/Call.html#hangup for details
          call.hangup();
        }
      }
    });

    operatorCalls[j].addEventListener(CallEvents.Connected, function (e) {
      delete operatorCalls[e.call.number()];
      activeOperatorCall = e.call;
      // see http://voximplant.com/docs/references/appengine/VoxEngine.html#sendMediaBetween for details
      VoxEngine.sendMediaBetween(call, e.call);
      activeOperatorCall.addEventListener(CallEvents.Disconnected, VoxEngine.terminate);
      for (let i in operatorCalls) {
        operatorCalls[i].hangup();
      }
      operatorCalls = {};
    });
  }
}

/**
 * Forward incoming call to particular extension
 */
function forwardCallToExtension(call, ext) {
  clearTimeout(operatorTimer);
  call.handleTones(false);
  call.playProgressTone('RU');
  // create new call to user to forward call to extension
  let call2 = VoxEngine.callUser({ username: ext, callerid, displayName });
  // Add event handlers, see http://voximplant.com/docs/references/appengine/CallEvents.html for details
  call2.addEventListener(CallEvents.Failed, VoxEngine.terminate);
  call2.addEventListener(CallEvents.Connected, function (e) {
    // join incoming call and call to user/ext
    VoxEngine.sendMediaBetween(call, call2);
  });
  call2.addEventListener(CallEvents.Disconnected, VoxEngine.terminate);
}

VoxEngine.addEventListener(AppEvents.CallAlerting, function (e) {
  // store Caller ID of the call
  callerid = e.callerid;
  // store Display Name of the call
  displayName = e.displayName;
  e.call.addEventListener(CallEvents.Connected, function (e) {
    // Check if call was made during working hours
    let d = new Date(new Date().getTime() + GMT_offset * 3600 * 1000),
      day = d.getUTCDay(),
      hour = d.getUTCHours();
    Logger.write('Day: ' + day + ' Hour: ' + hour);
    if (hour >= workingHours[day][0] && hour < workingHours[day][1]) {
      /**
       * Working-hours
       * standard greeting playback, see http://voximplant.com/docs/references/appengine/Call.html#startPlayback for details
       */
      e.call.startPlayback(workingHoursGreetingURL, { loop: false });
      e.call.record({ hd_audio: true });
    } else {
      /**
       * Non-working hours
       * non-working hours greeting playback
       */
      nonWorkingHours = true;
      e.call.startPlayback(nonWorkingHoursGreetingURL, { loop: false });
    }
  });

  e.call.addEventListener(CallEvents.Disconnected, function (e) {
    // Terminate session, see http://voximplant.com/docs/references/appengine/VoxEngine.html#terminate for details
    VoxEngine.terminate();
  });

  e.call.addEventListener(CallEvents.PlaybackFinished, function (e) {
    // If call while working hours give some time to enter the extension before calling operators
    if (!nonWorkingHours) {
      operatorTimer = setTimeout(function () {
        forwardCallToOperator(e.call);
      }, TIMEOUT);
    } else VoxEngine.terminate(); // otherwise - terminate session
  });

  /**
   * Handle tones to check entered extension
   */
  e.call.addEventListener(CallEvents.ToneReceived, function (e) {
    // stop playback of the greeting
    e.call.stopPlayback();
    // add digit until 3 digits entered
    input += e.tone;
    if (input.length == 3) {
      // forward the call to extension
      forwardCallToExtension(e.call, input);
    }
  });

  // Enable tones processing
  e.call.handleTones(true);
  // Answer incoming call
  e.call.answer();
});
```

### Scenario 2: Internal extension calls

This scenario routes calls placed between internal PBX extensions and starts recording the session once connected:

```javascript title="Internal extension call scenario"
VoxEngine.forwardCallToUser(function (call, call2) {
  call.record({ hd_audio: false });
});
```

### Scenario 3: Outbound calls to PSTN

This scenario handles outbound calls placed from an internal PBX user to an external PSTN phone number:

<Warning title="Verified caller ID required">
To place outbound calls to external phone numbers, you must specify a verified Caller ID. Use a phone number rented from Voximplant or an external number verified in your account. Refer to [How to call a phone number](/platform/telephony/calls) for details.
</Warning>

```javascript title="Outbound PSTN call scenario"
const officeNumber = 'your-callerid-or-some-office-number';

VoxEngine.addEventListener(AppEvents.CallAlerting, function (e) {
  // make call to PSTN, see http://voximplant.com/docs/references/appengine/VoxEngine.html#callPSTN for details
  let call2 = VoxEngine.callPSTN(e.destination.substring(1), officeNumber);
  // use easyProcess function and enable call recording, see http://voximplant.com/docs/references/appengine/VoxEngine.html#easyProcess for details
  VoxEngine.easyProcess(e.call, call2, function (c, c2) {
    c.record({ hd_audio: true });
  });
});
```

### Routing rules configuration

Configure [routing rules](/platform/getting-started/create-a-routing-rule) for each scenario in your application.

Because Voximplant evaluates routing rules sequentially from top to bottom and stops at the first match, order rules from most specific to most general:

1. **Local extension rule (Top priority)**:
   * Pattern: `^1[0-9]{2}$` (matches 3-digit extensions starting with `1`, like `101`–`199`).
   * Scenario: Bind the internal extension scenario.
2. **Outbound PSTN rule (Medium priority)**:
   * Pattern: `^[0-9]{10,}$` (matches standard external phone numbers).
   * Scenario: Bind the outbound PSTN scenario.
3. **Inbound public calls rule (Lowest priority)**:
   * Pattern: `.*` (or your rented phone number).
   * Scenario: Bind the incoming calls scenario.

For detailed routing configuration, see [routing rules](/platform/getting-started/create-a-routing-rule).

---

## Setting up user workspaces (Softphones)

To make and receive calls, employees authenticate with a softphone using their application user credentials:

* **Web softphone**: Deploy our ready-to-use, open-source [voice and video app for Vue.js]() or embed the [Web SDK](/sdk/web) in your internal portal.
* **Native mobile softphones**: Build iOS and Android calling apps using our native SDKs (see [Processing voice calls in SDKs](/sdk/overview)) or explore reference demos on [GitHub]().
* **Third-party SIP phones**: Configure standard hardware desk phones or software clients (e.g., Linphone, Bria) using the full SIP URI format: `sip:USERNAME@APPNAME.ACCOUNTNAME.voximplant.com`.

Users act as PBX extensions, placing calls to other internal extension numbers or dialing external phone numbers through the configured routing rules.