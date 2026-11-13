# Live dashboard

Build custom, real-time monitoring dashboards that track contact center metrics as calls happen. By storing operational state in Key-Value Storage, your external web services, supervisor dashboards, and status displays can fetch live session statistics via the Management API.

---

## How it works

To publish metrics from active call sessions and access them externally, use [Key-value storage]():

1. **Write metrics in scenarios**: During active calls in your [voice contact center]() or [video contact center](), scenarios collect custom metrics (such as active call status, duration, or agent assignments) and persist them using the VoxEngine [put()]() method from the `ApplicationStorage` module.
2. **Read metrics externally**: To display these metrics on an external dashboard, your backend queries the Management API [GetKeyValueItems]() method. This returns stored metrics in JSON format, allowing you to refresh dashboard views at your preferred polling frequency.

You can apply this pattern to any Voximplant workflow, including [call list campaigns]() and standard [voice calls]().

---

## Implementing a live dashboard

### 1. Require ApplicationStorage in your scenario

To interact with the Key-Value Storage, require the `ApplicationStorage` module at the beginning of your scenario:

```javascript title="Require ApplicationStorage module"
require(Modules.ApplicationStorage);
```

### 2. Save session metrics to Key-Value Storage

Define the metric keys and data structures you want to monitor. We recommend using a consistent key prefix (such as `call_` or `agent_`) so you can query or delete records in batches using key prefixes.

Use `ApplicationStorage.put()` to store or update data. When writing a value with an existing key, the previous value is overwritten.

The following scenario demonstrates collecting call metadata (caller number, destination, call state, connection time) and saving it to Key-Value Storage:

```javascript title="Saving data to Key-Value Storage"
// https://git.zingaya.com/voxengine/libs/-/blob/master/scenarios/client-voxengine/acd.dashboard-kvs.js
```

In this scenario, calling `updateCallData()` pushes updated session metrics to the cloud storage.

<Info title="Resource cleanup">
To avoid unnecessary storage costs, delete key-value pairs when the call terminates by calling `ApplicationStorage.del()` inside your `CallEvents.Disconnected` or `AppEvents.Terminating` event handlers. Review storage pricing on the [billing page]().
</Info>

### 3. Query metrics from your dashboard

Your external dashboard service can query stored metrics at any interval using the [GetKeyValueItems]() Management API method:

```bash title="Retrieve key-value items"
curl -X POST "https://api.voximplant.com/platform_api/GetKeyValueItems" \
  -H "Authorization: Bearer YOUR_GENERATED_JWT" \
  -d "account_id=1&application_id=1&key_prefix=call_"
```

```json title="Response"
{
  "result": [
    {
      "key": "call_12345",
      "value": "{\"caller\":\"+15550100\",\"destination\":\"+15550199\",\"state\":\"connected\",\"duration\":42}"
    }
  ]
}
```

The API returns a JSON array of matching keys and values, which your frontend can parse and display in real time.

Refer to [Service accounts and API keys]() to configure authenticated JWT requests for your dashboard service.

---

## See also

- [Key-value storage]()
- [Management API]()