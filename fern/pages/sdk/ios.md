# iOS and macOS

The Voximplant iOS SDK enables real-time voice and video communication, peer-to-peer calling, and multi-party conferencing in native Apple applications. Starting with SDK v3, these capabilities extend to native macOS apps.

Use SDK v3 for all new integrations. It features a modular architecture, enhanced flexibility, a streamlined integration flow, and unified support for iOS and macOS.

## API reference and migration

- [iOS SDK v3 API reference]()

The SDK is distributed as binary XCFrameworks via Swift Package Manager (SPM). Review the [SDK v3 Changelog]() for the latest release notes and framework size details.

SDK v3 requires the following minimum deployment targets:

- iOS: 12.0 or later
- macOS: 11.5 or later

## Add Voximplant libraries to your project

The Voximplant iOS SDK features a modular architecture. You only need to import the specific packages required for your target application running on iOS or macOS.

SDK Products:

- [VoximplantCore](): handles cloud connectivity, session management, and user authentication.
- [VoximplantCalls](): provides audio and video calling functionality. Includes WebRTC dependencies automatically.

### Integration via Xcode

1. Open your project in Xcode.
2. Select File → Add Package Dependencies...
3. In the search field, enter the package repository URL: `https://github.com/voximplant/ios-sdk-releases.git`
4. Set the Dependency Rule to a 3.x version requirement. Refer to the [SDK Changelog]() for release notes and framework sizes.
5. Select the required SDK products and assign them to your project's build target.

### Integration via SPM Package Manifest

<Aside>
```swift title="Package.swift dependency declaration"
// Package.swift
dependencies: [
    // Specify the target SDK release version
    .package(url: "https://github.com/voximplant/ios-sdk-releases.git", .upToNextMinor(from: "<version>"))
],
targets: [
    .target(
        name: "YourTargetName",
        dependencies: [
            .product(name: "VoximplantCore", package: "ios-sdk-releases"),
            .product(name: "VoximplantCalls", package: "ios-sdk-releases")
        ]
    )
]
```
</Aside>

If you are developing inside a Swift package, declare the dependency in your `Package.swift` file and link the necessary products to your target:

<Info title="Backward compatibility">
The Voximplant Swift Package does not strictly follow Semantic Versioning (SemVer), and backward compatibility between minor releases is not guaranteed. Always review the [SDK Changelog]() before updating versions. Use exact or `upToNextMinor` dependency requirements to prevent unexpected breaking changes.
</Info>

## Permissions and capabilities

Depending on the features you implement, the Voximplant SDK requires standard platform privacy permissions and system capabilities on iOS and macOS.

### All platforms

If your application uses the camera or microphone, add the following keys to your target's `Info.plist` file:

- `Privacy — Camera Usage Description (NSCameraUsageDescription)`
- `Privacy — Microphone Usage Description (NSMicrophoneUsageDescription)`

Provide clear, user-facing strings for each key. These explanations are displayed in system permission dialogs when your app requests access to the hardware.

Configure these keys for every iOS and macOS target that uses Voximplant calling features, even if you manage additional platform-specific capabilities separately in Xcode.

### iOS

To maintain active calls, play background audio, and receive incoming call notifications on iOS, enable background modes in Xcode:

1. Select your iOS app target in Xcode.
2. Navigate to the `Signing & Capabilities` tab.
3. Click `+ Capability` in the top-left corner and select `Background Modes`.
4. Enable the required modes for your feature set:
  - `Audio, AirPlay, and Picture in Picture`
  - `Voice over IP`
  - `Remote notifications`

### macOS

macOS apps require additional entitlements beyond the shared `Info.plist` usage descriptions. Configure them in Xcode under `Signing & Capabilities`.

#### Hardened Runtime

Enable the [Hardened Runtime]() capability to grant the SDK hardware access on macOS:

1. Select your macOS app target in Xcode.
2. Navigate to the `Signing & Capabilities` tab.
3. Click `+ Capability` and add Hardened Runtime.
4. Under `Resource Access`, enable:
  - `Camera` — required for video calls
  - `Audio Input` — required for audio and video calls

#### App Sandbox

