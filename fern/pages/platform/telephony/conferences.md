# Conferences

Voximplant supports audio and video conferences with up to 100 participants.

Include the [Conference module]() in your scenario. Then use the [createConference]() method to create a conference call.

For a **voice conference**, when an incoming call arrives, first, answer it, then add it to the conference via the [sendMediaBetween]() method. See the code example to understand how it works.

```javascript title="Voice conference scenario"
require(Modules.Conference);

let conf = null,
  calls = []; // calls array

VoxEngine.addEventListener(AppEvents.CallAlerting, function (e) {
  // create conference if it has not been created yet
  if (conf === null) {
    conf = VoxEngine.createConference({ hd_audio: true });
  }

  // we can store all calls in array to control them
  calls.push(e.call);
  e.call.answer();
  e.call.addEventListener(CallEvents.Connected, handleCallConnected);
  e.call.addEventListener(CallEvents.Disconnected, handleCallDisconnected);
});

function handleCallConnected(e) {
  // Notify the conference about new participant
  const player = VoxEngine.createTTSPlayer('New participant has joined the conference.');
  player.sendMediaTo(conf);
  player.addEventListener(PlayerEvents.PlaybackFinished, function (ee) {
    // Start sending audio between the call and the conference
    VoxEngine.sendMediaBetween(e.call, conf);
  });
}

function handleCallDisconnected(e) {
  // Let the conference know that one of the participants has left the conference
  const player = VoxEngine.createTTSPlayer('Participant has left the conference.');
  player.sendMediaTo(conf);
}
```

For a **video conference**, answer the incoming call and use the [Conference.add]() method instead. Here is a typical video conference scenario with some extra tools for your convenience. Take a closer look to understand how it works.

```javascript title="Video conference scenario"
require(Modules.Conference);

let conf;
let log;
let partsCounter = 0;

// add a handler for the very first call which creates a conference
VoxEngine.addEventListener(AppEvents.Started, function (event) {
  log = event.logURL;
  conf = VoxEngine.createConference({ hd_audio: true });
  conf.addEventListener(ConferenceEvents.Stopped, function (event2) {
    Logger.write('Conference was stopped!');
    VoxEngine.terminate();
  });
  conf.addEventListener(ConferenceEvents.Started, function (event2) {
    Logger.write(`Conference is started ID: ${event2.conference.id()}`);
  });
});

// create another handler for further incoming calls. The handler answers a call and connects it to the conference
VoxEngine.addEventListener(AppEvents.CallAlerting, function (e) {
  e.call.answer();
  e.call.sendMessage(log);
  partsCounter = partsCounter + 1;
  const endpoint = conf.add({
    call: e.call,
    mode: 'FORWARD',
    direction: 'BOTH',
    scheme: e.scheme,
    displayName: e.displayName,
    maxVideoBitrate: 1200 // example bitrate
  });
  Logger.write(`New endpoint was added ID: ${endpoint.id()}`);
  e.call.addEventListener(CallEvents.Disconnected, function (event2) {
    partsCounter = partsCounter - 1;
    if (partsCounter === 0) {
      setTimeout(checkForTermination, 1000 * 10); // wait for 10 ceconds
    }
  });
});

// create a function which stops a conference if there are no participants:
function checkForTermination() {
  if (partsCounter === 0) {
    conf.stop();
    conf = null;
  }
}
```

This scenario allows Voximplant SDK users to join the conference call. If you want to have incoming SIP/phone calls into your conference, you need to create another **gateway scenario**.

The gateway scenario accepts incoming calls from SIP PBX and phone numbers and uses the [callConference]() method to call the conference scenario.

```javascript title="Gateway scenario"
// Handle incoming call from PSTN/SIP/SDK
VoxEngine.addEventListener(AppEvents.CallAlerting, (e) => {
  // conferenceId is used in the application rule to forward
  // the call to Conference Manager scenario
  let conf_call = VoxEngine.callConference(
    'conferenceId',
    e.callerid,
    e.displayName,
    null,
    e.scheme
  );
  VoxEngine.easyProcess(e.call, conf_call);
});
```

Create [routing rules]() for the conference and gateway scenarios. The rule pattern for the conference scenario should be the same string you pass to the [callConference]() method. In our example, it is the **conferenceId** string.

<Warning title="Video conference">
If you are making a video conference, set the video conference flag to true in the routing rule.
</Warning>

After you create routing rules, you can [call the application]() to join the conference.

## How to join as a viewer

You can join an audio or a video conference only as a viewer. Viewers do not send audio and video to the conference, and can only receive audio and video, depending on the conference.

```javascript title="joinAsViewer() method example"
const viewerCall = client.joinAsViewer('my_conf');
```

To join a conference as a viewer, use the [joinAsViewer]() method. It accepts two parameters:

* **num**: conference number
* **extraHeaders**: optional X-headers to pass into the call's INVITE message

To stop a viewer call, use the [ViewerCall.hangup()]() method.

## How to make a call from a conference

To make a call from a conference, simply call a Voximplant user/a phone number/a sip address as explained in the [voice calls]() article, then handle the [Connected]() event. When the event is triggered, use the [sendMediaBetween]() method for a voice conference and the [Conference.add]() method for a video conference to unite the call with the conference.

```javascript title="Call from a conference"
const call = VoxEngine.callPSTN('first phone number to call', 'rented or verified phone number');

call.addEventListener(CallEvents.Connected, (e) => {
  VoxEngine.sendMediaBetween(conf, e.call);
});
```

## Frequently asked questions

**Q**: **Do I understand correctly that I can reuse the scenario for multiple conferences?**  
**A**: Correct. You can use one scenario for multiple conferences if the conference logic is the same.

**Q**: **How many participants per conference does your platform support?**  
**A**: The web limit is 50 participants per conference. The more participants are, the heavier the load on your hardware because your device needs to render bigger numbers of incoming video streams. On common devices, conferences up to 10-15 participants are working fine.

**Q**: **What platforms do your conferences support?**  
**A**: You can find the information about SDKs and browsers in the [Supported platforms]() article.

**Q**: **Do you have any Voximplant-based conferences in AppStore or PlayMarket?**  
**A**: Unfortunately, we do not have any information about such applications.

**Q**: **How do I terminate a conference?**  
**A**: Use the [VoxEngine.terminate]() to terminate the JS session and the conference. If you need to terminate the session after a certain period, use the SetTimeout function.