# Click-to-call web widget

A click-to-call widget embeds directly on your website, allowing visitors to initiate VoIP calls to your support or sales team right from their browser without dialing a phone number.

Key capabilities:
* Place calls to a Voximplant user, phone number, or SIP address.
* Dial DTMF extension numbers after connection.
* Mute and unmute the local microphone during calls.
* Test microphone input with a built-in echo test before connecting.
* Inspect real-time connection status and audio quality indicators.

## Contents

- [VoxEngine cloud setup](#voxengine-cloud-setup)
- [Frontend widget setup](#frontend-widget-setup)
- [Project structure](#project-structure)
- [Additional configuration](#additional-configuration)
- [Download the demo](#download-the-demo)

---

## VoxEngine cloud setup

### 1. Create an application and user

1. Create a Voximplant [application]().
2. Create an application [user]() that the web widget will use to authenticate with the platform.

### 2. Create the microphone test scenario

Create a scenario dedicated to testing the visitor's microphone before placing live calls:

```javascript title="Microphone check scenario"
require(Modules.ASR);
require(Modules.Recorder);

VoxEngine.addEventListener(AppEvents.CallAlerting, (e) => {
  let recordUrl;
  const recorder = VoxEngine.createRecorder({ hd_audio: true });
  recorder.addEventListener(RecorderEvents.Started, (e) => {
    recordUrl = e.url;
  });
  e.call.say(
    'Hello, welcome to VoxImplant testing service.' +
      'Please record your message,' +
      'afterwards your message will be played back to you.',
    { voice: VoiceList.Amazon.en_US_Joanna }
  );
  e.call.addEventListener(CallEvents.PlaybackFinished, () => {
    e.call.sendMessage('record');
    e.call.sendMediaTo(recorder);
    e.call.handleMicStatus(true);
    e.call.removeEventListener(CallEvents.PlaybackFinished);
  });
  e.call.addEventListener(CallEvents.MicStatusChange, (e) => {
    if (e.active === false) {
      recorder.stop();
      e.call.sendMessage(recordUrl);
      e.call.removeEventListener(CallEvents.MicStatusChange);
      e.call.startPlayback(recordUrl);
      e.call.addEventListener(CallEvents.PlaybackFinished, () => {
        e.call.say(
          'If you were able to hear your own voice, ' +
            'then you have configured your audio recording device correctly.' +
            'If you hear this message but not your own voice then you need to configure' +
            ' your audio recording device. Goodbye.',
          { voice: VoiceList.Amazon.en_US_Joanna }
        );
        e.call.removeEventListener(CallEvents.PlaybackFinished);
        e.call.addEventListener(CallEvents.PlaybackFinished, () => {
          VoxEngine.terminate();
        });
      });
    }
  });
  e.call.answer();
});
```

### 3. Create the call routing scenario

Create a separate scenario to handle live incoming calls. Choose the code snippet that matches your target destination:

#### Route to a Voximplant user

```javascript title="Route call to an application user"
VoxEngine.forwardCallToUser((call1, call2) => true, true);
```

#### Route to a phone number (PSTN)

```javascript title="Route call to a phone number (PSTN)"
const callerid = "+15550100"; // Replace with your verified caller ID
VoxEngine.forwardCallToPSTN(null, null, { callerid });
```

#### Route to a SIP address

```javascript title="Route call to a SIP endpoint"
const callerid = '';
VoxEngine.addEventListener(AppEvents.CallAlerting, (e) => {
  const newCall = VoxEngine.callSIP(e.toURI, {
    callerid,
    displayName: e.displayName,
    scheme: e.scheme,
  });
  VoxEngine.easyProcess(e.call, newCall);
});

```

<Warning title="Caller ID requirement">
To place outbound calls to phone numbers (PSTN), you must specify a verified Caller ID. You can [buy a phone number from Voximplant]() or verify your existing phone number in the Control Panel using an automated verification call.
</Warning>

### 4. Configure routing rules

Create two separate [routing rules]() in your application:

1. **Microphone test rule**:
   * Name: `testmic-rule`
   * Pattern: `testmic`
   * Scenario: Bind the microphone check scenario.
   * Priority: Place this rule at the **top** of your routing list.
2. **Call forwarding rule**:
   * Name: `live-call-rule`
   * Pattern: `.*` (or your destination identifier)
   * Scenario: Bind the call routing scenario.
   * Priority: Position this rule **below** the microphone test rule.

---

## Frontend widget setup

### 1. Clone and install dependencies

Download the [click-to-call widget repository]() and install project dependencies:

```bash title="Install dependencies"
npm install
# or
yarn install
```

### 2. Configure environment variables

Rename `.env.example` to `.env` and fill in your application details:

```text title=".env"
VUE_APP_USER=your_user_name
VUE_APP_PASSWORD=your_user_password
VUE_APP_NUMBER=destination_to_call
VUE_APP_TEST_NUMBER=testmic
```

* `VUE_APP_USER`: The username of the Voximplant application user created in Step 1.
* `VUE_APP_PASSWORD`: The password for the application user.
* `VUE_APP_NUMBER`: The destination to reach (a username, phone number, or SIP URI).
* `VUE_APP_TEST_NUMBER`: Set to `testmic` to match the microphone test routing rule.

### 3. Run and build

Start the local development server:

```bash title="Run development server"
npm run serve
# or
yarn serve
```

Open `http://localhost:8080/` in your browser to test the widget.

To generate production-ready static assets:

```bash title="Build for production"
npm run build
# or
yarn build
```

The compiled assets in the `dist` directory are ready to deploy to your web server. If serving from a subpath instead of the web server root, configure the `publicPath` property in `vue.config.js` (refer to the [Vue CLI publicPath guide]()).

---

## Project structure

* `public/` — Static assets, favicon, and `index.html` template.
* `src/` — Main application source code.
* `src/assets/` — Images and audio resources.
* `src/components/` — UI components, call dialogs, and audio meters.
* `src/router/` — Application routes.
* `src/views/` — Application pages (`Home.vue` for the full-page widget; `Button.vue` for an embeddable standalone button).

---

## Additional configuration

* **Custom SIP headers**: URL query parameters prefixed with `x-` (e.g., `?x-customer-id=123`) are forwarded as custom SIP headers into your VoxEngine scenario.
* **Standalone button preview**: Test the embeddable button view directly at `http://localhost:8080/button`.

---

## Download the demo

Explore the open-source reference implementation:

* [Click-to-call repository]()