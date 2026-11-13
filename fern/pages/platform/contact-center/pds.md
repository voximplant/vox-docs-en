# Predictive dialing system (PDS)

The Predictive Dialing System (PDS) is an outbound contact center engine designed to optimize agent occupancy and minimize idle time. By analyzing real-time agent availability, historical connect rates, and average call duration, PDS initiates outbound calls proactively and connects answered calls to agents just as they become available.

When combined with [AI voicemail detection](), PDS filters out answering machines, busy signals, and disconnected numbers so agents only handle live human conversations.

## Contents

- [What is a PDS](#what-is-a-pds)
- [Predictive mode](#predictive-mode)
- [Progressive mode](#progressive-mode)
- [How to set up a PDS](#how-to-set-up-a-pds)
- [Buffer management](#buffer-management)
- [Frequently asked questions](#frequently-asked-questions)

---

## What is a PDS

PDS eliminates manual dialing and waiting for ringtones by automating outbound call pacing:

* **Filters non-human and failed calls**: Bridges only answered calls to agents, discarding voicemails, busy tones, and invalid numbers when paired with [AI voicemail detection]().
* **Predictive pacing**: Forecasts agent availability and initiates calls in advance, keeping agent utilization high while minimizing customer hold time.
* **SmartQueue integration**: Leverages real-time queue states to dynamically adjust dialing frequency.
* **Self-tuning algorithms**: Adapts statistical baselines (such as average handle time and answer rates) as the campaign progresses.
* **Dual operating modes**: Supports both statistical **predictive** pacing for large teams and fixed multiplier **progressive** dialing for smaller teams.

---

## Predictive mode

Predictive mode continuously calculates the optimal moment to dial new contacts based on real-time campaign statistics.

You provide initial baseline estimates for **average talk time** and **connect rate (successful call percentage)**. As calls proceed, the dialing engine automatically adjusts these values based on actual performance.

You can also configure the **maximum target drop rate (abandonment rate)**. A lower drop rate ensures customers rarely experience dead air or wait for an agent, but agents may wait slightly longer between calls:

* **Fewer than 30 agents**: We recommend a target drop rate of **10%–15%**.
* **100–200 agents**: We recommend a target drop rate of **5%**.

Predictive mode is most effective for large contact centers (30+ agents) dialing high-volume lists with variable answer rates.

---

## Progressive mode

Progressive mode dials a fixed ratio of calls per available agent rather than using predictive statistical forecasting.

Before launching the campaign, configure a **multiplier** that defines how many calls to place per idle agent (for example, a multiplier of `1` places one call per free agent; `1.5` places three calls for every two free agents). You can adjust this multiplier dynamically to tune pacing.

Progressive mode is ideal for smaller teams (fewer than 30 agents) or campaigns with high, predictable connect rates.

---

## How to set up a PDS

### 1. Set up agents and queues

Configure your agents and queues as described in the [voice contact center]() guide.

### 2. Deploy the PDS VoxEngine scenario

Unlike inbound queue scenarios, PDS scenarios handle outbound dialing and bridge answered calls into SmartQueue:

```javascript title="PDS VoxEngine scenario"
require(Modules.SmartQueue);

let pdsData;
let resultSent = false;

async function sendResult(status) {
  if (resultSent) return false;

  Logger.write('SEND RESULT ' + status);

  let pd = {
    agent: pdsData.agent_uuid,
    task_uuid: pdsData.task_uuid,
    type: status
  };

  await Net.httpRequestAsync(pdsData.callback_url, {
    rawOutput: true,
    method: 'POST',
    postData: JSON.stringify(pd)
  }).then((result) => {
    if (result.code === 200) {
      Logger.write('PDS result sent');
      resultSent = true;
    } else {
      Logger.write('Unable to send PDS result ' + result.code);
    }
  });
}

VoxEngine.addEventListener(AppEvents.Started, (e) => {
  pdsData = JSON.parse(VoxEngine.customData());
  Logger.write(JSON.stringify(pdsData.users_data)); // custom data with customers information

  let call = VoxEngine.callPSTN('', "'"); // call the number received from the PDS module
  call.addEventListener(CallEvents.Failed, async () => {
    await sendResult('FAIL');
    VoxEngine.terminate();
  });
  call.addEventListener(CallEvents.Connected, () => {
    sendResult('DIAL_COMPLETE');
    const task = VoxEngine.enqueueTask({
      call: call,
      queue: {
        id: 1 // specify the queue ID here
      }
    });

    task.addEventListener(SmartQueueEvents.OperatorReached, function (e) {
      Logger.write('The call is connected to an agent!');
      // You can implement additional logic when the agent is connected to the call here
    });

    task.addEventListener(SmartQueueEvents.TaskCanceled, () => {
      call.say('Sorry, all the agents are busy.');
      call.addEventListener(CallEvents.PlaybackFinished, function PlaybackFinished() {
        call.removeEventListener(CallEvents.PlaybackFinished, PlaybackFinished);
        VoxEngine.terminate();
      });
    });
  });
});
```

### 3. Set up the agent workspace

Build your agent workspace using any Voximplant client SDK, or deploy our open-source [Vue.js UI Kit]() as an out-of-the-box agent desktop.

### 4. Deploy the PDS client

Deploy and run the PDS client application. You can reference our open-source Go implementation in the [PDS sample client repository]().

### Feeding contact records to the PDS client

The PDS client can ingest contact records from any source (such as a database, CRM, or CSV stream). Stream your records into the client task channel:

```go title="Feed tasks to PDS client"
taskChan := agent.GetTaskChannel()
go func() {
    defer close(taskChan)
    for {
        // Parse your data source and push tasks to the channel
        tmpTask := map[string]interface{}{
            "phone_number": "1234567",
        }
        taskChan <- tmpTask
    }
}()
```

### Configuring predictive vs. progressive mode

By default, PDS operates in **predictive mode**. Define baseline operational statistics in your `PDSConf` configuration:

```go title="Predictive mode configuration"
pdsConfig := client.PDSConf{
    RuleID:            1, // Your Voximplant routing rule ID
    QueueID:           1, // Your target SmartQueue ID
    ReferenceIP:       "69.167.178.4",
    AvgTimeTalkSec:    80.0,
    PercentSuccessful: 0.4,
    MaximumErrorRate:  0.05,
    SessionID:         uuid.NewV4().String(),
    ApplicationID:     1, // Your Voximplant application ID
}
```

To enable **progressive mode**, set the `TaskMultiplier` parameter:

```go title="Progressive mode configuration"
pdsConfig.TaskMultiplier = 1
```

Then start the dialing session using `PDS.StartProgressive()` instead of `PDS.Start()`.

<Warning title="Mode selection priority">
The dialing mode is determined by the presence of `TaskMultiplier`. If both `TaskMultiplier` and predictive statistical baselines (`AvgTimeTalkSec` / `PercentSuccessful`) are defined, the system defaults to **progressive mode** and ignores the statistical parameters.
</Warning>

For technical setup assistance, refer to the [PDS client repository]() or contact [support]().

---

## Buffer management

The PDS client maintains an internal task buffer to ensure dialing continues without interruption. By default, the buffer holds up to **500 records** with a refill threshold of **250 records**. When the buffer drops below the threshold, PDS requests new tasks.

You can configure buffer thresholds in your initialization payload:

```json title="Static buffer configuration"
"buffer": {
    "size_target": "VALUE",
    "size_value": 300,
    "threshold_factor": 2
}
```

Alternatively, you can configure a **dynamic buffer** that scales automatically based on the number of active agents—ideal for smaller teams with fluctuating agent counts:

```json title="Dynamic buffer configuration"
"buffer": {
    "size_target": "AGENT",
    "threshold_factor": 2
}
```

---

## Frequently asked questions

**Q**: **In predictive mode, can I query in-flight parameters such as dynamic average call duration?**  
**A**: No. These parameters are recalculated continuously on a per-second basis and are not exposed via real-time endpoints.

**Q**: **How does PDS select which agent to dial?**  
**A**: PDS does not target specific agents directly. Its objective is to connect answered customer calls to the queue at the exact moment any agent becomes free, minimizing customer wait times and agent idle time.

**Q**: **Can I prevent specific agents from receiving PDS calls?**  
**A**: PDS delivers calls to any agent in the `Ready` status. To prevent an agent from receiving calls, switch their status to `DND`, `AfterService`, or a custom non-ready status.

**Q**: **Can I set a dialing timeout for outbound attempts?**  
**A**: Yes. Use the [timeout]() parameter in `SmartQueueTaskParameters` to specify the maximum ringing duration before an unanswered call is abandoned.