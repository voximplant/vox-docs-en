# React Native

The Voximplant React Native SDK enables real-time audio and video calling, peer-to-peer communication, and multi-party video conferencing in React Native applications for iOS and Android.

Use SDK v2 for all new integrations. It features a modular architecture, separate core and calling modules, and full compatibility with modern React Native environments.

## Packages

The SDK is split into the following packages:

* `@voximplant/react-native-core` — Handles Voximplant cloud connection, authentication, push notifications, and audio device management. [(npm)]()
* `@voximplant/react-native-calls` — Handles audio and video calls, conference management, camera controls, and call statistics. [(npm)]()

For release history and patch details, see the [Changelog]().

## Platform requirements

Ensure your development environment meets the following minimum requirements:

* React: `^19.2.0`
* React Native: `>=0.77.0 <1.0.0`
* Android: API Level 24+
* iOS: iOS 12+

## Add Voximplant libraries to your project

Install both packages together and keep them at the same version, since `@voximplant/react-native-calls` depends on `@voximplant/react-native-core`:

```bash title="Install React Native SDK packages"
npm install @voximplant/react-native-core
npm install @voximplant/react-native-calls
```

Check the [Changelog]() for the latest release.

Both packages automatically install `@voximplant/react-native-shared` (containing common types and utilities) as an underlying dependency. You only need to install `@voximplant/react-native-shared` directly if your application explicitly imports from it.

### iOS configuration

The Voximplant React Native SDK is built directly on top of the native Voximplant iOS and Android SDKs. Because the underlying Voximplant iOS SDK is distributed via Swift Package Manager, CocoaPods cannot resolve it automatically. You must explicitly declare the native podspecs in your project's `Podfile`.

#### 1. Configure the Podfile

Add the podspecs to your target block in `ios/Podfile` (next to `use_native_modules!`).

Match your React Native SDK version with the native iOS SDK version below:

| SDK Version | VoximplantCore | VoximplantCalls | VoximplantWebRTC |
| :--- | :--- | :--- | :--- |
| 2.0.0 | [3.3.0]() | [3.3.0]() | [3.3.0]() |

In your `Podfile`, replace `<version>` with the corresponding version string from the table above:

```ruby title="Podfile"
target 'YourApp' do
  config = use_native_modules!

  pod 'VoximplantCore',   :podspec => 'https://github.com/voximplant/ios-sdk-releases/releases/download/<version>/VoximplantCore.podspec'
  pod 'VoximplantCalls',  :podspec => 'https://github.com/voximplant/ios-sdk-releases/releases/download/<version>/VoximplantCalls.podspec'
  pod 'VoximplantWebRTC', :podspec => 'https://github.com/voximplant/ios-sdk-releases/releases/download/<version>/VoximplantWebRTC.podspec'

  # use_react_native! and the rest of the target stay as they are
end
```

Then run `pod install` in the `ios` directory:

```bash title="Install CocoaPods dependencies"
cd ios && pod install
```

#### 2. Configure permissions

If your application uses `@voximplant/react-native-calls`, add the microphone and camera usage keys to your `ios/YourApp/Info.plist` file:

```xml title="ios/YourApp/Info.plist"
<key>NSMicrophoneUsageDescription</key>
<string>This app requires access to the microphone for voice calls.</string>
<key>NSCameraUsageDescription</key>
<string>This app requires access to the camera for video calls.</string>
```

iOS requires these declarations to display a permission prompt to the user the first time your application attempts to access audio or video hardware. Failing to include these keys will cause your app to crash when initiating or answering a call.

## Initialize the SDK

Obtain the [Client]() singleton instance from `@voximplant/react-native-core` when your application starts. This instance provides the methods to connect and log in:

```javascript title="Obtain Client instance"
import { Client } from '@voximplant/react-native-core';

const client = Client.getInstance();
```

## Connect and log in

To access Voximplant communication features, your application must establish a connection to the Voximplant Cloud and authenticate a user.

The [Client]() interface provides the API methods for connection and user authentication.

<Info title="Connection node notice">
When connecting the SDK to the Voximplant Cloud, you need to specify the node to connect to. Your node is bound to your Voximplant account. To find which node your account belongs to, log in to your control panel and check the **Credentials for working with API, SDK, SIP** section on the main dashboard.
</Info>

1. [Client.connect()]() — Establishes a connection to the Voximplant Cloud using your account's assigned node.
2. [Client.login()]() — Authenticates user credentials against the platform. Failed [Client.connect()]() and [Client.login()]() calls reject their promises with typed error objects derived from base error classes ([ConnectionError]() and [LoginError]()).

You can use standard `try...catch` blocks and `instanceof` checks to handle connection and authentication failures globally:

