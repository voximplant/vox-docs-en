# Web

The Voximplant Web SDK enables real-time voice and video communication, peer-to-peer calling, and multi-party conferencing in modern JavaScript and TypeScript applications. It integrates seamlessly with popular frontend frameworks such as React, Vue, and Angular, as well as vanilla JavaScript setups.

For all new integrations, use Web SDK v5. Designed for modern web development, Web SDK v5 is distributed as an NPM package and offers native TypeScript support, a modular architecture, and a streamlined integration workflow.

## API reference and migration

- [Web SDK v5 API reference]()
- [Web SDK v5 migration guide]() — for upgrading from Web SDK v4
- [@voximplant/websdk on NPM]()
- [Web SDK v5 demo repository]()

## Important requirements

- Web SDK v5 must run in a secure context (HTTPS) or [potentially trustworthy origins]() to access media devices and stream audio and video.
- **Browser compatibility**: Web SDK v5 is supported on all modern desktop and mobile browsers with WebRTC enabled, including Chrome, Safari, Firefox, and Edge.

## Add Voximplant libraries to your project

Web SDK v5 is distributed as an NPM package. Add the `@voximplant/websdk` package to your project using your preferred package manager:

```bash title="Install Web SDK v5"
npm install @voximplant/websdk --save
# or
yarn add @voximplant/websdk
```

Pin an exact SDK version in your `package.json` file. For available versions, refer to the [Web SDK v5 changelog]().

Specifying an exact version across development and production environments helps prevent unexpected breaking changes when new major or minor versions are released.

## Initialize the SDK

Web SDK v5 uses a modular architecture built around an IoC container. To get started, initialize the Core instance via [Core.init]().

The Client module is built in and accessible directly via the [core.client]() property. To extend functionality (for example, to add voice and video calls or media stream management), register optional module loaders via [Core.registerModules]():

```javascript title="Initialize and register modules"
import { Core } from '@voximplant/websdk';
import { CallLoader } from '@voximplant/websdk/modules/call-manager';
import { StreamLoader } from '@voximplant/websdk/modules/stream';

// Initialize the Core instance.
const core = Core.init();

// Register required modules as needed.
core.registerModules([
  StreamLoader(),
  CallLoader(),
]);
```

To reduce your initial bundle size, you can load Voximplant modules asynchronously on demand. Modern bundlers like Webpack or Vite will automatically split these dynamic imports into separate chunks:

```javascript title="Dynamic module loading"
// 1. Dynamically import and register the module on demand
const NoiseSuppressionBalancedModule = import('@voximplant/websdk/modules/noise-suppression-balanced');
NoiseSuppressionBalancedModule.then(({ NoiseSuppressionBalancedLoader }) => {
  this.core.registerModules([NoiseSuppressionBalancedLoader()]);
});

// ... later in your application flow
// 2. Resolve the module instance asynchronously once registered
import { noiseSuppressionBalancedToken } from '@voximplant/websdk/modules/noise-suppression-balanced';
const noiseSuppression = await core.getModuleAsync(noiseSuppressionBalancedToken);
```

## Connect and log in

To access Voximplant communication features, your application must establish a connection to the Voximplant Cloud and authenticate a user.

The [Client]() interface provides API methods for connection and user authentication:

1. [Client.connect()]() — Establishes a connection to the Voximplant Cloud using your account's assigned node.
2. [Client.login()]() — Authenticates user credentials with the platform.

<Info title="Connection node notice">
When initializing and connecting the SDK to the Voximplant Cloud, you need to specify the node to connect to. Your node is bound to your Voximplant account. To find which node your account belongs to, log in to your control panel and check the **Credentials for working with API, SDK, SIP** section on the main dashboard.
</Info>

Failed [Client.connect()]() and [Client.login()]() calls reject their promises with typed error objects derived from base error classes: [ConnectionError]() and [LoginError]().

You can use standard `try...catch` blocks and `instanceof` checks to handle connection and authentication failures globally:

```javascript title="Connection and authentication with error handling"
import { 
  Core, 
  ConnectionNode, 
  ConnectionError, 
  LoginError 
} from '@voximplant/websdk';

const core = Core.init();
const { client } = core;

try {
  await client.connect({
    node: ConnectionNode.NODE_n,
  });
  await client.login({
    username: 'user@app.account.voximplant.com',
    password: 'your_password',
  });
  console.log('Successfully connected and logged in!');
} catch (error) {
  if (error instanceof ConnectionError) {
    // Handle any connection-related failures.
    console.error('Connection failed:', error.message);
  } else if (error instanceof LoginError) {
    // Handle any authentication-related failures.
    console.error('Login failed:', error.message);
  } else {
    // Handle any other unexpected runtime errors.
    console.error('An unexpected error occurred:', error);
  }
}
```

### Connection events and state tracking

While `try...catch` blocks handle immediate connection failures, monitoring the ongoing connection lifecycle—such as network drops or state changes—requires listening to Client events and watching the [Client.state]() property.

Key mechanisms:

- [ClientEvent.Disconnected]() — Triggered whenever the connection to the Voximplant Cloud closes. The event payload contains a [ClientDisconnectReason]():
  - [ConnectionLost]() — Disconnected unexpectedly due to network issues.
  - [UserInitiated]() — Disconnected intentionally via a [Client.disconnect()]() call.
