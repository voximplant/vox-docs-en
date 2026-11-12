# Features available during a call

Learn about the controls and media capabilities available during an active call in Voximplant.

## Contents

* [How to mute the microphone](#how-to-mute-the-microphone)
* [How to mute the sound](#how-to-mute-the-sound)
* [How to hold a call](#how-to-hold-a-call)
* [How to send a tone signal](#how-to-send-a-tone-signal)
* [How to send data to the call](#how-to-send-data-to-the-call)
* [How to toggle video sending](#how-to-toggle-video-sending)

## How to mute the microphone

During an active call, use the [muteMicrophone]() method on Web or set `sendAudio` on mobile SDKs to mute your local microphone:

<CodeBlocks>
```javascript title="Web SDK"
call.muteMicrophone();
```

```swift title="iOS SDK"
call.sendAudio = false
```

```kotlin title="Android SDK"
call.sendAudio(false)
```
</CodeBlocks>

To unmute the microphone, call [unmuteMicrophone]() on Web or set `sendAudio` to `true` on mobile SDKs.

## How to mute the sound

To mute incoming playback from all call participants, use the [mutePlayback]() method:

```javascript title="Web SDK"
call.mutePlayback();
```

Use the [unmutePlayback]() method to restore audio playback.

## How to hold a call

You can place a call on hold and play waiting music for your interlocutor. To hold a call from a client application, use [setActive]() in the Web SDK, [setHold]() in the iOS SDK, or [hold]() in the Android SDK. Refer to the [API reference]() for other platforms.

<CodeBlocks>
```javascript title="Web SDK"
call
  .setActive(false)
  .then((ev) => {
    // handle completion
  })
  .catch((ev) => {
    // handle error
  });
```

```swift title="iOS (Swift)"
// call is an instance of VICall
call.setHold(true) { error in
    if let error = error {
        // handle error
    } else {
        // handle success
    }
}
```

```objc title="iOS (Objective-C)"
// call is an instance of VICall
[call setHold:YES completion:^(NSError * _Nullable error) {
    if (error) {
        // handle error
    } else {
        // handle success
    }
}];
```

```kotlin title="Android (Kotlin)"
// call is an instance of ICall
call.hold(true, object : ICallCompletionHandler {
    override fun onComplete() { 
        // handle completion
    }

    override fun onFailure(exception: CallException) { 
        // handle error
    }
})
```

```java title="Android (Java)"
// call is an instance of ICall
call.hold(true, new ICallCompletionHandler() {
    @Override
    public void onComplete() {
        // handle completion
    }
    
    @Override
    public void onFailure(CallException exception) {
        // handle error
    }
});
```
</CodeBlocks>

To play music to your interlocutor while they are on hold, handle the hold events in your cloud scenario. Create an audio player using the [createURLPlayer]() method and play the media stream when the [OnHold]() event fires:

```javascript title="Scenario: Hold music"
VoxEngine.addEventListener(AppEvents.CallAlerting, function (e) {
  let URLplayer;
  let inc = e.call;
  let out = VoxEngine.callPSTN(e.destination, e.callerid);
  inc.answer();

  URLplayer = VoxEngine.createURLPlayer(
    { url: 'http://cdn.voximplant.com/yodl.mp3' },
    { loop: true }
  );

  inc.addEventListener(CallEvents.OnHold, () => {
    Logger.write('incoming leg on hold');
    URLplayer.resume();
    URLplayer.sendMediaTo(out);
    URLplayer.sendMediaTo(inc);
  });

  inc.addEventListener(CallEvents.OffHold, () => {
    Logger.write('incoming leg off hold');
    URLplayer.stop();
    VoxEngine.sendMediaBetween(inc, out);
  });

  out.addEventListener(CallEvents.OnHold, () => {
    Logger.write('outgoing leg on hold');
    URLplayer.resume();
    URLplayer.sendMediaTo(inc);
  });

  out.addEventListener(CallEvents.OffHold, () => {
    Logger.write('outgoing leg off hold');
    URLplayer.stop();
    VoxEngine.sendMediaBetween(inc, out);
  });
});
```

## How to send a tone signal

To send DTMF tones to an active call, use the [sendTone]() method on Web or `sendDTMF()` on mobile SDKs. Valid values include digits `0`–`9`, `*`, and `#`:

<CodeBlocks>
```javascript title="Web SDK"
call.sendTone('7');
```

```swift title="iOS SDK"
call.sendDTMF("9")
```

```kotlin title="Android SDK"
call.sendDTMF("9")
```
</CodeBlocks>

To process incoming DTMF tones in your scenario, subscribe to the [ToneReceived]() event on the call object.

## How to send data to the call

### Extra headers

You can send custom SIP X-headers when initiating or answering a call. To send extra headers when calling a user, pass them in the [extraHeaders]() parameter of the [callUser]() method:

```javascript title="Send X-headers while calling"
// https://git.zingaya.com/voxengine/libs/-/blob/master/scenarios/client-voxengine/call.send-x-headers-while-calling.js
```

To send extra headers when answering an incoming call, pass them via the `extraHeaders` parameter of the [Call.answer]() method:

```javascript title="Send X-headers while answering a call"
// https://git.zingaya.com/voxengine/libs/-/blob/master/scenarios/client-voxengine/call.send-x-headers-while-answering.js
```

To retrieve extra headers after a call is disconnected, read them from the `headers` property on the call object:

```javascript title="Get X-headers after the call"
// https://git.zingaya.com/voxengine/libs/-/blob/master/scenarios/client-voxengine/call.get-x-headers-after-call.js
```

### Send a message

You can send data messages during an active call using the [sendMessage]() method on the `Call` class:

```javascript title="Send a message to the call"
// https://git.zingaya.com/voxengine/libs/-/blob/master/scenarios/client-voxengine/call.send-message.js
```

To receive a message sent to the call, subscribe to the [MessageReceived]() event on the call object. This event payload also includes any attached extra headers:

```javascript title="The MessageReceived event"
// https://git.zingaya.com/voxengine/libs/-/blob/master/scenarios/client-voxengine/call.message-received-event.js
```

You can also use the [sendInfo()]() method to pass SIP INFO messages to the call. It accepts three parameters: MIME type, message body, and extra headers:

```javascript title="sendInfo() method usage"
// https://git.zingaya.com/voxengine/libs/-/blob/master/scenarios/client-voxengine/call.send-info.js
```

### Custom data

Custom data allows you to store and access arbitrary string payloads (up to 2,000 characters) across two scopes:

* On the **VoxEngine instance** (`VoxEngine.customData()`)
* On the **Call object** itself (`call.customData()`)

```javascript title="Custom data property usage"
// https://git.zingaya.com/voxengine/libs/-/blob/master/scenarios/client-voxengine/call.custom-data-property.js
```

## How to toggle video sending

You can control video transmission dynamically during a video call using the [sendVideo]() method. Pass `false` to pause video transmission or `true` to resume sending video:

```javascript title="Toggle video sending"
// Stop sending video
call.sendVideo(false);

// Resume sending video
call.sendVideo(true);
```

<Warning title="Initializing video capabilities">
If you initialize your SDK with both `sendVideo` and `receiveVideo` set to `false`, you cannot enable video during the call. To toggle video transmission dynamically, initialize your SDK with at least `receiveVideo` set to `true`.
</Warning>