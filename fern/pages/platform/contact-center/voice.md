# Voice contact center

This article explains how to configure a voice contact center using SmartQueue (ACD v2) technology.

## Create queues

All incoming and outgoing tasks are placed in **a queue** before an agent receives them. You can create one or multiple queues for different departments, tiers, or language requirements.

To create a queue:

1. Log in to the [control panel]().
2. Open an existing [application]() or create a new one.
3. Navigate to **SmartQueue**.
4. On the **Queues** tab, click **Create queue**.
5. Configure the queue settings:
   * **Name**: A descriptive name for the queue.
   * **Priority**: Priority level relative to your other queues.
   * **Agent selection strategy**: How the queue selects which agent receives the next call (e.g., most idle, top skill).
   * **Task selection strategy**: How incoming tasks in the queue are prioritized.
   * **Maximum queue size**: Maximum number of callers allowed to wait concurrently.
   * **Maximum waiting time**: Maximum duration a caller can wait before a timeout action triggers.
6. Optionally bind available agents to the queue, then click **Create**.

You need at least one agent assigned to a queue to process calls.

## Create and bind agents

Agents are application users assigned to process tasks and handle calls from designated queues.

To create an agent:

1. In the [control panel](), open your [application]().
2. Navigate to **SmartQueue** → **Agents**.
3. Click **Add agent**.
4. Enter the agent's **Username**, **Display name**, and **Password**.
5. In the **Bind to a queue** field, select an existing queue. Optionally assign one or more [skills]() to the agent.
6. Click **Create**.

You can edit or delete agents anytime from the **Agents** tab.

<Info title="Agents are application users">
Agents are standard Voximplant application users. You can also create agents in the [Users]() section of your application and assign queues and skills to them in the **SmartQueue** section.
</Info>

## Set up agent skills

Skills allow you to route calls only to agents who meet specific criteria (such as language fluency, technical expertise, or tier level).

For example, you can create an *Italian* skill, assign it to Italian-speaking agents, and define proficiency levels. The queue will then prioritize or restrict Italian-language calls to those agents.

To learn more about skill-based routing, see [Agent skills]().

## Set up an agent workspace

An agent workspace is the client application where agents receive, manage, and place calls. You can build a custom agent desktop using any Voximplant client [SDK](). You can also test your setup using the built-in softphone in the Control Panel.

When initializing the Web SDK, pass `queueType` set to `SmartQueue`:

```javascript title="Initialize Web SDK with SmartQueue"
VoxImplant.getInstance().init({
  queueType: VoxImplant.QueueTypes.SmartQueue
});
```

At a minimum, an agent workspace must provide controls to:
* Accept or decline incoming calls
* Update the agent's operational status

To process incoming calls, handle the `IncomingCall` event and provide UI handlers to [answer]() or [decline]() the call:

```javascript title="Handle incoming calls in the workspace"
// Subscribe to the IncomingCall event
sdk.on(VoxImplant.Events.IncomingCall, (e) => {
  // Answer call handler
  document.getElementById('answer').onclick = () => {
    e.call.answer();
  };

  // Decline call handler
  document.getElementById('decline').onclick = () => {
    e.call.decline();
  };

  // Subscribe to call lifecycle events
  e.call.addEventListener(VoxImplant.CallEvents.Connected, () => {
    console.log('Call connected!');
    document.getElementById('endcall').onclick = () => {
      e.call.hangup();
    };
  });

  e.call.addEventListener(VoxImplant.CallEvents.Disconnected, () => {
    console.log('Call disconnected!');
  });

  e.call.addEventListener(VoxImplant.CallEvents.Failed, (err) => {
    console.log('Call failed:', err);
  });
});
```

### SmartQueue agent statuses

SmartQueue distributes calls based on agent availability. The supported statuses are:

