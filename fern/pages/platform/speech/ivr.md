# Building an IVR

Interactive Voice Response (IVR) allows callers to navigate phone menus, submit account numbers, or route themselves to specific departments using keypad DTMF tones or voice recognition.

In Voximplant, you can construct low-level IVR logic using [Call.say()](), [Call.startPlayback()](), and [Call.handleTones()](), or use the built-in **IVR helper module** (`Modules.IVR`), which provides a clean state-machine abstraction for multi-level menus.

---

## Prerequisites

Before deploying an IVR scenario:

1. Create an [application]().
2. Create a [scenario]().
3. Create a [routing rule]() to route incoming traffic to your scenario.
4. Rent a [phone number]() and bind it to your routing rule.

<Info title="Phone numbers and caller ID">
You need a phone number to receive incoming calls to your IVR. If your IVR forwards callers to external mobile or landline numbers, that same rented number acts as your verified outbound caller ID.
</Info>

---

## The VoxEngine IVR module

To use the IVR module, require it at the beginning of your scenario:

```javascript title="Require IVR module"
require(Modules.IVR);
```

The module centers on the `IVRState` class, which manages prompt playback, DTMF collection, input validation, timeouts, and state transitions.

---

## IVR state types

The IVR module supports four primary state types:

### 1. Prompt with no input (`noinput`)

Plays an audio file or TTS prompt and immediately transitions to the next state or triggers an `onInputComplete` callback once playback concludes:

```javascript title="Prompt with no input"
const mainState = new IVRState("main", {
  type: "noinput",
  prompt: {
    play: "http://www.example.com/welcome.mp3",
  },
  nextState: menuState,
});
```

### 2. Selection menu (`select`)

Presents a menu where each DTMF key branches to a different destination state. If the user presses an unmapped key or fails to press a key before the timeout expires, custom fallback handlers are invoked:

```javascript title="Selection menu"
function onInputTimeout() {
  // Handle case where caller does not make a selection
}

const menuState = new IVRState(
  "menu",
  {
    type: "select",
    prompt: { play: "http://www.example.com/menu.mp3" },
    nextStates: {
      1: salesState,
      2: supportState,
    },
  },
  null,
  onInputTimeout
);

// Loop back to menu on key 0
menuState.settings.nextStates["0"] = menuState;
```

### 3. Fixed-length input (`inputfixed`)

Collects an exact number of digits—ideal for entering extensions, PINs, or account codes:

```javascript title="Fixed-length input"
function onInputFinished(data) {
  // User entered the required number of digits (e.g., 3-digit extension)
  console.log("Extension entered:", data);
}

function onInputTimeout(data) {
  // Input timed out; data contains whatever digits were entered so far
}

const extensionState = new IVRState(
  "ExtensionInput",
  {
    type: "inputfixed",
    inputLength: 3,
    prompt: {
      play: "http://example.org/enter_extension.mp3",
    },
  },
  onInputFinished,
  onInputTimeout
);
```

### 4. Variable-length input (`inputunknown`)

Collects an arbitrary number of digits terminated by a delimiter key (such as `#`), or validated dynamically via an input validation function:

```javascript title="Variable-length input with delimiter"
function onInputFinished(data) {
  // Input complete; data contains digits entered before the '#' key
}

function onInputTimeout(data) {
  // Input timed out
}

const accountNumberState = new IVRState(
  "AccountNumber",
  {
    type: "inputunknown",
    terminateOn: "#",
    prompt: {
      play: "http://example.org/enter_account.mp3",
    },
  },
  onInputFinished,
  onInputTimeout
);
```

You can also validate input dynamically on every keypress using `inputValidator`:

```javascript title="Dynamic input validation"
function validate(input) {
  // Mark input complete if the user presses the same digit twice in a row
  if (input.length >= 2 && input[input.length - 1] === input[input.length - 2]) {
    return true;
  }
  return false;
}

const dynamicState = new IVRState(
  "DynamicValidator",
  {
    type: "inputunknown",
    inputValidator: validate,
    prompt: {
      play: "http://example.org/prompt.mp3",
    },
  },
  onInputFinished,
  onInputTimeout
);
```

