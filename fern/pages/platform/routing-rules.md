# Create a routing rule

Routing rules act as the switchboard for your Voximplant application. Whenever an incoming phone call, SIP connection, or SDK session reaches the platform, routing rules evaluate the destination and decide which [scenario]() or scenarios to execute.

Without an active routing rule, you cannot make or receive calls, start conferences, or execute any scenario logic.

---

## How to create a routing rule

To create a routing rule in the Voximplant Control Panel:

1. Open your application in the [Voximplant Control Panel]().
2. In the application sidebar, navigate to the **Routing** tab.
3. Click **New rule** (or the **+** icon).
4. Configure the rule settings:
   * **Rule name**: A descriptive identifier for your rule (for example, `inbound-support` or `outbound-dialer`).
   * **Pattern**: A regular expression matched against the destination string (such as the dialed phone number, SIP URI, or SDK user). Use `.*` to match all destinations.
   * **Assigned scenarios**: Drag or select the scenario(s) you want to execute when this rule is triggered.
   * **Assigned phone numbers** (optional): Bind rented phone numbers directly to this rule so calls to those numbers route immediately to your chosen scenarios.
   * **Video conference switch** (optional): Enable this flag if the scenario creates or hosts multi-party video conferences.
5. Click **Save** in the bottom-right corner.

<Warning title="Video conference switch">
If your scenario hosts video conferences, you must enable the **Video conference** flag in the routing rule settings. If this flag is disabled, video conference initialization will fail. Conversely, running pure voice calls under a rule with the video conference flag enabled will work, but sessions will be billed at video conference rates.
</Warning>

---

## How pattern matching works

When traffic reaches your application, Voximplant evaluates your routing rules to find a match:

* **Target destination evaluation**: The regex pattern tests against the **destination** (the dialed number, SIP username, or target SDK user)—not the caller ID.
* **Top-to-bottom evaluation**: Rules are evaluated sequentially from top to bottom. The **first** rule whose pattern matches the destination executes, and evaluation stops immediately.
* **Rule priority**: You can reorder rules in the control panel by dragging them. Rules placed higher in the list hold higher evaluation priority.

---

## Testing your routing rules

You can test and verify your routing configuration directly in the control panel without placing external calls:

* **Rule checker**: Click **Testing tools** in the top navigation bar and select **Rule checker**. Enter a target phone number or username and click **Test** to preview which rule and scenario will trigger.
* **Integrated softphone**: Access the built-in browser softphone under **Testing tools** → **Softphone**. Authenticate with an application [user]() to place live test calls directly into your application scenarios.

---

## Ways to launch a routing rule

A routing rule can be triggered through several channels:

* **Inbound PSTN calls**: An incoming call to a rented number attached to the application matches a rule's pattern and executes its assigned scenarios.
* **Inbound SIP calls**: SIP requests sent to your application domain evaluate the user portion of the SIP URI against rule patterns.
* **SDK client calls**: Initiating a call from a Web, iOS, Android, React Native, or Flutter SDK generates an inbound call leg (`SDK → scenario`) whose destination string matches against your routing rules.
* **Management API**: Launch scenarios programmatically from your backend using the [StartScenarios]() method (for standard voice/video calls) or [StartConference]() (for multi-party video rooms).
* **Manual execution**: Test scenarios on demand from the **Routing** tab in the control panel by selecting your rule and clicking **Run**.

<Info title="Passing custom data">
When launching scenarios via the Management API, use the `script_custom_data` parameter to pass JSON payloads or custom strings directly to `VoxEngine.customData()`. For manual launches in the control panel, enter your payload in the **Custom data** input field.
</Info>

---

## Frequently asked questions

**Q**: **Can I execute a scenario without a routing rule?**  
**A**: No. Every scenario execution—whether inbound, outbound, or API-triggered—requires a routing rule to provide an execution context.

**Q**: **Can I attach more than one scenario to a routing rule?**  
**A**: Yes. If you attach multiple scenarios to a single rule, they execute in the same global JavaScript context. This allows you to split logic across modular files while sharing variables and functions.

**Q**: **Do pattern filters apply to outgoing calls?**  
**A**: No. The regex pattern filters incoming call destinations. For programmatic outbound calls triggered via the Management API, you specify the routing rule or scenario directly.

**Q**: **Do patterns work with SIP addresses?**  
**A**: Yes. Patterns evaluate the username portion of the incoming SIP URI. You can define specific prefixes (such as `^sip_.*`) to route SIP calls to dedicated scenarios.

**Q**: **What happens if a destination matches multiple rules?**  
**A**: Only the first matching rule executes. Rules are evaluated from top to bottom; once a match is found, evaluation stops.

**Q**: **How can I separate rules for incoming and outgoing calls?**  
**A**: Create a rule for incoming calls with your phone numbers or a matching pattern (e.g., `.*`) at the top of your list. Place your outbound or API-triggered rules below it, and invoke those rules directly by name or ID using the Management API.