* **Online**: The agent is logged into the client, but cannot receive incoming tasks.
* **Offline**: The agent is logged out of the system.
* **Ready**: The agent is available to receive incoming tasks. *This status must be set explicitly by the agent.*
* **Dialing**: An incoming call has been dispatched to the agent, who has not yet answered or declined.
* **InService**: The agent is actively engaged in a call.
* **AfterService**: The call has ended, and the agent is completing wrap-up work before switching back to **Ready**.
* **Banned**: The agent intentionally declined or ignored an incoming queue call within the timeout. You can implement custom logic to return them to **Online**.
* **DND (Do Not Disturb)**: The agent is paused for breaks or meetings.
* **Custom**: Up to 10 user-defined statuses that operate in DND mode for granular time tracking and reporting.

<Info title="Reporting on agent statuses">
You can track the duration agents spend in each status via [SmartQueue reporting]().
</Info>

Status changes follow a strict lifecycle order. For example, an agent cannot skip **AfterService** after completing a call or skip **Ready** when preparing to accept calls.

### How to set an agent status

To update an agent's status from the client application, call the [setOperatorACDStatus]() method:

<Warning title="Status compatibility">
The Web SDK method [setOperatorACDStatus]() is shared between SmartQueue and legacy ACD v1. Ensure you supply valid [SmartQueue status constants]() when updating agent states.
</Warning>

```javascript title="Set agent status"
function setStatus(newStatus) {
  VoxImplant.getInstance().setOperatorACDStatus(newStatus);
}
```

### Custom statuses

You can configure up to 10 custom statuses with customized display names (`CUSTOM_1` through `CUSTOM_10`). Custom statuses function in DND mode to provide detailed activity tracking (such as Lunch, Training, or Meeting).

To assign a display name to a custom status, call the [SQ_SetAgentCustomStatusMapping]() HTTP API method:

```bash title="Set custom status name"
curl -X POST "https://api.voximplant.com/platform_api/SQ_SetAgentCustomStatusMapping" \
  -H "Authorization: Bearer YOUR_GENERATED_JWT" \
  -d "account_id=1&sq_status_name=CUSTOM_3&custom_status_name=Lunch&application_id=1"
```

```json title="Response"
{
  "result": 1
}
```

To inspect existing custom status mappings, use [SQ_GetAgentCustomStatusMapping]():

```bash title="Get custom status mappings"
curl -X POST "https://api.voximplant.com/platform_api/SQ_GetAgentCustomStatusMapping" \
  -H "Authorization: Bearer YOUR_GENERATED_JWT" \
  -d "account_id=1&application_id=1"
```

```json title="Response"
{
  "result": [
    { "sq_status_name": "READY" },
    { "sq_status_name": "DIALING" },
    { "sq_status_name": "IN_SERVICE" },
    { "sq_status_name": "AFTER_SERVICE" },
    { "sq_status_name": "DND" },
    { "sq_status_name": "CUSTOM_2" },
    { "sq_status_name": "CUSTOM_3" },
    { "sq_status_name": "CUSTOM_4" },
    { "sq_status_name": "CUSTOM_5" },
    { "sq_status_name": "CUSTOM_6" },
    { "sq_status_name": "CUSTOM_7" },
    { "sq_status_name": "CUSTOM_8" },
    { "sq_status_name": "CUSTOM_9" },
    { "sq_status_name": "CUSTOM_10" }
  ]
}
```

To delete a custom status name mapping, use [SQ_DeleteAgentCustomStatusMapping]():

```bash title="Delete custom status mapping"
curl -X POST "https://api.voximplant.com/platform_api/SQ_DeleteAgentCustomStatusMapping" \
  -H "Authorization: Bearer YOUR_GENERATED_JWT" \
  -d "account_id=1&sq_status_name=CUSTOM_3&application_id=1"
```

```json title="Response"
{
  "result": 1
}
```

To assign a custom status to an agent in the client application, pass the status constant (not the display name) to [setOperatorACDStatus]():

```javascript title="Set custom status in client SDK"
function setLunch() {
  VoxImplant.getInstance().setOperatorACDStatus(VoxImplant.OperatorACDStatuses.CustomStatus_3);
}
```

