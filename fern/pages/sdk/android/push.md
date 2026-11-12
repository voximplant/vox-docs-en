# Push notifications

Configure push notifications for Android applications using Firebase Cloud Messaging (FCM).

Voximplant push notifications for Android rely on the [Firebase Cloud Messaging (FCM) platform]() and are dispatched as high-priority data messages. These notifications wake the application in the background and establish connectivity before an incoming call arrives.

---

## Add Firebase to the Android project

To enable push notifications, add Firebase to your Android project following the official FCM setup guidelines:

* [Create a Firebase project]()
* [Register your app with Firebase]()
* [Add a Firebase configuration file]() (`google-services.json`)
* [Add the Firebase SDK to your app]()
* [Edit your app manifest]()

<Info title="Testing Debug and Release builds">
The Voximplant Control Panel allows one certificate per package name. To test push notifications in both Debug and Release environments under the same Voximplant application, upload the Google certificate with custom package name suffixes (e.g., `.dev` and `.prod`). Configure the matching suffix when initializing the SDK in your respective build variants.
</Info>

---

## Modify your VoxEngine scenario

To allow the Voximplant cloud to dispatch push notifications for incoming calls, include the `PushService` helper module in your scenario:

```javascript title="Add a push notification helper"
require(Modules.PushService);
```

---

## Add credentials to the Voximplant Cloud

To connect Voximplant to Firebase:

1. Open the [Firebase console]() using your project's Google account.
2. Navigate to **Project Settings** → **Service Accounts**.
3. Click **Generate new private key** for the `firebase-adminsdk` account and download the service account JSON key.
4. Log in to the [Voximplant Control Panel]().
5. Open your [application]() and navigate to the **Push certificates** tab.
6. Click **Add certificate** in the upper-right corner.
7. In the **Platform** dropdown, select `GOOGLE`.
8. Upload the service account JSON file.
9. Click **Add**.

Voximplant supports sending push notifications to multiple Android applications with different package names within the same Voximplant application. If you configure multiple FCM certificates, specify the application package name when adding each certificate.

<Warning title="Package name matching">
If you specify a package name with a certificate in the control panel, you must configure the exact same package name when initializing the SDK in your application.
</Warning>

<CodeBlocks>
```kotlin title="Kotlin"
val client = Voximplant.getClientInstance(
    Executors.newSingleThreadExecutor(),
    applicationContext,
    ClientConfig().also {
        it.packageName = packageName
    }
)
```

```java title="Java"
ClientConfig config = new ClientConfig();
config.packageName = getPackageName();
IClient client = Voximplant.getClientInstance(
    Executors.newSingleThreadExecutor(),
    getApplicationContext(),
    config
);
```
</CodeBlocks>

---

## Register the push token with Voximplant

The Voximplant Cloud requires a device token to dispatch push notifications. Retrieve the token from the Firebase API and register it using [IClient.registerForPushNotifications]():

<CodeBlocks>
```kotlin title="Kotlin"
FirebaseMessaging.getInstance().token.addOnCompleteListener { task ->
    if (!task.isSuccessful || task.result == null) {
        return@addOnCompleteListener
    }
    val token = task.result
    client.registerForPushNotifications(token, object : IPushTokenCompletionHandler {
        override fun onSuccess() {
            // Push token registered successfully
        }

        override fun onFailure(error: PushTokenError?) {
            // Handle registration error
        }
    })
}
```

```java title="Java"
FirebaseMessaging.getInstance().getToken().addOnCompleteListener(task -> {
    if (!task.isSuccessful() || task.getResult() == null) {
        return;
    }
    String token = task.getResult();
    client.registerForPushNotifications(token, new IPushTokenCompletionHandler() {
        @Override
        public void onSuccess() {
            // Push token registered successfully
        }

        @Override
        public void onFailure(PushTokenError error) {
            // Handle registration error
        }
    });
});
```
</CodeBlocks>

You can call [IClient.registerForPushNotifications]() in any [ClientState](). If the client is not yet logged in, the token will be registered automatically once the user authenticates.

Re-register the token whenever:
* Firebase refreshes the registration token.
* A different Voximplant user logs in on the device.

---

## Monitor token refresh

When Firebase refreshes the registration token, update Voximplant by overriding `onNewToken` in your `FirebaseMessagingService` implementation:

<CodeBlocks>
```kotlin title="Kotlin"
override fun onNewToken(token: String) {
    client.registerForPushNotifications(token, object : IPushTokenCompletionHandler {
        override fun onSuccess() {
            // Push token registered successfully
        }

        override fun onFailure(error: PushTokenError?) {
            // Handle registration error
        }
    })
}
```

```java title="Java"
@Override
public void onNewToken(@NonNull String token) {
    client.registerForPushNotifications(token, new IPushTokenCompletionHandler() {
        @Override
        public void onSuccess() {
            // Push token registered successfully
        }

        @Override
        public void onFailure(PushTokenError error) {
            // Handle registration error
        }
    });
}
```
</CodeBlocks>

---

## Huawei push notifications (HMS)

For Huawei devices operating without Google Play Services, use Huawei Mobile Services (HMS) for push notifications.

To enable HMS, set the [useHmsForPushNotifications]() parameter to `true` in your `ClientConfig`. When enabled, tokens registered via [registerForPushNotifications]() use the Huawei push certificate uploaded in the Voximplant Control Panel.

When set to `false`, tokens use the Google FCM certificate.

---

## Handle incoming push notifications

Incoming call push notifications arrive as FCM data messages. Override `onMessageReceived` in your `FirebaseMessagingService` to process the notification payload in both foreground and background states.

Recommended workflow for handling call push notifications:

1. Receive the push notification payload.
2. Verify that the payload contains the `voximplant` signature key.
3. Pass the payload to [IClient.handlePushNotification]().
4. [Connect and log in]() if the client is not already authenticated.
5. Listen for the [onIncomingCall]() event on [IClientIncomingCallListener]().
6. Display your incoming call UI to the user.

<CodeBlocks>
```kotlin title="Kotlin"
override fun onMessageReceived(remoteMessage: RemoteMessage) {
    val data = remoteMessage.data
    if (data.containsKey("voximplant")) {
        client.handlePushNotification(data)
    }
}
```

```java title="Java"
@Override
public void onMessageReceived(RemoteMessage remoteMessage) {
    Map<String, String> data = remoteMessage.getData();
    if (data.containsKey("voximplant")) {
        client.handlePushNotification(data);
    }
}
```
</CodeBlocks>

<Warning title="Android background network restrictions">
Starting with Android 15, the operating system restricts network access for background applications. If the [ClientState]() is [Disconnected](), you must start a foreground service before calling [IClient.connect()]() and [IClient.login()](). The service must remain active until the connection and login processes complete successfully.

For a reference implementation managing foreground services on modern Android versions, refer to the [Android SDK Demo]().
</Warning>

When your scenario invokes [callUser](), Voximplant automatically dispatches an FCM push notification to wake the application.

<Info title="FCM delivery analytics">
You can track push delivery status in real time in the Firebase console by setting the [analyticsLabel]() parameter on [callUser]() in your VoxEngine scenario.
</Info>

---

## Authentication security

Voximplant supports three authentication methods from client SDKs:

1. **Username and password**: Suitable for rapid prototyping.
2. **Username and login token**: A persistent token returned after an initial login.
3. **One-time login keys** *(Recommended for production)*: Secure authentication offloaded to your backend.

<Info title="One-time login keys">
One-time login keys allow clients to authenticate without storing passwords or persistent tokens on the device. Your backend generates an HMAC signature using your secret key and returns it to the client for single-use authentication.
</Info>