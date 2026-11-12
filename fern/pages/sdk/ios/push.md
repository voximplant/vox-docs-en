# Push notifications

Configure VoIP push notifications to wake your iOS application and alert users of incoming audio and video calls.

Voximplant incoming call notifications on iOS rely on Apple's specialized [VoIP push notifications]().

Advantages of VoIP push notifications:
* **Energy efficiency**: The device wakes only when an incoming call notification arrives.
* **Direct delivery**: Notifications are delivered directly to your application process without requiring user interaction first.
* **Immediate priority**: Delivered without delay or standard APNs throttling.
* **Larger payload**: Supports larger payloads than standard push notifications.
* **Automatic relaunch**: The operating system automatically launches your application in the background if it is not running when a call arrives.
* **Dedicated runtime**: The system grants background runtime to process the push, connect to the cloud, and establish the call.

Requirements and limitations:
* Handled exclusively via Apple's [PushKit]() framework.
* Apple requires that every received VoIP push notification immediately be reported to the operating system using [CallKit](). Custom incoming call screens are not permitted; all incoming calls must display Apple's native CallKit UI.

---

## Configure your iOS project

<Info title="CallKit prerequisite">
Before implementing push notifications for voice and video calls, you must integrate CallKit into your project. Refer to the [CallKit guide]() for details.
</Info>