- [Client.state]() — A read-only watchable that reflects the current [ClientState](): `Connecting`, `Connected`, `LoggingIn`, `LoggedIn`, `Disconnecting`, `Disconnected`, or `Reconnecting`.

Subscribe to events with [Client.addEventListener()]() and to state changes with the [Watchable.watch()]() API:

```javascript title="Listen to connection events and state"
import {
  Core,
  ClientEvent,
  ClientState,
  ClientDisconnectReason,
} from '@voximplant/websdk';

const core = Core.init();
const { client } = core;

client.addEventListener(ClientEvent.Disconnected, (event) => {
  if (event.payload.reason === ClientDisconnectReason.ConnectionLost) {
    console.log('Connection lost due to network issues');
  } else if (event.payload.reason === ClientDisconnectReason.UserInitiated) {
    console.log('Connection closed intentionally by user.');
  }
});

client.state.watch((newState) => {
  console.log(`Client state changed to: ${newState}`);
  if (newState === ClientState.Disconnected) {
    // Update the UI state or redirect to the login screen
  }
});
```

## Web SDK demos

To accelerate your integration, explore the reference applications available in the [Web SDK v5 demo repository]():

- **Audio Call Demo** — A complete audio calling application built with Vue.js 3 and TypeScript. It demonstrates user authentication, audio calls to Voximplant users, SIP addresses, and phone numbers, audio device management, call controls, DTMF tone sending, and incoming call handling.
- **Push Service Demo** — Extends the Audio Call Demo with Firebase Cloud Messaging (FCM) push notifications. It shows how to register push tokens via the `PushService` module, configure service workers, and support Progressive Web App (PWA) features.

Each demo is self-contained. To run a demo locally, navigate to its directory and run:

```bash title="Run demo applications locally"
yarn install
yarn dev
```

Refer to each example's `README.md` file for detailed configuration and setup instructions.

## Web SDK v4 (Legacy)

<Warning title="Legacy SDK notice">
Use Web SDK v4 only when maintaining an existing application. For all new integrations, use Web SDK v5.
</Warning>

Web SDK v4 will be supported until December 31, 2027. Support for Web SDK v4 is limited to critical bug fixes; all new features and platform enhancements are added exclusively to Web SDK v5.

Web SDK v4 is distributed via a CDN or the legacy `voximplant-websdk` NPM package and operates using the global [VoxImplant]() namespace. For detailed documentation on the legacy API, see the [Web SDK v4 API reference]().

### CDN

Include the following script tag in your HTML file to load the legacy SDK:

```html title="Load Web SDK v4 via CDN"
<script type="text/javascript" src="https://unpkg.com/voximplant-websdk@VERSION"></script>
```

Replace `VERSION` with an exact version from the [Web SDK v4 changelog]().

<Warning title="Specify an exact version">
We recommend specifying an exact SDK version when building both development and production applications. If you omit the version or use the `@latest` tag, your application will always load the latest version, which may introduce breaking changes or cause application crashes during major SDK releases. For more information, refer to [unpkg.com]().
</Warning>

### NPM

If you use a package manager, install the legacy `voximplant-websdk` package:

```bash title="Install Web SDK v4 via NPM"
npm install voximplant-websdk --save
# or
yarn add voximplant-websdk
```

### Initialize the SDK

<Info title="Connection node notice">
When initializing and connecting the SDK to the Voximplant Cloud, you need to specify the node to connect to. Your node is bound to your Voximplant account. To find which node your account belongs to, log in to your control panel and check the **Credentials for working with API, SDK, SIP** section on the main dashboard.
</Info>

Obtain the Voximplant client instance via [VoxImplant.getInstance]() and initialize it with [Client.init]():

```javascript title="Initialize Web SDK v4"
const sdk = VoxImplant.getInstance();
// Specify your account's assigned node.
const ACCOUNT_NODE = VoxImplant.ConnectionNode.NODE_n;

try {
  await sdk.init({
    node: ACCOUNT_NODE,
  });
  console.log('SDK initialized successfully');
} catch (error) {
  console.error('SDK initialization failed:', error);
}
```

### Legacy connection and authentication flow

To establish a connection to the Voximplant Cloud, use the [Client.connect]() method. Once connected, authenticate the user with the [Client.login]() method:

```javascript title="Web SDK v4 connection and login"
const sdk = VoxImplant.getInstance();
// Specify your account's assigned node.
const ACCOUNT_NODE = VoxImplant.ConnectionNode.NODE_n;

const handleLogin = async () => {
  try {
    await sdk.init({
      node: ACCOUNT_NODE,
    });
    console.log('SDK initialized successfully');
    try {
      await sdk.connect();
      console.log('Connected to Voximplant Cloud');
    } catch (error) {
      console.error('Connection failed:', error);
      return;
    }
    try {
      await sdk.login('username@app.account.voximplant.com', 'password');
      console.log('Logged in successfully');
    } catch (error) {
      console.error('Login failed:', error);
    }
  } catch (error) {
    console.error('SDK initialization failed:', error);
  }
};
```

For detailed documentation on the legacy API, see the [Web SDK v4 reference]().