---

## Complete scenario: Extension router

The following scenario answers incoming calls, prompts callers for a 3-digit extension, and dials a registered user on success or forwards to a queue on timeout:

```javascript title="Extension router scenario"
require(Modules.IVR);

function onInputFinished(extension) {
  // Treat input as an extension and call the local user
  const outCall = VoxEngine.callUser(extension, "caller_id");
  VoxEngine.easyProcess(inCall, outCall);
}

function onInputTimeout(partialInput) {
  // Fall back to a default destination or queue
  const queueCall = VoxEngine.callUser("operator", "caller_id");
  VoxEngine.easyProcess(inCall, queueCall);
}

let inCall;

VoxEngine.addEventListener(AppEvents.CallAlerting, (e) => {
  inCall = e.call;

  const mainState = new IVRState(
    "Main",
    {
      type: "inputfixed",
      inputLength: 3,
      prompt: {
        play: "http://example.com/enter_extension.mp3",
      },
    },
    onInputFinished,
    onInputTimeout
  );

  inCall.answer();

  inCall.addEventListener(CallEvents.Connected, () => {
    mainState.enter(inCall);
  });

  inCall.addEventListener(CallEvents.Disconnected, () => {
    VoxEngine.terminate();
  });

  inCall.addEventListener(CallEvents.Failed, () => {
    VoxEngine.terminate();
  });
});
```

---

## Multi-level IVR and call forwarding

You can link multiple `IVRState` instances to build complex branching trees:

* **Menu selection**: Callers press `1` to hear automated information (such as hours of operation), `2` to enter an internal extension, or `3` to enter an external phone number to forward to.
* **Call forwarding**: Use `VoxEngine.callPSTN()` and `VoxEngine.easyProcess()` to transfer callers to mobile or landline numbers entered via keypad.

```javascript title="Multi-level IVR example"
require(Modules.IVR); // enable IVR module

let call;
let introState;
let menuState;
let timeState;
let extState;
let fwdState;
let fwdNumber;

function initIVR() {
  const now = new Date();
  /**
   * State that just says current UTC time
   */
  timeState = new IVRState(
    'time',
    {
      type: 'noinput',
      prompt: {
        say: `Current time in UTC time zone is ${now.getUTCHours()}:${now.getUTCMinutes()}`,
        lang: 'en-US'
      },
      nextStates: {},
      terminateOn: '',
      nextState: null
    },
    null,
    null
  );

  /**
   * State that waits for 3-digit extension number
   * If 100 was entered - make a call to some employee
   */
  extState = new IVRState(
    'extension',
    {
      type: 'inputfixed',
      inputLength: 3,
      prompt: {
        say: 'Please enter the extension of the person you are trying to reach',
        lang: 'en-US'
      },
      nextStates: {},
      terminateOn: '',
      nextState: null
    },
    // Processing the onInputComplete event
    (data) => {
      // Extension has been entered
      if (data === '100') {
        call.say('Forwarding your call to John Connor, please wait', {
          voice: VoiceList.Amazon.en_US_Joanna
        });
        call.addEventListener(CallEvents.PlaybackFinished, handleFwdPlaybackFinished);
      } else {
        call.say(`There is no person with extension ${data}.`, {
          voice: VoiceList.Amazon.en_US_Joanna
        });
        call.addEventListener(CallEvents.PlaybackFinished, handleFwdPlaybackFinished2);
      }
    },
    // Processing onInputTimeout event
    (data) => {
      // Timeout
      extState.enter(call);
    }
  );

  /**
   * State that waits for US phone number and #
   * if valid US phone number was specified it forwards call to this number
   */
  fwdState = new IVRState(
    'callforward',
    {
      type: 'inputunknown',
      terminateOn: '#',
      prompt: {
        say: 'Please specify US phone number in international format and press pound',
        lang: 'en-US'
      },
      nextStates: {},
      nextState: null
    },
    (data) => {
      // Input finished
      const number = data.replace('#', '');
      // Check if the specified number is valid US phone number
      Net.httpRequest(
        `http://api.phone-validator.net/api/v2/verify?PhoneNumber=${number}&CountryCode=us`,
        (e) => {
          if (e.code === 200) {
            const result = JSON.parse(e.text);
            if (result.status === 'VALID_CONFIRMED') {
              fwdNumber = number;
              call.say('Forwarding your call to specified phone number, please wait', {
                voice: VoiceList.Amazon.en_US_Joanna
              });
              call.addEventListener(CallEvents.PlaybackFinished, handleFwdPlaybackFinished);
            } else {
              call.say('You have specified wrong phone number.', {
                voice: VoiceList.Amazon.en_US_Joanna
              });
              call.addEventListener(CallEvents.PlaybackFinished, handleFwdPlaybackFinished3);
            }
          } else {
            call.say('Something went wrong, please try again.', {
              voice: VoiceList.Amazon.en_US_Joanna
            });
            call.addEventListener(CallEvents.PlaybackFinished, handleFwdPlaybackFinished3);
          }
        }
      );
    },
    (data) => {
      // Timeout
      fwdState.enter(call);
    }
  );

  /**
   * Menu state - 3 options
   */
  menuState = new IVRState(
    'menu',
    {
      type: 'select',
      prompt: {
        say:
          'Press 1 to say time, press 2 enter extension number, press 3 to forward call to specified US number.',
        lang: 'en-US'
      },
      nextStates: {
        1: timeState,
        2: extState,
        3: fwdState
      },
      terminateOn: '',
      nextState: null
    },
    null,
    () => {
      // Timeout
      menuState.enter(call);
    }
  );

  /**
   * Intro state
   */
  introState = new IVRState(
    'intro',
    {
      type: 'noinput',
      prompt: {
        say: 'Hello, welcome to VoxImplant demo!',
        lang: 'en-US'
      },
      nextStates: {},
      terminateOn: '',
      nextState: menuState
    },
    null,
    null
  );

  timeState.settings.nextState = menuState;
}

