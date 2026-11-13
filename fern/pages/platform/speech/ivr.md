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
// https://git.zingaya.com/voxengine/libs/-/blob/master/scenarios/client-voxengine/ivr.example.js
```

---

## Voice-driven IVRs with speech recognition

In addition to DTMF keypad tones, you can build conversational IVRs that understand natural human speech using Voximplant's built-in speech recognition modules. Refer to [Speech-to-text]() to learn how to add voice recognition to your IVR flows.