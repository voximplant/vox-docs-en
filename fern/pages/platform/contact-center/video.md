# Video contact center

In addition to a traditional [voice contact center](), you can use SmartQueue to build a full-featured video contact center for your customers.

## Set up agents and queues

Agents and queues for a video contact center are configured in the same way as for a [voice contact center]().

Create one or more [agents]() and configure [agent skills]() as needed. Then, create at least one [queue]() and bind your agents to the queue, as described in the [voice contact center]() guide.

## Set up an agent workspace

An agent workspace is the client application where agents manage and participate in video calls. You can build an agent workspace using any Voximplant client [SDK]().

When initializing the Web SDK, pass `queueType` set to `SmartQueue`:

```javascript title="Initialize Web SDK with SmartQueue"
VoxImplant.getInstance().init({
  queueType: VoxImplant.QueueTypes.SmartQueue
});
```

At a minimum, an agent workspace for video calls requires:

* Video rendering elements and controls to send and receive video streams
* Controls to manage the agent's operational status

Refer to [Processing video calls in SDKs]() to learn how to render and manage video streams in client applications.

Review [SmartQueue agent statuses]() to understand how agent availability and call dispatching work.

## Set up a VoxEngine scenario

To learn how to create and manage cloud scenarios, see [Create a scenario]().

Similar to voice workflows, the primary goal of the scenario is to handle incoming calls and place them into the appropriate SmartQueue. You can use different [routing rules]() or custom logic to distribute calls across queues.

To process incoming video calls, handle the [CallAlerting]() event and enqueue the call using the [enqueueTask]() method.

<Warning title="Call scheme parameter">
For video contact centers, you must specify the call scheme (`CallScheme.Video`) when invoking the [enqueueTask]() method.
</Warning>

```javascript title="Video contact center scenario"
require(Modules.SmartQueue);

VoxEngine.addEventListener(AppEvents.CallAlerting, ({ call, scheme }) => {
  // Optional, terminate the call if it is failed/disconnected
  call.addEventListener(CallEvents.Failed, VoxEngine.terminate);
  call.addEventListener(CallEvents.Disconnected, VoxEngine.terminate);
  // Answer the call
  call.answer();
  // See the body of the addToQueue function below
  addToQueue(call, scheme);
});

function addToQueue(call, scheme) {
  const task = VoxEngine.enqueueTask({
    queue: { id: 108 },
    call,
    scheme,
    video: true
  });
  task.addEventListener(SmartQueueEvents.OperatorReached, function OperatorReached(e) {
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
}
```