# Calls

This article will guide you through making and receiving calls to/from different destinations.

## How to call a Voximplant user

<Info title="How to create a user">
Follow [this guide]() to learn how to create a Voximplant user.
</Info>

To call another Voximplant user, use the [callUser]() method in your scenario. Specify the user you want to call in the **username** parameter and the callerID you want to show to the **callerid** parameter. See the example scenario to understand how it works.

```javascript title="Call a Voximplant user"
// Initiate an outgoing call based on the dialed number
VoxEngine.addEventListener(AppEvents.CallAlerting, (e) => {
  const newCall = VoxEngine.callUser({
    username: e.destination,
    callerid: e.callerid,
    displayName: e.displayName,
    video: true,
    scheme: e.scheme,
  });
  VoxEngine.easyProcess(e.call, newCall, () => {});
});
```

<Info title="Call legs">
Please note that if you are making a call via web or mobile SDK, it consists of two call legs: SDK → scenario and scenario → destination. In this case, the SDK → scenario call leg is considered an incoming call in the scenario, so you need to process it via the [CallAlerting]() event as well.
</Info>

You can make a **peer-to-peer call**, which connects two devices directly instead of routing through Voximplant servers. It provides better connection security and audio/video quality. To make a peer-to-peer call, use the [callUserDirect]() method.

```javascript title="Peer-to-peer call"
VoxEngine.addEventListener(AppEvents.CallAlerting, (e) => {
  const newCall = VoxEngine.callUserDirect(e.call, e.destination, {
    displayName: e.displayName,
    callerid: e.callerid,
    extraHeaders: e.headers,
  });
  VoxEngine.easyProcess(e.call, newCall, () => {}, true);
});
```

## How to call a phone number

<Warning title="Destination restrictions">
Calls that cost more than 20 cents per minute and calls to Africa are restricted for security reasons. To enable them, contact us: [support@voximplant.com](mailto:support@voximplant.com)
</Warning>

To call a phone number, use the [callPSTN]() method in your scenario. Specify the phone number you want to call to the **number** parameter, and the caller ID to show to the **callerid** parameter.

You can use the following numbers as your caller ID:

1. A **real** phone number that is rented from Voximplant (you cannot use test numbers).
2. Any phone number that is verified via an automated call from Voximplant and a confirmation code.
3. A phone number from an incoming call to the rented number. You can retrieve it as Caller ID.

Understand how it works by looking at the example scenario.

```javascript title="Call a phone number"
VoxEngine.addEventListener(AppEvents.CallAlerting, (e) => {
  e.call.ring();
  const call = VoxEngine.callPSTN('numberToCall', 'confirmedCallerId');
  VoxEngine.easyProcess(e.call, call, () => {});
});
```

If you want to use the incoming caller ID for the outgoing call from the scenario, set the [followDiversion]() parameter to **true**.

Please note that if you are making a call **from a US phone number to a US destination**, you additionally need to add the [Call.ring()]() method to the incoming call leg in the scenario.

In this case, the scenario for US to US phone calls looks like this.

```javascript title="US to US phone call"
VoxEngine.addEventListener(AppEvents.CallAlerting, (e) => {
  e.call.ring();
  const call = VoxEngine.callPSTN('numberToCall', 'confirmedCallerId');
  VoxEngine.easyProcess(e.call, call, () => {});
});
```

## How to call a SIP address

To call a SIP address, use the [callSIP]() method in your scenario.

```javascript title="Call SIP"
// Use the default (UDP) transport
let callWithUDP = VoxEngine.callSIP('sip:alice@example.com');

// Use the TCP transport
let callWithTCP = VoxEngine.callSIP('sip:alice@example.com;transport=tcp');
```

<Info title="UDP/TCP transport">
Voximplant uses UDP as the default protocol for SIP calls. If you want to use the TCP protocol, specify it in the [callSIP]() method as shown below in the code example.
</Info>

To **enable TLS support** for your SIP calls, change the `sip:` prefix of your address to the `sips:` prefix or simply specify the TLS transport type. See the code example.

```javascript title="Enable TLS for SIP calls"
// add sips at the beginning of the URI
const call = VoxEngine.callSIP('sips:alice@example.org:5061', {
  callerid: '5510',
  displayName: 'Steve Rogers',
  password: 'shield',
  authUser: 'captain'
});

// or specify TLS at the end of the URI
const call2 = VoxEngine.callSIP('alice@example.org:5061;transport=tls', {
  callerid: '8014',
  displayName: 'Hedy Lamarr',
  password: 'wifi',
  authUser: 'inventor'
});
```

Refer to the [SIP calls]() article to learn more about SIP calls in Voximplant.

## How to process incoming calls

To process incoming calls, subscribe to the [CallAlerting]() event in the scenario. Use the [call.answer]() method to answer the call, or the [call.reject]() method to decline the call.

You can use the [call.startEarlyMedia]() method to cast early media to the call before it is answered. It allows you to play music or synthesize speech such as a voicemail prompt.

```javascript title="Answer a call in a scenario"
VoxEngine.addEventListener(AppEvents.CallAlerting, (e) => {
  // this code is executed in the cloud on every incoming call
  e.call.startEarlyMedia(null, e.scheme);
  e.call.say('Hello from the cloud', { voice: VoiceList.Amazon.en_US_Joanna });
  // e.call.answer(); to answer a call
  // e.call.reject(); to decline a call
});
```

<Info title="Early media limit">
A call can be in the early media state for up to 60 seconds.
</Info>

## Frequently asked questions

**Q**: **How to redirect a call from a rented number to my mobile phone?**  
**A**: You can manage all the calls in the scenario. Receive the call into the platform by subscribing to the [CallAlerting]() event, then use the [callPSTN]() method to call your mobile phone, and unite two calls via the [easyProcess]() method. You can see the scenario example in the [How to call a phone number](#how-to-call-a-phone-number) section of this article. Do not forget to create a [routing rule]() for your scenario.

**Q**: **How can I limit the dialing time? For example, if a user does not respond in 20 seconds, call the mobile number instead?**  
**A**: You can use the [setTimeout]() method to set the timeout for the dialing time, and then call the phone number using the [callPSTN]() method.

**Q**: **How do I find the reason why a call fails?**  
**A**: To find the reason, subscribe to the [CallEvents.Failed]() event and read the **e.code** property. It contains the error code. You can find the list of error codes in the event description.

**Q**: **Can I share the same variable across different scenarios?**  
**A**: If both your scenarios are attached to the same routing rule, they execute in one context and share all the variables between them. If you want to share a variable between two different JS sessions, you can use [Key-value storage]() to save the variable.