## Set up a VoxEngine scenario

In a contact center, the primary role of the VoxEngine [scenario]() is to receive incoming or outgoing calls and place them into the appropriate SmartQueue.

* For incoming calls, handle the [CallAlerting]() event and enqueue the call.
* For outbound campaigns, initiate the call in the [Started]() event and enqueue it after the customer [answers]().

Use the [enqueueTask]() method to place a call into a queue:

```javascript title="Voice contact center scenario"
require(Modules.SmartQueue);

const MODES = {
  INBOUND: 'INBOUND',
  OUTBOUND: 'OUTBOUND'
};

// Let the script process incoming or outgoing calls depending on this property
const mode = MODES.INBOUND; // INBOUND | OUTBOUND;

if (mode === 'INBOUND') {
  VoxEngine.addEventListener(AppEvents.CallAlerting, (e) => {
    const call = e.call;
    // Optional, terminate the call if it is failed/disconnected
    call.addEventListener(CallEvents.Failed, VoxEngine.terminate);
    call.addEventListener(CallEvents.Disconnected, VoxEngine.terminate);
    // Answer the call
    call.answer();
    // See the body of the addToQueue function below
    addToQueue(call);
  });
}
if (mode === 'OUTBOUND') {
  VoxEngine.addEventListener(AppEvents.Started, () => {
    const call = VoxEngine.callPSTN('Recipient phone number', 'CallerID');
    // Optional, terminate the call if it is failed/disconnected
    call.addEventListener(CallEvents.Failed, VoxEngine.terminate);
    call.addEventListener(CallEvents.Disconnected, VoxEngine.terminate);
    // When the recipient is connected, add the call to the queue
    call.addEventListener(CallEvents.Connected, () => {
      // See the body of the addToQueue function below
      addToQueue(call);
    });
  });
}

function addToQueue(call) {
  const task = VoxEngine.enqueueTask({
    queue: { id: 670 }, // In your case, the queue ID is different
    call: call
  });
  task.addEventListener(SmartQueueEvents.OperatorReached, function OperatorReached(e) {
    Logger.write('The call is connected to an agent!');
    // You can implement additional logic when the agent is connected to the call here
    e.agentCall.addEventListener(CallEvents.Disconnected, VoxEngine.terminate);
  });
  task.addEventListener(SmartQueueEvents.TaskCanceled, () => {
    call.say('Sorry, all the agents are busy.');
    call.addEventListener(CallEvents.PlaybackFinished, function PlaybackFinished() {
      call.removeEventListener(CallEvents.PlaybackFinished, PlaybackFinished);
      VoxEngine.terminate();
    });
  });
}
```

<Info title="Inbound numbers">
To receive incoming phone calls, you must [buy a phone number]() and bind it to your application's routing rule.
</Info>

---

## Frequently asked questions

**Q**: **What is the required channel bandwidth for an audio contact center agent workspace?**  
**A**: For audio calls, the minimum bandwidth is 150 kbps. The latency should be optimal under 100 ms and acceptable under 200 ms. Account for additional non-voice network traffic when planning capacity.

**Q**: **When an agent declines a call, how quickly does it transfer to another agent?**  
**A**: Immediately.

**Q**: **How can I send metadata headers from a scenario to an agent's SDK?**  
**A**: Pass custom headers in the [extraHeaders]() parameter of [SmartQueueTaskParameters]().

**Q**: **When a task arrives for an agent and the timeout parameter expires, why does it transfer to another agent?**  
**A**: If a task is not answered before the [timeout]() expires, it is marked unserved by that agent and reassigned to the next available agent.

**Q**: **What does the "501: Waiting time cannot be estimated" error in the log mean?**  
**A**: This occurs when queue metrics cannot accurately predict wait times (for example, with insufficient recent call volume) and places the call to an agent in advance. The call does not terminate; the caller remains in queue until an agent becomes free.