If your macOS app uses the [App Sandbox](), configure the following capabilities so the SDK can access media devices and connect to the Voximplant Cloud:

1. Select your macOS app target in Xcode.
2. Navigate to the `Signing & Capabilities` tab.
3. Click `+ Capability` and add `App Sandbox` if it is not already enabled.
4. Under `App Sandbox`, enable:
  - `Camera` — required for video calls
  - `Microphone` — required for audio and video calls
  - `Incoming Connections (Network)` — required to receive network traffic
  - `Outgoing Connections (Network)` — required to connect to the Voximplant Cloud

## Initialize the SDK

<Aside>
```swift title="Initialize VIClient shared instance"
import VoximplantCore

// Obtain the shared client instance
let client = VIClient.shared

// Assign your class as the delegate to receive session events
client.delegate = self
```
</Aside>

In Voximplant SDK v3, connection and user authentication are managed via the thread-safe, singleton [VIClient]() instance. Obtain the shared instance and assign a session delegate to listen for global connection and session lifecycle events:

Configure the client whenever appropriate for your application's architecture. Ensure session listeners are assigned before initiating connections or authenticating users.

## Connect and log in

To access Voximplant communication features, your application should first establish a connection to the Voximplant Cloud and authenticate a registered user.

The connection and authentication flow utilizes two primary asynchronous methods:

1. [connect(to:completion:)]() — Establishes a socket connection to the Voximplant Cloud based on your configuration parameters and returns the connection result via its completion handler.
2. [login(withPassword:user:completion:)]() — Validates user credentials against the platform and handles the authentication response.

In addition to handling method completion callbacks, implement [VIClientSessionDelegate]() to monitor global session state changes, such as unexpected disconnections.

<Info title="Connection node notice">
When initializing and connecting the SDK to the Voximplant Cloud, you need to specify the node to connect to. Your node is bound to your Voximplant account. To find which node your account belongs to, log in to your control panel and check the **Credentials for working with API, SDK, SIP** section on the main dashboard.
</Info>

### Connection and authentication flow

<Aside>
```swift title="Connect and log in with VIClient"
import Foundation
import VoximplantCore

final class VoxClientManager: NSObject, VIClientSessionDelegate {
    private let client = VIClient.shared

    override init() {
        super.init()
        // 1. Assign delegate to listen for global session events
        client.delegate = self
        connectAndLogin()
    }

    private func connectAndLogin() {
        // Replace with your actual Voximplant account node
        let node = VINode.nodeN

        // 2. Establish connection to the Voximplant Cloud
        client.connect(to: node) { [weak self] error in
            guard let self else { return }
            if let error {
                // Connection failed (e.g., network error)
                print("Connection error: \(error)")
                return
            }

            // 3. Connection succeeded; proceed with user authentication
            self.client.login(
                withPassword: "password",
                user: "user@app.account.voximplant.com"
            ) { loginResult, error in
                if let error {
                    // Authentication failed (e.g., invalid credentials or expired token)
                    print("Login error: \(error)")
                    return
                }

                // Authentication succeeded
                let displayName = loginResult?.displayName ?? "User"
                print("Logged in successfully as \(displayName)")
            }
        }
    }

    // MARK: - VIClientSessionDelegate
    // 4. Listen for global connection changes (such as unexpected network drops)
    func client(_ client: VIClient, didDisconnectWithReason reason: VIDisconnectReason) {
        print("Disconnected with reason: \(reason)")
    }
}
```
</Aside>

Configure the session delegate, connect to the Voximplant Cloud using your account's node, and authenticate a user upon establishing a successful connection:

## iOS SDK demos

To accelerate your development, explore our reference applications showcasing best practices for Voximplant SDK v3:

[Voximplant SDK v3 Demo Repository]() — Sample applications built with SwiftUI demonstrating:

- **User Authentication**: Logging in with account credentials.
- **Audio Calling**: Initiating, receiving, and managing audio call routing.
- **CallKit Integration**: Managing incoming calls using CallKit and PushKit (AudioCallKit sample).

<Info title="Legacy demo applications">
Legacy SDK v2 demo applications remain available in repository archives; however, all new integrations should reference the v3 sample applications.
</Info>

