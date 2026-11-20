# Phone number masking

Learn how to build a phone number masking solution using Voximplant's [Key-Value Storage](/platform/storage/key-value-storage).

Phone number masking protects user privacy in rideshare, delivery, and marketplace platforms by allowing customers and service providers (such as couriers or drivers) to call each other without revealing their personal phone numbers. Both parties dial a single shared virtual number rented from Voximplant and enter an **order number** on the keypad to connect.

How it works:
* When a courier calls the virtual number and enters the order ID, the scenario identifies the caller's phone number, looks up the corresponding customer's number in Key-Value Storage, and bridges the call.
* When the customer calls the same virtual number and enters the order ID, the scenario connects them to the courier.
* If an unrecognized phone number calls, the system prompts the caller to dial from the number associated with the order or transfers them to a support agent.

---

## Prerequisites

1. Create an [application](/platform/getting-started/create-an-application).
2. Create a [scenario](/platform/getting-started/create-a-scenario).
3. Create a [routing rule](/platform/getting-started/create-a-routing-rule) and bind it to your scenario.
4. Rent a [phone number](/platform/getting-started/buy-a-phone-number) and attach it to your routing rule as the shared virtual number.
5. Prepare test phone numbers representing the courier, customer, and support agent.

---

## Scenario setup

Below is the complete scenario implementation for phone number masking using Key-Value Storage:

```javascript title="Phone number masking scenario"
require(Modules.ApplicationStorage);

/**
 * @param {boolean} repeatAskForInput - whether the input request was repeated
 * @param longInputTimerId - timer for the absence of input
 * @param shortInputTimerId - timer for triggering the phrase about contacting an agent
 * @param {boolean} firstTimeout - indicator of the first timeout
 * @param {boolean} wrongPhone - indicator that the caller's number matches the number from storage
 * @param {boolean} inputRecieved - whether the input was received from the user
 *
 */

let repeatAskForInput;
let longInputTimerId;
let shortInputTimerId;
let firstTimeout = true;
let wrongPhone;
let inputRecieved;

const store = {
  call: null,
  caller: '',
  callee: '',
  callid: 'phone number rented in the panel',
  operator_call: null,
  operatorNumber: '',
  input: '',
  data: {
    call_operator: '',
    order_number: '',
    order_search: '',
    phone_search: '',
    sub_status: '',
    sub_available: '',
    need_operator: '',
    call_record: ''
  }
};

const phrases = {
  start: 'Hello. Please -- enter the five-digit order number in tone mode.',
  repeat:
    'Please -- enter the five-digit order number in tone mode, or press pound to contact an agent.',
  noInputGoodbye:
    'You have not chosen anything. You can look up the order number in the text message and call us again. Goodbye, have a nice day!',
  connectToOperator: 'To contact an agent, press pound.',
  connectingToOperator: 'Stay on the line, putting you through to an agent.',
  operatorUnavailable:
    'Unfortunately, all agents are busy.. Please,,, call back later. Goodbye, have a nice day!',
  wrongOrder:
    'Order number is not found. Look up the order number in the text message and enter it in tone mode. Or contact an agent by pressing pound.',
  wrongOrderGoodbye: 'You didn’t choose anything.. Goodbye, have a nice day!',
  wrongPhone:
    'Phone number is not found. If you are a customer, please call back from the number you used to place your order. If you are a courier, please call back from the number that is registered in our system. Or contact an agent by pressing pound.',
  wrongPhoneGoodbye: 'You didn’t choose anything.. Goodbye, have a nice day!',
  courierIsCalling: `A courier is calling you about the order delivery, - - ${store.data.order_number}`,
  clientIsCalling: `A customer is calling you about the order delivery, - - ${store.data.order_number}`,
  courierUnavailable:
    'It seems like the courier is unavailable at the moment. Please call back in a couple of minutes. Goodbye, have a nice day!',
  clientUnavailable:
    'It seems like the customer is unavailable at the moment. Please call back in a couple of minutes. Goodbye, have a nice day!',
  waitForCourier: 'Stay on the line, putting you through to the courier.',
  waitForClient: 'Stay on the line, putting you through to the customer.'
};

VoxEngine.addEventListener(AppEvents.Started, async (e) => {
  VoxEngine.addEventListener(AppEvents.CallAlerting, callAlertingHandler);
});

async function callAlertingHandler({ call, callerid }) {
  store.call = call;
  store.caller = callerid;
  call.addEventListener(CallEvents.Connected, callConnectedHandler);
  call.addEventListener(CallEvents.Disconnected, callDisconnectedHandler);
  call.answer();
}

async function callDisconnectedHandler() {
  await sendResultToDb();
  VoxEngine.terminate();
}

async function callConnectedHandler() {
  const { call } = store;
  if (!call) return;
  call.handleTones(true);
  call.addEventListener(CallEvents.RecordStarted, (e) => {
    store.data.call_record = e.url;
  });
  call.record({ hd_audio: true });
  call.addEventListener(CallEvents.ToneReceived, dtmfHandler);
  await say(phrases.start);
  addInputTimeouts();
}

function dtmfHandler(e) {
  const { call } = store;
  if (!call) return;
  clearInputTimeouts();
  store.input += e.tone;
  Logger.write('Entered digit is ' + e.tone);
  Logger.write('Full number ' + store.input);
  if (e.tone === '#') {
    store.data.need_operator = 'Yes';
    call.removeEventListener(CallEvents.ToneReceived);
    call.handleTones(false);
    callOperator();
    return;
  }

  if (!wrongPhone) {
    if (store.input.length >= 5) {
      repeatAskForInput = true;
      Logger.write(`Received number is ${store.input}. `);
      call.handleTones(false);
      call.removeEventListener(CallEvents.ToneReceived);
      handleInput();
      return;
    }
  }
  addInputTimeouts();
}

function addInputTimeouts() {
  const { call } = store;
  if (!call) return;
  clearInputTimeouts();
  if (firstTimeout) {
    Logger.write('Timer for the phrase about contacting an agent is triggered');
    shortInputTimerId = setTimeout(async () => {
      await say(phrases.connectToOperator);
    }, 1500);
    firstTimeout = false;
  }

  longInputTimerId = setTimeout(async () => {
    Logger.write('Timer for no input from the user is triggered ' + longInputTimerId);
    call.removeEventListener(CallEvents.ToneReceived);
    call.handleTones(false);
    if (store.input) {
      handleInput();
      return;
    }
    if (!repeatAskForInput) {
      Logger.write('Asking the caller to re-enter the number');
      call.handleTones(true);
      call.addEventListener(CallEvents.ToneReceived, dtmfHandler);
      await say(phrases.repeat);
      addInputTimeouts();
      repeatAskForInput = true;
    } else {
      Logger.write('Number is not entered. Ending the call');
      await say(inputRecieved ? phrases.wrongOrderGoodbye : phrases.noInputGoodbye);
      call.hangup();
    }
  }, 8000);
  Logger.write('Timer for no input from the user is triggered ' + longInputTimerId);
}

function clearInputTimeouts() {
  Logger.write(`Clearing the timer ${longInputTimerId}. `);
  if (longInputTimerId) clearTimeout(longInputTimerId);
  if (shortInputTimerId) clearTimeout(shortInputTimerId);
}

async function handleInput() {
  const { call } = store;
  if (!call) return;

  store.data.order_number = store.input;
  Logger.write('Looking for a match in the key-value store by the entered number: ' + store.input);
  inputRecieved = true;

  let kvsAnswer = await ApplicationStorage.get(store.input);
  if (kvsAnswer) {
    store.data.order_search = 'Order is found';
    Logger.write('Received response from kvs: ' + kvsAnswer.value);
    let { courier, client } = JSON.parse(kvsAnswer.value);
    if (store.caller == courier) {
      Logger.write('Courier is calling');
      store.callee = client;
      store.data.sub_status = 'Courier';
      store.data.phone_search = 'Phone number is found';
      callCourierOrClient();
    } else if (store.caller == client) {
      Logger.write('Customer is calling');
      store.callee = courier;
      store.data.sub_status = 'Customer';
      store.data.phone_search = 'Phone number is found';
      callCourierOrClient();
    } else {
      Logger.write('Number of the caller does not match the numbers received from kvs');
      wrongPhone = true;
      store.data.phone_search = 'Phone number is not found';
      store.input = '';
      call.handleTones(true);
      call.addEventListener(CallEvents.ToneReceived, dtmfHandler);
      await say(phrases.wrongPhone);
      addInputTimeouts();
    }
  } else {
    Logger.write('No match in kvs for the entered number');
    store.data.order_search = 'Order is not found';
    store.input = '';
    call.handleTones(true);
    call.addEventListener(CallEvents.ToneReceived, dtmfHandler);
    await say(phrases.wrongOrder);
    Logger.write(`Clearing the timer ${longInputTimerId}. `);
    addInputTimeouts();
  }
}

async function callCourierOrClient() {
  const call = store.call;
  if (!call) return;
  clearInputTimeouts();
  Logger.write('Starting a call to the courier/customer');
  await say(
    store.data.sub_status === 'Courier' ? phrases.waitForClient : phrases.waitForCourier,
    call
  );
  const secondCall = VoxEngine.callPSTN(store.callee, store.callid);
  call.startPlayback('http://cdn.voximplant.com/toto.mp3');
  secondCall.addEventListener(CallEvents.Connected, async () => {
    store.data.sub_available = 'Yes';
    await say(
      store.data.sub_status === 'Courier' ? phrases.courierIsCalling : phrases.clientIsCalling,
      secondCall
    );
    call.stopPlayback();
    VoxEngine.sendMediaBetween(call, secondCall);
  });
  secondCall.addEventListener(CallEvents.Disconnected, () => {
    call.hangup();
  });
  secondCall.addEventListener(CallEvents.Failed, async () => {
    store.data.sub_available = 'No';
    call.stopPlayback();
    await say(
      store.data.sub_status === 'Courier' ? phrases.clientUnavailable : phrases.courierUnavailable,
      call
    );
    call.hangup();
  });
}

async function callOperator() {
  Logger.write('Starting a call to an agent');
  const call = store.call;
  if (!call) return;
  await say(phrases.connectingToOperator, call);
  call.startPlayback('http://cdn.voximplant.com/toto.mp3');
  const operatorCall = VoxEngine.callPSTN(store.operatorNumber, store.callid);
  store.operator_call = operatorCall;
  operatorCall.addEventListener(CallEvents.Connected, async () => {
    store.data.call_operator = 'agent is free';
    VoxEngine.sendMediaBetween(call, operatorCall);
  });
  operatorCall.addEventListener(CallEvents.Disconnected, () => {
    call.hangup();
  });
  operatorCall.addEventListener(CallEvents.Failed, async () => {
    store.data.call_operator = 'agent is busy';
    await say(phrases.operatorUnavailable, call);
    call.hangup();
  });
}

async function sendResultToDb() {
  Logger.write('Data to be sent to the database');
  Logger.write(JSON.stringify(store.data));
  const options = {
    headers: { 'Content-Type': 'application/json' },
    method: 'POST',
    postData: JSON.stringify(store.data)
  };
  await Net.httpRequestAsync('https://voximplant.com/', options);
}

function say(text, call = store.call) {
  return new Promise((resolve) => {
    if (call) {
      call.say(text, { voice: VoiceList.Amazon.en_AU_Nicole });
      call.addEventListener(CallEvents.PlaybackFinished, function callback(e) {
        resolve(call.removeEventListener(CallEvents.PlaybackFinished, callback));
      });
    }
  });
}
```

