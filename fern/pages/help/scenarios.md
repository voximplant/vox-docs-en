# VoxEngine scenarios

This section will help you diagnose, debug, and troubleshoot VoxEngine scenarios.

Before troubleshooting, verify that your scenario adheres to the architecture described in [VoxEngine concepts](). We also recommend the following development best practices:

* **Target modern ECMAScript**: Ensure your code conforms to ECMAScript 6 or later. Do not transpile below this standard.
* **Keep code human-readable**: Avoid minifying or obfuscating code when bundling. Minified code makes stack traces hard to interpret and complicates support investigations.
* **Follow consistent style guidelines**: Standardize code formatting using guidelines such as [Google's JavaScript style guide]().

---

## Built-in Logger

In addition to standard [console.log()](), Voximplant provides the [Logger.write()]() method to record diagnostic messages directly to the cloud session log.

<Aside>
```javascript title="Logger example"
// https://git.zingaya.com/voxengine/libs/-/blob/master/scenarios/client-voxengine/voxengine.logger-example.js
```
</Aside>

Session logs are saved automatically and can be inspected anytime in the [Call history]() section of the Control Panel. Like native console logging, you can pass strings or serializable objects to [Logger.write()]() to inspect session state:

---

## Cloud IDE debugger

The Cloud IDE includes an integrated real-time debugger that allows you to step through scenario execution as live calls take place.

To access the debugger:

1. Open your application in the [Applications]() section of the Control Panel.
2. Go to the **Scenarios** tab and select the scenario you want to test.
3. In the upper-right corner, click **Debug** to open the debug parameters dialog.

### Debug parameters

Before starting a debug session, configure your trigger criteria:

* **Target rule**: Select the routing rule to associate with the debugging session.
* **Filter criteria**: Choose which sessions attach to the debugger:
  * **Calls from a specific IP address** — Connects the debugger only to sessions initiated from a designated IP.
  * **Calls from a specific phone number** — Connects only to calls to or from a designated phone number.
  * **All calls** — Attaches the debugger to any session matching the specified rule.
* **Run the rule**: Check this box to launch the routing rule immediately when the session starts.
* **Custom data**: Pass test payloads or configuration strings directly into `VoxEngine.customData()`.

### Debugger interface

Click **Start** to begin listening for matching sessions. When a session initiates, the debugger pauses execution at any active breakpoints:

* **Scripts**: View all scenario files bound to the current execution context.
* **Breakpoints**: Add or remove line breakpoints to halt execution at critical points.
* **Call Stack**: Inspect the active execution hierarchy and asynchronous callback stack.
* **Watch Expressions**: Track specific variables and evaluate expressions dynamically during pauses.
* **Controls**: Step over, step into, step out, or resume execution using standard debugger controls.

---

## Testing with the built-in Softphone

The Cloud IDE includes a WebRTC softphone that allows you to place and receive live test calls directly inside your browser:

1. Ensure you have created a test user under the **Users** tab of your application.
2. In the scenario editor, click **Debug** → **Softphone** in the upper-right corner (you can also launch it via **Testing tools** in the top navigation).
3. Allow browser microphone permissions when prompted.
4. Log in using your application user credentials (`username@appname.accountname.voximplant.com`).
5. In the **Debug parameters** dialog, verify your settings and enter any required custom data.
6. Click **Debug** to connect the session. You can now place outbound test calls using the on-screen dial pad or receive inbound calls directed to your user.

---

## Debug keyword and trace function

The VoxEngine runtime recognizes the standard JavaScript [debugger]() statement. Placing a `debugger;` statement in your scenario automatically pauses execution when the Cloud IDE debugger is active.

<Aside>
```javascript title="A trace() call"
// https://git.zingaya.com/voxengine/libs/-/blob/master/scenarios/client-voxengine/voxengine.trace-call.js
```
</Aside>

You can also send real-time output directly to the Cloud IDE debug console using the `trace()` function: