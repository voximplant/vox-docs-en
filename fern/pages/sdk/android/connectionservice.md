# ConnectionService

A self-managed **ConnectionService** integrates your VoIP application with Android's telecom subsystem. This integration coordinates calling across multiple cellular and VoIP apps (such as placing a VoIP call on hold when a cellular call arrives) and enables answering or declining calls directly from connected wearable devices (such as smartwatches).

---

## Manifest declarations and permissions

To implement a self-managed `ConnectionService`, declare the `MANAGE_OWN_CALLS` permission in your `AndroidManifest.xml` file:

```xml title="AndroidManifest.xml permission"
<uses-permission android:name="android.permission.MANAGE_OWN_CALLS" />
```

To bind the Android Telecom framework to your service, declare the service component with the `BIND_TELECOM_CONNECTION_SERVICE` permission:

```xml title="AndroidManifest.xml service declaration"
<service
    android:name=".services.CallConnectionService"
    android:permission="android.permission.BIND_TELECOM_CONNECTION_SERVICE">
    <intent-filter>
        <action android:name="android.telecom.ConnectionService" />
    </intent-filter>
</service>
```

---

## TelecomManager and PhoneAccount

The `TelecomManager` uses a registered `PhoneAccount` to place and manage calls. To construct a `PhoneAccount`, the application provides a `PhoneAccountHandle` that identifies your `ConnectionService` implementation to the Android Telecom framework.

A `PhoneAccountHandle` consists of the `ComponentName` of your connection service and a unique string identifier. For more details, see `PhoneAccountHandle` in the [Android Developers]() documentation:

```kotlin title="Register PhoneAccount"
val componentName = ComponentName(context, CallConnectionService::class.java)
val phoneAccountHandle = PhoneAccountHandle(componentName, APP_TAG)
val phoneAccount = telecomManager.getPhoneAccount(phoneAccountHandle)
telecomManager.registerPhoneAccount(phoneAccount)
```

For a self-managed service, configure `PhoneAccount.CAPABILITY_SELF_MANAGED` on the `PhoneAccount` builder to indicate that your application manages its own connection UI and lifecycle.

---

## Create and manage a call connection

### Android Telecom Connection

An Android `Connection` represents an active phone call or remote endpoint carrying voice or video traffic.

Every Voximplant call requires a corresponding Android Telecom `Connection`:
* **Outgoing calls**: created before calling `ICall.start()`
* **Incoming calls**: created before calling `ICall.answer()`

This ensures the Voximplant `ICall` interface manages the underlying WebRTC media pipeline while the Android Telecom `Connection` coordinates state with the operating system.

Configure every self-managed `Connection` with the following parameters:

```kotlin title="Self-managed Connection parameters"
connectionProperties = PROPERTY_SELF_MANAGED
audioModeIsVoip = true
```

You can expose additional capabilities (such as hold or mute support) by configuring `connectionCapabilities`. For available capability flags, refer to the [Android Developers]() documentation.

Pass each new `Connection` instance to the Voximplant SDK via `IAudioDeviceManager.setTelecomConnection()` so the SDK coordinates audio hardware with the Telecom framework.

<Warning title="Audio focus with Telecom Connection">
When a non-null Telecom `Connection` is passed to `IAudioDeviceManager.setTelecomConnection()`, the Android Telecom framework takes over audio focus management. In this mode, the Voximplant SDK does not request audio focus independently, and `IAudioFocusChangeListener.onAudioFocusChange(int)` is not invoked. Audio focus listeners are called only when the SDK manages audio focus directly.
</Warning>

### Make an outgoing call

To initiate an outgoing call:

1. Verify that your `PhoneAccount` is registered with the system.
2. Call `TelecomManager.placeCall()`, passing a `Bundle` containing `EXTRA_PHONE_ACCOUNT_HANDLE`.
3. The Android Telecom subsystem calls your service's `onCreateOutgoingConnection()` method. Return a new `Connection` instance representing the outgoing call.
4. Once the call connects (`ICallListener.onCallConnected()`), call `Connection.setActive()` to inform the Telecom framework that the call is in progress.

### Receive an incoming call

When an incoming call arrives via the Voximplant SDK (`IClientIncomingCallListener.onIncomingCall()`):

1. Verify that your `PhoneAccount` is registered.
2. Register the incoming call with the system by calling `TelecomManager.addNewIncomingCall()`.
3. The Telecom subsystem binds to your `ConnectionService` and requests a new `Connection` via `onCreateIncomingConnection()`. Return your new `Connection` instance.
4. For self-managed connections, the `Connection` triggers `Connection.onShowIncomingCallUi()`, notifying the application to display the incoming call screen (a notification with a full-screen intent is recommended).

Handling user interaction:
* **From notifications**: Handle user answer or decline actions via `PendingIntent`.
* **From wearable devices**: Android Telecom notifies your `Connection` by invoking `Connection.onAnswer()` or `Connection.onReject()`.

To answer the call:
Call `ICall.answer()`. Once the call connects (`ICallListener.onCallConnected()`), update the `Connection` state by calling `Connection.setActive()`.

To reject the call:
Call `ICall.reject()`. When the call ends (`ICallListener.onCallDisconnected()`), set the `Connection` status to disconnected using `setDisconnected()` and call `Connection.destroy()`.

### Manage an ongoing call

During an active call, you can:
* Place the call on hold
* Mute the microphone
* Switch audio devices

The Voximplant Android SDK handles microphone mute and audio device switching directly without requiring manual Telecom `Connection` updates.

To place a call on hold, update the `Connection` state using `Connection.setOnHold()`. Ensure that `ICall.hold()` completes successfully before updating the `Connection` state:

```kotlin title="Update hold state"
call?.hold(hold, object : ICallCompletionHandler {
    override fun onComplete() {
        if (hold) {
            callConnection?.setOnHold()
        } else {
            callConnection?.setActive()
        }
    }

    override fun onFailure(e: CallException) {
        // Handle hold error
    }
})
```

<Warning title="Concurrent call behavior across Android versions">
On Android API level 28 (Android 9) and higher, when a user answers an incoming cellular (PSTN) call, `TelecomManager` automatically places the active VoIP call on hold, allowing it to be resumed after the cellular call ends. On API level 27 and lower, only one application can maintain an ongoing call at a time; answering an incoming cellular call terminates the active VoIP call.
</Warning>

### End an ongoing call

Either the local user or the remote endpoint can terminate an active call:

* **Local termination**: Call `ICall.hangup()`. The SDK triggers `ICallListener.onCallDisconnected()`.
* **Remote termination**: The SDK triggers `ICallListener.onCallDisconnected()`.

When `ICallListener.onCallDisconnected()` fires:

1. Set the disconnected status on your `Connection` using `Connection.setDisconnected(DisconnectCause)`.
2. Destroy the `Connection` instance using `Connection.destroy()`.

The `DisconnectCause` object communicates why the call ended to the operating system and call history logs. For details on constructing disconnect reasons, see `DisconnectCause` in the [Android Developers]() documentation.