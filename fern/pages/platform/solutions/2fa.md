# Two-factor authentication (2FA)

Two-factor authentication (2FA) strengthens account security by requiring users to verify their identity with a one-time passcode (OTP) delivered to their mobile device.

With Voximplant, you can deliver 2FA security codes across two channels:
* **Voice OTP calls**: Places an automated outbound call that speaks the verification code using neural text-to-speech.
* **SMS messages**: Delivers passcodes via global high-priority A2P SMS.

---

## Delivering passcodes via voice calls

To place an automated call that dictates an OTP code to your user:

1. Create an [application]().
2. Rent a [phone number]() to serve as your verified outbound caller ID.
3. Create a [scenario]() that:
   * Extracts the destination number and security code from session [custom data]().
   * Places an outbound call using [callPSTN()]().
   * Synthesizes and dictates the passcode to the user using [createTTSPlayer()]() or `call.say()`.

Your backend initiates the call remotely via the Management API [StartScenarios]() method, passing the destination phone number and OTP code in the `script_custom_data` parameter:

```json title="OTP payload structure"
{
  "phone": "16501234567",
  "code": "1234"
}
```

Here is the complete scenario for placing the call and dictating the code:

```javascript title="2FA voice call scenario"
VoxEngine.addEventListener(AppEvents.Started, () => {
  const callerID = '79876543210';
  let customData;

  try {
    customData = JSON.parse(VoxEngine.customData());
  } catch (err) {
    Logger.write(JSON.stringify(err));
    VoxEngine.terminate();
  }

  const numbers = String(customData.code).replace(/(\d)/g, '$1' + ' ');
  const player = VoxEngine.createTTSPlayer(
    `The security code is ${numbers}. Repeating, the security code is ${numbers}.`,
    {
      voice: VoiceList.Amazon.en_US_Joanna,
      onPause: true
    }
  );

  const call = VoxEngine.callPSTN(customData.phone, callerID);
  call.addEventListener(CallEvents.Failed, VoxEngine.terminate);
  call.addEventListener(CallEvents.Disconnected, VoxEngine.terminate);
  call.addEventListener(CallEvents.Connected, () => {
    setTimeout(() => {
      player.sendMediaTo(call);
      player.resume();
      player.addEventListener(PlayerEvents.PlaybackFinished, () => {
        call.hangup();
      });
    }, 2000);
  });
});
```

4. Create a [routing rule]() bound to your scenario.

### Trigger the call from your backend

Launch the verification call by invoking the [StartScenarios]() method:

```bash title="Trigger 2FA voice call"
curl -X POST "https://api.voximplant.com/platform_api/StartScenarios" \
  -H "Authorization: Bearer YOUR_GENERATED_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "account_id": 1,
    "rule_id": 1,
    "script_custom_data": "{\"phone\":\"16501234567\",\"code\":\"1234\"}"
  }'
```

```json title="Response"
{
  "result": 1
}
```

---

## Delivering passcodes via SMS

Alternatively, you can deliver passcodes via SMS:

1. Rent an SMS-enabled [phone number]().
2. [Enable SMS functionality]() on the number in the Control Panel.

### Send one-way A2P verification SMS

Use the [A2PSendSms]() Management API method to dispatch the one-way OTP message from your backend:

* Specify your SMS-enabled number or an approved alphanumeric Sender ID in `src_number` (contact support to register custom Sender IDs).
* Pass the destination phone number in `dst_numbers`.
* Pass the verification message in `text`.

```bash title="Send 2FA passcode via SMS"
curl -X POST "https://api.voximplant.com/platform_api/A2PSendSms" \
  -H "Authorization: Bearer YOUR_GENERATED_JWT" \
  -d "account_id=1&src_number=16501234567&dst_numbers=16509876543&text=Your verification code is 1234"
```

```json title="Response"
{
  "result": [
    {
      "message_id": 1,
      "destination_number": "16509876543"
    }
  ],
  "fragments_count": 1
}
```

For two-way interactive messaging where users can reply, refer to the [SMS messaging]() guide.