1. Open your project in Xcode.
2. In the Project Navigator, select your application target.
3. Navigate to the **Signing & Capabilities** tab (refer to Apple's [Adding capabilities to your App]() guide for details).
4. Click **+ Capability** and add:
   * **Push Notifications**
   * **Background Modes**, enabling:
     * `Audio, AirPlay, and Picture in Picture`
     * `Voice over IP`
     * `Remote notifications`

---

## Add credentials to the Voximplant Cloud

The Voximplant platform supports two Apple credential types for VoIP push notifications:

* **`.p8` private keys** *(Recommended)*: A single key covers both development and production environments and does not expire unless revoked.
* **`.p12` certificates**: Legacy certificates that expire annually and must be renewed every 12 months.

### Add a .p8 key

1. Create a private key with APNs enabled in your Apple Developer account (see Apple's [Create a private key]() guide). Download the resulting `.p8` file.
2. Log in to the [Voximplant Control Panel]().
3. Open your application and navigate to the **Push certificates** tab.
4. Click **Add certificate** in the upper-right corner.
5. In the **Platform** dropdown, select `Apple Key`.
6. Click **Choose File** and upload your `.p8` file.
7. Fill in the required parameters:
   * **Team name**: Your 10-character Apple Developer Team ID.
   * **Key ID**: The 10-character identifier of the private key.
   * **APNs topic**: Your application's bundle identifier (e.g., `com.company.app`).
8. Select **Production** or **Development** mode.
9. Click **Add**.

### Add a .p12 certificate

1. Generate a VoIP Push Services certificate in your Apple Developer account.
2. Download and double-click the certificate file to import it into your Mac's Keychain Access.
3. In Keychain Access, find the imported certificate, right-click, and select **Export**. Save it as a password-protected `.p12` file.
4. Log in to the [Voximplant Control Panel]().
5. Open your application and navigate to the **Push certificates** tab.
6. Click **Add certificate** in the upper-right corner.
7. In the **Platform** dropdown, select `Apple VoIP`.
8. Click **Choose File** and upload the `.p12` file.
9. Enter the export password configured in Keychain Access.
10. Select **Production** or **Development** mode.
11. Click **Add**.

### Migrate from a .p12 certificate to a .p8 key

1. Add your `.p8` key in the Voximplant Control Panel following [Add a .p8 key](#add-a-p8-key). Keep your `.p12` certificate active.
2. Test incoming call push notifications. When both are present, Voximplant automatically prioritizes the `.p8` key.
3. Once verified, delete the legacy `.p12` certificate.
4. If push delivery fails, check the session debug logs in Call History (see [Push troubleshooting]()). Remove the `.p8` key to fall back to the `.p12` certificate while diagnosing the issue.

### Additional settings

#### Environment mode
* **Production mode**: Use for builds distributed via TestFlight or released to the App Store.
* **Development mode**: Use strictly for local debugging builds deployed directly from Xcode to a test device.

#### Bundle identifiers and multiple apps
Voximplant can route push notifications to multiple iOS apps with different bundle IDs under the same Voximplant application. When adding a credential, specify the bundle identifier. When registering the device token in your client code, pass the matching bundle identifier to [VIClient.registerVoIPPushNotificationsToken(_:bundleId:completion:)]():

```swift title="Register token with bundle ID"
let client = VIClient.shared
client.registerVoIPPushNotificationsToken(
    pushCredentials.token,
    bundleId: "com.yourcompany.yourapp"
) { error in
    if let error = error {
        // Failed to register push token. See error for details.
    }
}
```

<Info title="Testing Debug and Release builds">
To support both Debug (Development) and Release (Production) APNs environments simultaneously under the same Voximplant application, upload the credential twice using custom bundle ID suffixes (e.g., `com.example.app.dev` and `com.example.app.prod`). Pass the matching suffix to the `bundleId` parameter in your client code depending on your build configuration.
</Info>

---

## Modify your VoxEngine scenario

To allow the Voximplant cloud to dispatch push notifications when calling a user, require the push service helper in your scenario:

```javascript title="Enable PushService in VoxEngine"
require(Modules.PushService);
```

When your scenario calls a user using [VoxEngine.callUser](), the platform automatically checks for registered push tokens and dispatches an APNs VoIP push to wake the device.

---

## Register the VoIP push token with Voximplant

To receive push notifications, your application must obtain a VoIP device token from [PushKit framework]() and register it with Voximplant.

Create a `PKPushRegistry` instance early in your application lifecycle (such as in your `AppDelegate` or application startup flow):

```swift title="Obtain and register PushKit token"
import PushKit
import VoximplantCore

let client = VIClient.shared
let voipRegistry = PKPushRegistry(queue: DispatchQueue.main)
voipRegistry.delegate = self

// 1. Check if push token is already cached
if let token = voipRegistry.pushToken(for: .voIP) {
    client.registerVoIPPushNotificationsToken(token) { error in
        if let error = error {
            // Handle registration error
        }
    }
} else {
    // 2. Request token from PushKit
    voipRegistry.desiredPushTypes = [.voIP]
}

// 3. Delegate callback when PushKit receives new credentials
func pushRegistry(
    _ registry: PKPushRegistry,
    didUpdate pushCredentials: PKPushCredentials,
    for type: PKPushType
) {
    client.registerVoIPPushNotificationsToken(pushCredentials.token) { error in
        if let error = error {
            // Handle registration error
        }
    }
}
```

You can call [VIClient.registerVoIPPushNotificationsToken(_:bundleId:completion:)]() in any [VIClientState](). If the client is not yet logged in, [VIClient]() caches the token and registers it automatically upon login.

Re-register the token whenever:
* PushKit delivers updated push credentials.
* A different Voximplant user logs in on the device.

---

## Handle incoming push notifications

When an incoming call arrives, PushKit delivers the VoIP push payload to the `pushRegistry(_:didReceiveIncomingPushWith:for:completion:)` delegate callback.

Apple requires that every VoIP push notification be reported immediately to CallKit using [CXProvider.reportNewIncomingCall(with:update:completion:)]().

Pass the push payload to [VIClient.handlePushNotification(pushPayload:)]() to extract the call `UUID`. This `UUID` corresponds to [VICall.callKitUUID]() on the incoming [VICall]() instance that arrives after connection.

<Warning title="CallKit reporting requirement">
Every received VoIP push notification must be reported to CallKit immediately. If an application receives a VoIP push and fails to report it, iOS will terminate the application. Repeated failures will cause the operating system to revoke VoIP push delivery entirely for your app.
</Warning>

```swift title="Handle VoIP push and report to CallKit"
import PushKit
import CallKit
import VoximplantCore

private let callProvider: CXProvider = {
    let providerConfiguration = CXProviderConfiguration(localizedName: "AudioCallKit")
    providerConfiguration.supportsVideo = false
    providerConfiguration.maximumCallsPerCallGroup = 1
    providerConfiguration.supportedHandleTypes = [.generic]
    providerConfiguration.ringtoneSound = "ringtone.aiff"
    providerConfiguration.iconTemplateImageData = UIImage(resource: .appLogo).pngData()

    return CXProvider(configuration: providerConfiguration)
}()

func pushRegistry(
    _ registry: PKPushRegistry,
    didReceiveIncomingPushWith payload: PKPushPayload,
    for type: PKPushType,
    completion pushProcessingCompletion: @escaping () -> Void
) {
    let dictionary = payload.dictionaryPayload
    
    if let voximplant = dictionary["voximplant"] as? [String: Any],
       let callUUID = VIClient.shared.handlePushNotification(pushPayload: dictionary) {
        let username = voximplant["userid"] as? String
        let displayName = voximplant["display_name"] as? String
        let video = voximplant["video"] as? Bool

        let callInfo = CXCallUpdate()
        callInfo.remoteHandle = CXHandle(type: .generic, value: username ?? "")
        callInfo.supportsHolding = true
        callInfo.supportsGrouping = false
        callInfo.supportsUngrouping = false
        callInfo.supportsDTMF = true
        callInfo.hasVideo = video ?? false
        callInfo.localizedCallerName = displayName

        callProvider.reportNewIncomingCall(with: callUUID, update: callInfo) { error in
            if let error = error {
                // CallKit may reject a call if Do Not Disturb is on or the caller is blocked
                print("Failed to report incoming call: \(error.localizedDescription)")
            }
        }
    } else {
        // Non-Voximplant payload: Apple still requires reporting a call or terminating
    }
}
```

Invoke the `pushProcessingCompletion` handler only after call processing has concluded:
* The call has connected ([VICallDelegate.call(_:didConnectWithVideo:headers:)]() has fired).
* The user declined or missed the call.
* An internal connection or authentication error occurred.

Calling the completion handler prematurely signals to iOS that processing is complete, which may suspend application execution before the call connects.

You can call [VIClient.handlePushNotification(pushPayload:)]() in any [VIClientState](). Connect and log in to the Voximplant Cloud; once authenticated, [VICallManagerDelegate.callManager(_:didReceiveIncomingCall:withVideo:headers:)]() emits the incoming [VICall]() object.

---

## Authentication security

Voximplant supports three authentication mechanisms from the client SDK:
* **Username and password**: Suitable for quick prototyping.
* **Username and login token**: A persistent token returned after an initial login.
* **One-time login keys** *(Recommended for production)*: Secure authentication offloaded to your backend.

<Info title="One-time login keys">
One-time login keys allow clients to authenticate without storing passwords or tokens on the device. Your backend generates an HMAC signature using your secret key and returns it to the client for single-use authentication.
</Info>