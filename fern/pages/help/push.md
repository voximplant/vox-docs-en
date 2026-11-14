# Push notifications troubleshooting

Diagnose and resolve issues with Apple Push Notification service (APNs) and Firebase Cloud Messaging (FCM) delivery in Voximplant.

---

## Setup checklist

Before troubleshooting delivery failures, verify that your configuration meets the following baseline requirements:

1. **Credentials uploaded**: The APNs `.p8` key / `.p12` certificate or Firebase Service Account JSON is uploaded in the **Push certificates** section of your Voximplant application.
2. **Scenario push helper added (calls only)**: The scenario initiating the call imports the push module:
   ```javascript title="Enable PushService in VoxEngine"
   require(Modules.PushService);
   ```
3. **Token registered**: The client application successfully obtained a push token from the operating system and registered it with the Voximplant SDK (`registerVoIPPushNotificationsToken` on iOS or `registerForPushNotifications` on Android).
4. **Active user association**: The registered token is associated with the exact user being called.

---

## Inspecting push delivery in session logs

When a scenario places a call to an application user, VoxEngine dispatches push notifications to all active tokens registered for that user and records the result in the session debug log under the `Call.PushSent` event:

1. Open the [Voximplant Control Panel]().
2. Navigate to **Call history** and open the session log for the call where the notification was not received.
3. Locate the `Call.PushSent` event block:

```text title="Call.PushSent log entry"
Sent event to JS onPhoneEvent with params [{
  name = Call.PushSent ;  
  proxyId = <proxy_id> ;  
  result = {
    "user_id": "user@app.account.voximplant.com",
    "push_results": [
      {
        "sdk_type": "ios",
        "token": "<ios_voip_push_token>",
        "msg": null,
        "result": true
      },
      {
        "sdk_type": "android",
        "token": "<android_fcm_push_token>",
        "msg": null,
        "result": true
      },
      {
        "sdk_type": "web",
        "token": "<web_fcm_push_token>",
        "msg": null,
        "result": true
      }
    ]
  } ; 
}]
```

* **`"result": true`**: The push notification was accepted by APNs or FCM and queued for delivery to the device.
* **`"result": false` or an error string in `msg`**: Delivery failed between Voximplant and the push provider (see error resolutions below).

---

## Common errors and solutions

| Error | Root Cause | Resolution |
| :--- | :--- | :--- |
| **`no tokens found`** | No active push token is registered for the called user, or the token was previously invalidated by the provider. | Verify client code registers the token upon login. Inspect previous session logs to verify if earlier pushes caused the provider to reject the token. |
| **`Forbidden` (FCM)** | The Google Service Account JSON uploaded to the Control Panel lacks sufficient IAM permissions. | Open the Google Cloud Console and grant the **Service Account Token Creator** role to the `firebase-adminsdk` account. |
| **`DEVICE_UNREGISTERED` (FCM)** | The registration token is no longer valid (e.g., the user uninstalled the app, the token expired, or the app was reinstalled). | Remove the invalid token from client storage and re-request a fresh token using `FirebaseMessaging.getInstance().getToken()`. |
| **`BadDeviceToken` (APNs)** | The device token does not match the configured environment (Development vs. Production). | Ensure your Xcode build environment matches the certificate mode in the Control Panel: use **Development** mode for local Xcode debug builds; use **Production** mode for TestFlight and App Store release builds. |
| **`DeviceTokenNotForTopic` (APNs)** | The device token was issued for a different bundle identifier than the topic configured on the certificate. | Verify that the APNs topic matches the exact bundle identifier of the application. |
| **`Request has failed with timeout` (APNs)** | The `.p12` push certificate has expired or the provider gateway timed out. | Check certificate expiration dates in Keychain Access or migrate to a non-expiring `.p8` key. If unexpired, contact [support@voximplant.com](). |
| **`Push certificate not match to a bundle`** | The bundle ID or package name configured on the certificate does not match the identifier passed during SDK initialization. | When managing multiple certificates in one application, verify that the package name or bundle ID configured in the Control Panel matches the parameter supplied to `ClientConfig.packageName` or `registerVoIPPushNotificationsToken(bundleId:)`. |

---

## Delivery issues when push status is successful

If `Call.PushSent` reports `"result": true`, the provider accepted the notification, but device-level operating system policies may still block or delay delivery:

### Android device restrictions

* **Battery optimization (Doze mode)**: Aggressive battery-saving policies or custom OEM power managers (e.g., Xiaomi, Huawei, Samsung) can throttle background network execution. Consult [Google recommendations for Doze and App Standby]().
* **Message priority**: Call notifications are sent with high priority. Messaging notifications are sent with normal priority and may be deferred when the device enters standby.

### iOS CallKit requirements

* **Missing CallKit reporting**: Since iOS 13, Apple requires that every received VoIP push notification immediately be reported to CallKit using `reportNewIncomingCall`. If an application fails to report a call, iOS terminates the application and temporarily revokes VoIP push delivery.
* Ensure your `PKPushRegistryDelegate` implementation complies with [PushKit VoIP requirements]().