```javascript title="Connect and log in"
import {
  Client,
  ConnectionNode,
  ConnectionError,
  LoginError,
} from '@voximplant/react-native-core';

const client = Client.getInstance();

try {
  // Replace Node_n with the node your account belongs to
  await client.connect({
    node: ConnectionNode.Node_n,
  });

  await client.login('user@app.account.voximplant.com', 'password');

  console.log('Successfully connected and logged in!');
} catch (error) {
  if (error instanceof ConnectionError) {
    // Handles any connection-related failures
    console.error('Connection failed:', error.message);
  } else if (error instanceof LoginError) {
    // Handles any authentication-related failures
    console.error('Login failed:', error.message);
  } else {
    // Handles any other unexpected runtime errors
    console.error('An unexpected error occurred:', error);
  }
}
```

### Connection events and state tracking

While `try...catch` blocks handle immediate connection failures, monitoring the ongoing lifecycle — such as network drops or state changes — requires listening to `Client` events and watching the [Client.state]() property.

Key mechanisms:

* [ClientEvent.Disconnected]() — Triggered whenever the connection to the Voximplant Cloud closes. The event payload contains a [ClientDisconnectReason]():
  * [ConnectionLost]() — Disconnected unexpectedly due to network issues.
  * [UserInitiated]() — Disconnected intentionally via a [Client.disconnect()]() call.
  * [AppMovedToBackground]() — Disconnected because the app moved to the background.
  * [AlreadyDisconnected]() — The client was already disconnected.
* [Client.state]() — A read-only watchable reflecting the current [ClientState]().

Subscribe to events with [Client.addEventListener()]() and to state changes with the [Watchable.watch()]() API:

```javascript title="Listen to connection events and state"
import {
  Client,
  ClientEvent,
  ClientState,
  ClientDisconnectReason,
} from '@voximplant/react-native-core';

const client = Client.getInstance();

client.addEventListener(ClientEvent.Disconnected, (event) => {
  if (event.payload.reason === ClientDisconnectReason.ConnectionLost) {
    console.log('Connection lost due to network issues');
  } else if (event.payload.reason === ClientDisconnectReason.UserInitiated) {
    console.log('Connection closed intentionally by the user.');
  }
});

client.state.watch((newState) => {
  console.log(`Client state changed to: ${newState}`);

  if (newState === ClientState.Disconnected) {
    // Update UI state or redirect to login screen
  }
});
```

## React Native SDK demos

The [demo]() sample lets you try SDK v2 on a phone or simulator. Sign in with a Voximplant user, then make and receive voice and video calls, and join conferences:

* Connect to a Voximplant node and log in
* Preview the local camera before a call
* Start a one-to-one call or join a conference
* Answer an incoming call
* Switch audio devices and adjust call settings during a session

Older samples in the repository are for SDK v1 and are listed in the legacy section below.

---

## React Native SDK v1 (Legacy)

<Warning title="Legacy SDK notice">
Use React Native SDK v1 only when maintaining an existing application. For all new integrations, use React Native SDK v2.
</Warning>

React Native SDK v1 will be supported until December 31, 2027, with critical bug fixes only. All new features and platform enhancements are added exclusively to SDK v2.

React Native SDK v1 is distributed as the `react-native-voximplant` npm package and operates using the [Voximplant]() namespace. For detailed documentation on the legacy API, see the [React Native SDK v1 API reference]().

### NPM

If you use a package manager, install the legacy `react-native-voximplant` package:

```bash title="Install legacy SDK v1"
npm install react-native-voximplant --save
```

SDK v1 relies on native modules, so it does not work in a project created with `create-react-native-app`, which does not allow custom native modules.

### Initialize the SDK

Obtain the client instance with [Voximplant.getInstance]():

```javascript title="Initialize SDK v1"
import { Voximplant } from 'react-native-voximplant';

const client = Voximplant.getInstance();
```

### Connect and log in

To establish a connection to the Voximplant Cloud, use the [Client.connect]() method. Once connected, authenticate the user with the [Client.login]() method:

```javascript title="Legacy connect and log in"
import { Voximplant } from 'react-native-voximplant';

const client = Voximplant.getInstance();

// Choose NODE_n depending on the Voximplant account node
const ACCOUNT_NODE = Voximplant.ConnectionNode.NODE_n;

const login = async () => {
  try {
    const state = await client.getClientState();
    if (state === Voximplant.ClientState.DISCONNECTED) {
      await client.connect({ node: ACCOUNT_NODE });
      console.log('Connected');
    }

    try {
      await client.login('user@app.account.voximplant.com', 'password');
      console.log('Logged in!');
    } catch (e) {
      console.log('Login failure!');
    }
  } catch (e) {
    console.log('Connection failed!');
  }
};
```

For detailed documentation on the legacy API, see the [React Native SDK v1 reference]().

The v1 demos are:
- [Conference]() — conference calls, including video and mute.
- [Video conference]() — audio and video calls with push notifications.