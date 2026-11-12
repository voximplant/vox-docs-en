# Create a scenario

If an application is your project's container, the **scenario** is its brain.

Scenarios are serverless JavaScript files executed directly inside Voximplant's global media runtime (VoxEngine). This is where you implement all call and messaging logic: answering incoming calls, dialing out to phone numbers or SIP endpoints, synthesizing speech (TTS), transcribing speech (STT), orchestrating Voice AI agents, and bridging media streams.

Every scenario belongs to an [application]() and executes when triggered by a [routing rule]().

---

## How to create a scenario

To create your scenario in the Voximplant Control Panel:

1. Open your application in the [Voximplant Control Panel]().
2. In the application sidebar, navigate to **Scenarios**.
3. Click **Create scenario** (or the **+** icon).
4. Enter a name for your scenario (for example, `main-call-flow.js`).
5. Write or paste your JavaScript code into the built-in Cloud IDE editor.
6. Click **Save** in the upper-right corner.

<Info title="Programmatic deployment">
You can also create, update, and manage scenarios programmatically using the [Management API]() or automate your deployment pipeline directly from your local IDE with [VoxEngine CI]().
</Info>

```javascript title="Example scenario"
VoxEngine.addEventListener(AppEvents.CallAlerting, (e) => {
  const call = e.call;
  call.answer();

  call.addEventListener(CallEvents.Connected, () => {
    call.say("Hello! Your call is being processed by Voximplant.", {
      voice: VoiceList.Amazon.en_US_Joanna,
    });
  });

  call.addEventListener(CallEvents.PlaybackFinished, () => {
    call.hangup();
  });
});
```

---

## How scenarios execute

A saved scenario does not run on its own—it requires a **routing rule** to define when and how it should execute.

You can trigger scenario execution through three primary mechanisms:

* **Incoming calls**: When a caller dials a rented phone number, connects via a mobile/web SDK, or sends a SIP request matching an application's routing rule.
* **Management API requests**: Trigger outbound campaigns or server-side workflows by calling API methods like `StartScenarios` or `StartConference`.
* **Manual launch**: Test and debug scenarios directly from the control panel by executing a rule manually with custom parameters.

---

## Sharing code across multiple scenarios

You can split complex application logic across multiple scenario files. When you attach two or more scenarios to the **same routing rule**, VoxEngine executes them within the **same JavaScript execution context**.

This shared execution context provides distinct advantages:

* **Direct function access**: Functions and variables declared globally in one scenario are immediately accessible in other scenarios bound to the same rule, with no `import` or `export` statements required.
* **Shared module imports**: If you import a module (such as `require(Modules.ASR)`) in your first scenario, that module is automatically available to all subsequent scenarios in the rule.

<Warning title="Avoid global namespace collisions">
Because all scenarios assigned to a single routing rule share the same global scope, ensure you do not declare duplicate global variable or function names across different files.
</Warning>

---

## Scenario development tips

* **Review VoxEngine core concepts**: Before writing complex logic, review [VoxEngine concepts]() to understand event nesting, callback execution timeouts, and the asynchronous lifecycle.
* **Use ready-made templates**: When creating a scenario in the control panel, you can choose from pre-built scenario templates covering common use cases such as call forwarding, IVR menus, and AI assistant integration.
* **Start simple**: Begin with a single scenario handling your primary call flow. As your application grows, split reusable helper functions and configuration into separate scenario files bound to the same routing rule.
* **Inspect real-time logs**: Output diagnostic messages using `Logger.write()` and inspect live debug traces in the [Call history]() section of your control panel.

---

## Frequently asked questions

**Q**: **I have several modules imported in my scenario. Do I need to re-import them in other scenarios?**  
**A**: No. If multiple scenarios are bound to the same routing rule, they share a single JavaScript context. Importing a module once in any scenario makes it available to all others in that rule.

**Q**: **Should I create a separate scenario for each call type, or combine them into one?**  
**A**: For most projects, starting with a single scenario that handles both incoming and outgoing logic is the best practice. You can split logic into multiple scenarios as your requirements expand (for example, separating inbound IVR routing from outbound queue dispatchers).