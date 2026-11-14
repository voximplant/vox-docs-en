# Key-Value Storage

Voximplant provides a built-in cloud database for storing persistent key-value pairs accessible across all scenarios within an application.

You can store an unlimited number of key-value pairs:
* **Keys**: Strings up to 200 characters.
* **Values**: Strings up to 2,000 characters.

*Use case example*: Key-Value Storage is ideal for phone number masking in rideshare or delivery applications. An order ID serves as the key, and the masked phone numbers of the customer and courier serve as values, connecting the parties without exposing their private personal numbers.

In this guide, we will build a scenario that tracks and announces how many times a user has called.

---

## Prerequisites

1. Create an [application]().
2. Create a [scenario]().
3. Create a [routing rule]() and bind it to your scenario.
4. Create an application [user]() to authenticate your test client.

You will also need a client application to place test calls (see [Processing voice calls in SDKs]()), or you can place a test call directly using the built-in [web softphone]().

---

## Scenario setup

In your scenario, require the `ApplicationStorage` module. Use [ApplicationStorage.put()]() to create or update values, and [ApplicationStorage.get()]() to retrieve them.

Refer to the [ApplicationStorage API reference]() for complete parameter specifications.

Here is the complete scenario for tracking and announcing call counts:

```javascript title="Key-Value Storage call counter scenario"
// https://git.zingaya.com/voxengine/libs/-/blob/master/scenarios/client-voxengine/voxengine.key-value-storage.js
```

### Implementation breakdown

First, retrieve the existing `totalCalls` counter from storage. If no record exists, initialize the key with `'0'` and specify a time-to-live (TTL) expiration:

```javascript title="Check and initialize storage key"
const res = await ApplicationStorage.get('totalCalls');
let current;

if (!res || res.value === null) {
  await ApplicationStorage.put('totalCalls', '0', storageTTL.week);
  current = 0;
} else {
  current = Number(res.value) || 0;
}
```

Next, increment the counter and persist the updated value back to storage:

```javascript title="Increment and update storage key"
const next = current + 1;

try {
  await ApplicationStorage.put('totalCalls', String(next), storageTTL.week);
} catch (err) {
  Logger.write(`Failure while updating totalCalls value: ${err}`);
}
```

<Warning title="Handle promise rejections">
Always wrap asynchronous `ApplicationStorage` calls in `try...catch` blocks or chain `.catch()` handlers. Unhandled promise rejections will cause scenario execution to terminate immediately. Learn more about [promise handling]().
</Warning>

After updating the key-value pair, the scenario answers the call, synthesizes a voice prompt announcing the total number of previous calls, and hangs up once playback completes.

---

## Test your application

1. Open the [web softphone]() and log in with your application user credentials.
2. Enter any destination string and click **Call**.
3. Listen to the synthesized greeting announcing your cumulative call count.
4. Hang up and place another call to confirm that the counter increments persistently.