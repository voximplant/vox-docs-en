# Supervisors

Voximplant allows supervisors to connect to active contact center calls in real time to monitor service quality, coach agents, or intervene directly.

Three supervision modes are available:

* **Supervision (Silent monitoring)**: The supervisor hears both the agent and the client, but neither the agent nor the client can hear the supervisor. Useful for quality assurance, compliance audits, and training evaluation.
* **Whispering (Coaching)**: The supervisor hears both the agent and the client, and the agent hears both the supervisor and the client. The client hears only the agent. Useful for guiding agents during complex calls without the customer hearing.
* **Conference (Barge-in)**: The supervisor, the agent, and the client can all hear and speak to each other in a three-way conversation. Useful for direct supervisor intervention and escalations.

---

## Connecting a supervisor

To enable supervisor audio mixing, require the [conference module]() in your VoxEngine scenario:

```javascript title="Require the conference module"
require(Modules.Conference);

let conf;
```

Next, initiate the supervisor's call and set up disconnect and failure handlers. If the supervisor disconnects or fails to connect, the agent and the client should continue their conversation without interruption:

```javascript title="Create and manage a supervisor call"
// Initiate the supervisor's call leg
const supervisorCall = VoxEngine.callUser("username", "call-center");

// If the supervisor disconnects, restore direct audio between the operator and client
supervisorCall.addEventListener(CallEvents.Disconnected, () => {
  VoxEngine.sendMediaBetween(operatorCall, clientCall);
  VoxEngine.destroyConference(conf);
});

// If the supervisor call fails, restore direct audio between the operator and client
supervisorCall.addEventListener(CallEvents.Failed, () => {
  VoxEngine.sendMediaBetween(operatorCall, clientCall);
  VoxEngine.destroyConference(conf);
});

// Create a conference instance to handle multi-party audio routing
const conf = VoxEngine.createConference();
```

---

## Supervision mode

In silent monitoring mode, the supervisor hears both the agent and the client, but neither party can hear the supervisor:

* Route the operator and client audio into the conference.
* Stream mixed conference audio to the supervisor.
* Maintain direct bidirectional media between the operator and client:

```javascript title="Supervision mode"
operatorCall.sendMediaTo(conf);
clientCall.sendMediaTo(conf);
conf.sendMediaTo(supervisorCall);
VoxEngine.sendMediaBetween(operatorCall, clientCall);
```

---

## Whispering mode

In whispering mode, the supervisor can speak directly to the agent without the client hearing:

* Operator and supervisor exchange audio bidirectionally through the conference.
* Client audio is sent into the conference so both the supervisor and agent hear the client.
* Operator audio is sent directly to the client:

```javascript title="Whispering mode"
VoxEngine.sendMediaBetween(operatorCall, conf);
VoxEngine.sendMediaBetween(supervisorCall, conf);
clientCall.sendMediaTo(conf);
operatorCall.sendMediaTo(clientCall);
```

---

## Conference mode

In conference mode, the supervisor, agent, and client participate in a full three-way conversation where everyone can hear and speak to one another as in a standard [conference]():

```javascript title="Conference mode"
VoxEngine.sendMediaBetween(operatorCall, conf);
VoxEngine.sendMediaBetween(supervisorCall, conf);
VoxEngine.sendMediaBetween(clientCall, conf);
```

---

## Changing modes and disconnecting

To switch between modes dynamically during an active call, reapply the media routing methods for the target mode. VoxEngine updates audio paths immediately without dropping the active call legs.

To disconnect the supervisor, call `supervisorCall.hangup()`. The `CallEvents.Disconnected` listener will automatically restore direct audio between the agent and client and destroy the conference instance.