## iOS SDK v2 (Legacy)

<Warning title="Legacy SDK notice">
Use SDK v2 only when maintaining an existing application. For all new projects, use SDK v3 to take advantage of its modular architecture, modern Swift features, and cross-platform support for iOS and macOS.
</Warning>

SDK v2 remains supported until **December 31, 2027**. Maintenance for SDK v2 is strictly limited to critical bug fixes, while all new features and ongoing platform enhancements are exclusive to SDK v3.

### Dependency configuration (SDK v2)

Unlike SDK v3, SDK v2 is distributed as a single, monolithic package supporting iOS targets. You can integrate it using either CocoaPods or Swift Package Manager (SPM). Refer to the [iOS SDK v2 Changelog]() for the latest release version.

#### Integration via CocoaPods

<Aside>
```ruby title="Podfile"
platform :ios, '12.0'
use_frameworks!

target 'MyApp' do
  pod 'VoxImplantSDK'
end
```
</Aside>

1. Install CocoaPods (refer to the [CocoaPods getting started guide]()).
2. If your project lacks a Podfile, create one by running `pod init` in your project directory.
3. Add the `VoxImplantSDK` pod to your Podfile.
4. Run `pod install` in your terminal to install the dependency.
5. Open your project via the generated `.xcworkspace` file going forward.

<Info title="Bitcode support">
Bitcode support was discontinued starting with SDK version 2.48.0.
</Info>

#### Integration via Swift Package Manager

In Xcode:

1. Open your project in Xcode.
2. Select File → Add Package Dependencies...
3. Enter the package repository URL: `https://github.com/voximplant/ios-sdk-releases.git`
4. Set the dependency rule to select a 2.x version. Refer to the [iOS SDK v2 Changelog]() for release notes.

<Aside>
```swift title="Package.swift (SDK v2)"
// Package.swift
dependencies: [
    // Paste the target SDK release version from the changelog
    .package(url: "https://github.com/voximplant/ios-sdk-releases.git", .upToNextMinor(from: "<version>"))
],
targets: [
    .target(
        name: "YourTargetName",
        dependencies: [
            .product(name: "VoxImplantSDK", package: "ios-sdk-releases")
        ]
    )
]
```
</Aside>

When declaring the dependency within a `Package.swift` file, add the repository and link the product to your target:

### Legacy connection and authentication flow

<Aside>
```swift title="Web SDK v2 connection and login"
import Foundation
import VoxImplantSDK

final class VoxClientManager: NSObject, VIClientSessionDelegate {
    private let client: VIClient
    private let node: VIConnectionNode

    init(node: VIConnectionNode, delegateQueue: DispatchQueue = .main) {
        // Initialize client and assign session delegate
        self.client = VIClient(delegateQueue: delegateQueue)
        self.node = node
        super.init()
        client.sessionDelegate = self

        // Establish connection to Voximplant Cloud
        if !client.connect(to: node) {
            print("Connect skipped; current state: \(client.clientState)")
        }
    }

    // MARK: - VIClientSessionDelegate
    func clientSessionDidConnect(_ client: VIClient) {
        // Connection succeeded; proceed with user authentication
        let user = "user@app.account.voximplant.com"
        let password = "password"

        client.login(
            withUser: user,
            password: password,
            success: { displayName, authParams in
                print("Logged in successfully as \(displayName)")
            },
            failure: { error in
                print("Login failed with error: \(error)")
            }
        )
    }

    func clientSessionDidDisconnect(_ client: VIClient) {
        // Handle unexpected disconnection
        print("Client disconnected")
    }

    func clientSession(_ client: VIClient, didFailToConnectWithError error: Error) {
        // Handle connection failure
        print("Failed to connect with error: \(error)")
    }
}
```
</Aside>

In SDK v2, connection and user authentication are managed using a [VIClient]() instance and the [VIClientSessionDelegate]() protocol.

Instantiate the client, configure the session delegate, handle connection lifecycle callbacks, and authenticate a user:

For detailed documentation on the legacy v2 API, refer to the [iOS SDK v2 Reference]().