// Forwards call to phone number
function handleFwdPlaybackFinished(e) {
  call.removeEventListener(CallEvents.PlaybackFinished, handleFwdPlaybackFinished);
  const callerId = '+1234567890'; // Rented or verified phone number
  let outgoingCall;
  if (fwdNumber == null) {
    // Calling John
    outgoingCall = VoxEngine.callPSTN("John's number", callerId); // specify John's number here
  } else {
    // Calling specified phone number
    outgoingCall = VoxEngine.callPSTN(fwdNumber, callerId);
  }
  outgoingCall.addEventListener(CallEvents.Connected, (e) => {
    VoxEngine.sendMediaBetween(e.call, call); // start sending media between outgoing call and incoming call
  });
  outgoingCall.addEventListener(CallEvents.Failed, VoxEngine.terminate);
  outgoingCall.addEventListener(CallEvents.Disconnected, VoxEngine.terminate);
}

// Wrong input - return to extState
function handleFwdPlaybackFinished2(e) {
  call.removeEventListener(CallEvents.PlaybackFinished, handleFwdPlaybackFinished2);
  extState.enter(call);
}

// Wrong input - return to fwdState
function handleFwdPlaybackFinished3(e) {
  call.removeEventListener(CallEvents.PlaybackFinished, handleFwdPlaybackFinished3);
  fwdState.enter(call);
}

// Init IVR states after the session start
VoxEngine.addEventListener(AppEvents.Started, (e) => {
  initIVR();
});

// Handle incoming call
VoxEngine.addEventListener(AppEvents.CallAlerting, (e) => {
  call = e.call;
  // add event listeners
  call.addEventListener(CallEvents.Connected, handleCallConnected);
  call.addEventListener(CallEvents.Disconnected, handleCallDisconnected);
  call.answer(); // answer the call
});

// After call connected enter introState
function handleCallConnected(e) {
  introState.enter(call);
}

function handleCallDisconnected(e) {
  // Just finish the session
  VoxEngine.terminate();
}
```

---

## Voice-driven IVRs with speech recognition

In addition to DTMF keypad tones, you can build conversational IVRs that understand natural human speech using Voximplant's built-in speech recognition modules. Refer to [Speech-to-text]() to learn how to add voice recognition to your IVR flows.