After pasting this code into your scenario, replace the caller ID in the `store` configuration with your rented Voximplant phone number.

---

## Code explanation

### 1. Collect the order number via DTMF

When an incoming call arrives, prompt the caller to enter their order number and handle keypad input in `dtmfHandler`:

```javascript title="Accumulate DTMF digits"
store.input += e.tone;
```

If the caller presses `#`, transfer the call to an operator:

```javascript title="Transfer to support agent"
if (e.tone === '#') {
  store.data.need_operator = 'Yes';
  call.removeEventListener(CallEvents.ToneReceived);
  call.handleTones(false);
  callOperator();
  return;
}
```

Once the caller enters 5 digits, stop listening for tones and process the input:

```javascript title="Process completed DTMF input"
if (store.input.length >= 5) {
  repeatAskForInput = true;
  Logger.write(`Received number is ${store.input}.`);
  call.handleTones(false);
  call.removeEventListener(CallEvents.ToneReceived);
  handleInput();
  return;
}
```

### 2. Query Key-Value Storage

Look up the entered order number in storage using [ApplicationStorage.get()](/reference/voxengine/application-storage#get):

```javascript title="Lookup order in Key-Value Storage"
store.data.order_number = store.input;
Logger.write('Looking for a match in the key-value store by the entered number: ' + store.input);
inputReceived = true;
const kvsAnswer = await ApplicationStorage.get(store.input);
```

If a record matches, parse the stored courier and customer phone numbers:

```javascript title="Parse order contact numbers"
if (kvsAnswer) {
  store.data.order_search = 'Order is found';
  Logger.write('Received response from kvs: ' + kvsAnswer.value);
  const { courier, client } = JSON.parse(kvsAnswer.value);
}
```

Compare the caller's phone number against the numbers associated with the order:

* If the caller is the courier, bridge to the customer.
* If the caller is the customer, bridge to the courier.
* If the caller's number does not match either record, prompt them to redial from their registered phone number:

```javascript title="Verify caller identity and route call"
if (store.caller === courier) {
  Logger.write('Courier is calling');
  store.callee = client;
  store.data.sub_status = 'Courier';
  store.data.phone_search = 'Phone number is found';
  callCourierOrClient();
} else if (store.caller === client) {
  Logger.write('Customer is calling');
  store.callee = courier;
  store.data.sub_status = 'Customer';
  store.data.phone_search = 'Phone number is found';
  callCourierOrClient();
} else {
  Logger.write('Caller number does not match numbers registered for this order');
  wrongPhone = true;
  store.data.phone_search = 'Phone number is not found';
  store.input = '';
  call.handleTones(true);
  call.addEventListener(CallEvents.ToneReceived, dtmfHandler);
  await say(phrases.wrongPhone);
  addInputTimeouts();
}
```

If the order number itself does not exist in storage, prompt the caller to re-enter their order ID:

```javascript title="Handle unknown order number"
else {
  Logger.write('No match in kvs for the entered number');
  store.data.order_search = 'Order is not found';
  store.input = '';
  call.handleTones(true);
  call.addEventListener(CallEvents.ToneReceived, dtmfHandler);
  await say(phrases.wrongOrder);
  addInputTimeouts();
}
```

### 3. Bridge the call

In `callCourierOrClient()`, notify the caller that the connection is underway, initiate the outbound call to the callee using [callPSTN()](/reference/voxengine/voxengine#callpstn), and play hold music to the caller:

```javascript title="Dial destination and play hold music"
await say(store.data.sub_status === 'Courier' ? phrases.waitForClient : phrases.waitForCourier, call);
const secondCall = VoxEngine.callPSTN(store.callee, store.callid);
call.startPlayback('http://cdn.voximplant.com/toto.mp3');
```

When the callee answers, announce the call context (e.g., "Connecting you with your delivery driver"), stop hold music, and bridge audio between the two legs using `VoxEngine.sendMediaBetween()`:

```javascript title="Announce call to callee and bridge audio"
secondCall.addEventListener(CallEvents.Connected, async () => {
  store.data.sub_available = 'Yes';
  await say(store.data.sub_status === 'Courier' ? phrases.courierIsCalling : phrases.clientIsCalling, secondCall);
  call.stopPlayback();
  VoxEngine.sendMediaBetween(call, secondCall);
});
```

Handle call completion when either party disconnects:

```javascript title="Handle callee disconnect"
secondCall.addEventListener(CallEvents.Disconnected, () => {
  call.hangup();
});
```

If the callee does not answer or is unavailable, notify the caller and terminate the session:

```javascript title="Handle callee unavailable"
secondCall.addEventListener(CallEvents.Failed, async () => {
  store.data.sub_available = 'No';
  call.stopPlayback();
  await say(store.data.sub_status === 'Courier' ? phrases.clientUnavailable : phrases.courierUnavailable, call);
  call.hangup();
});
```

### Text-to-speech helper

Use [call.say()](/reference/voxengine/call#say) to play system prompts to either party. Select a voice from the [list of Voximplant TTS providers]():

```javascript title="Text-to-speech helper"
function say(text, call = store.call) {
  return new Promise((resolve) => {
    if (call) {
      call.say(text, { voice: VoiceList.Amazon.en_AU_Nicole });
      call.addEventListener(CallEvents.PlaybackFinished, function callback() {
        resolve(call.removeEventListener(CallEvents.PlaybackFinished, callback));
      });
    }
  });
}
```

You can also record masked conversations for quality assurance using [call.record()](/reference/voxengine/call#record).

---

## Managing order data in Key-Value Storage

To allow the scenario to look up active orders, your backend populates Key-Value Storage using the [Management API](/overview/how-voximplant-works/management-api). You can use the official [Python API client]():

1. Install the Python SDK:
```bash title="Install Python SDK"
pip install voximplant-apiclient
```

2. Seed order records into Key-Value Storage:

```python title="kvs.py"
from voximplant.apiclient import VoximplantAPI, VoximplantException

if __name__ == "__main__":
    voxapi = VoximplantAPI("credentials.json")

    # 5-digit Order ID used as the key
    KEY = "12345"
    VALUE = '{"courier": "12222222222", "client": "13333333333"}'
    APPLICATION_ID = 1
    TTL = 864000  # Key expiration in seconds (10 days)

    try:
        res = voxapi.set_key_value_item(
            KEY,
            VALUE,
            APPLICATION_ID,
            ttl=TTL
        )
        print("Order saved successfully:", res)
    except VoximplantException as e:
        print(f"Error: {e.message}")
```

Generate `credentials.json` by creating a service account with the appropriate permissions under [Service accounts]() in the Control Panel.

When an order is completed, call [del_key_value_item]() to delete the record so parties can no longer reach each other once fulfillment finishes.

---

## Testing the application

1. Run `python kvs.py` to seed an order record with your test customer and courier phone numbers.
2. From one of the registered test numbers, dial your rented Voximplant virtual number.
3. Enter the 5-digit order ID (`12345`) on the dial pad.
4. Verify that the platform identifies your caller ID and bridges the call to the other party while masking both private numbers.