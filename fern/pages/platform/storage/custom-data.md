# Custom data

You can store lightweight string payloads to pass contextual data into your scenarios across two distinct scopes:

* **Session custom data**: Associated with the entire VoxEngine JavaScript session (`VoxEngine.customData()`).
* **Call custom data**: Associated with an individual `Call` object (`call.customData()`).

---

## Session-level custom data

The [customData()]() method on the root `VoxEngine` object allows you to store and access a string of up to 200 bytes associated with the active JavaScript session.

To set a value, pass the string as an argument. To retrieve the stored value, call the method without arguments:

```javascript title="Session custom data usage"
// https://git.zingaya.com/voxengine/libs/-/blob/master/scenarios/client-voxengine/voxengine.custom-data.js
```

### Passing custom data at session start

You can initialize session custom data through several channels:

* **Control Panel manual launch**: When running a [routing rule]() manually from the Control Panel, enter custom data in the prompt dialog.
* **Management API**: When triggering scenarios via [StartScenarios](), pass your payload in the `script_custom_data` parameter. Access this payload inside your scenario using `VoxEngine.customData()`.
* **Searching Call History**: Filter historical sessions by custom data by supplying the `call_session_history_custom_data` parameter to the [GetCallHistory]() Management API method.

---

## Call-level custom data

Each `Call` instance maintains an independent [customData()]() method to store up to 200 bytes tied specifically to that call leg:

```javascript title="Call custom data usage"
// Set custom data on a specific call object
call.customData('Hello world!');

// Retrieve and log the custom data
Logger.write(call.customData());
```

You can also pass custom data through call settings from [Web and Mobile SDKs]() to transfer contextual parameters (such as user IDs or routing metadata) directly between client applications and cloud scenarios.