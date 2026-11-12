# Android

The Voximplant Android SDK allows you to embed real-time voice and video communication, peer-to-peer calling, and multi-party conferencing into native Android applications.

<Info title="Recommended version">
For all new integrations, we recommend using Android SDK v3, which features a modular architecture, improved flexibility, and a simplified integration workflow.
</Info>

## API reference and migration

- [Android SDK v3 API reference]()
- [Migration guide from SDK v2]()

### Platform requirements

- Minimum Kotlin version: 2.0
- Minimum JDK: 17

## Add Voximplant libraries to your project

The Voximplant Android SDK is modular and uses a Bill of Materials (BOM) to simplify dependency management. By using the BOM, you only specify the SDK version once, and all other modules automatically resolve to compatible versions.

Add the BOM and the required modules to your module-level build file (`build.gradle.kts` or `build.gradle`). You can find the latest version and library sizes in the [changelog]().

- `android-sdk-core` — Required for initialization, connection, and user authentication.
- `android-sdk-calls` — Required to support audio and video calling features.
- `android-sdk-renderer-compose` — Provides Jetpack Compose components and utilities to render video streams (such as local or remote camera feeds) in a declarative Compose-based user interface.

```kotlin title="build.gradle.kts dependencies"
dependencies {
    // ...
    // Specify the BOM version from the changelog
    implementation(platform("com.voximplant:android-sdk-bom:<version>"))
    implementation("com.voximplant:android-sdk-core")
    implementation("com.voximplant:android-sdk-calls")
    implementation("com.voximplant:android-sdk-renderer-compose")
}
```

The SDK requires Java 17 support. Configure it in your `build.gradle.kts` file:

```kotlin title="Java 17 compatibility"
android {
    // ...
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions {
        jvmTarget = "17"
    }
}
```

## Permissions

The Voximplant Android SDK automatically handles manifest declarations, but standard Android runtime permissions still apply depending on the features you implement.

### Automatic manifest declarations

The SDK declares all required permissions in its internal manifest. When you build your application, Android build tools automatically merge these into your application's final `AndroidManifest.xml` file. You do not need to add them manually:

- `android.permission.INTERNET` — To connect to the Voximplant Cloud.
- `android.permission.ACCESS_NETWORK_STATE` and `android.permission.CHANGE_NETWORK_STATE` — To monitor network connectivity changes.
- `android.permission.MODIFY_AUDIO_SETTINGS` — To configure audio routing (speaker, earpiece, headset).
- `android.permission.RECORD_AUDIO` — To capture microphone input for voice and video calls.
- `android.permission.CAMERA` — To capture video for video calls.
- `android.permission.BLUETOOTH` — To support Bluetooth audio routing.
- `android.permission.WRITE_EXTERNAL_STORAGE` — To support logging/caching when troubleshooting.

### Runtime permissions

For security, sensitive permissions must be requested from the user at runtime before starting or accepting calls:

- **Audio Calls**: Request `Manifest.permission.RECORD_AUDIO` before initiating or answering a voice call.
- **Video Calls**: Request both `Manifest.permission.RECORD_AUDIO` and `Manifest.permission.CAMERA` before starting or answering a video call.

You can request these permissions in your Activity or Fragment using standard Android APIs (such as the [registerForActivityResult]() API with the [ActivityResultContracts.RequestMultiplePermissions()]() contract).

## Initialize the SDK

Before using any Voximplant features, initialize the SDK core system by calling [VICore.initialize(context)]().

While you can initialize the SDK anywhere in your application (for example, in your `MainActivity` or a custom manager class) as long as you pass a valid [Context](), we recommend doing it once in a custom [Application]() class. This ensures the SDK is fully initialized and globally available as soon as your application starts:

```kotlin title="Initialize VICore in Application class"
import android.app.Application
import com.voximplant.android.sdk.core.VICore

class MyApplication : Application() {
    override fun onCreate() {
        super.onCreate()
        // Initialize the Voximplant Core with the application context
        VICore.initialize(this)
    }
}
```

After the core is initialized, connection and user authentication are managed via the singleton [Client]() instance. You can obtain this thread-safe client anywhere in your codebase:

```kotlin title="Obtain Client singleton"
import com.voximplant.android.sdk.core.Client

// Obtain the client singleton
val client = Client
```

## Connect and log in

To use Voximplant communication features, your application should first establish a connection to the Voximplant Cloud and authenticate a registered user.

The connection and login flow involves three primary asynchronous listeners and callbacks:

1. [ClientSessionListener]() — Handles global state events such as unexpected disconnections.
2. [ConnectionCallback]() — Handles the success or failure of a specific [Client.connect()]() attempt.
3. [LoginCallback]() — Handles the success or failure of a specific [Client.login()]() credential validation attempt.

<Info title="Connection node notice">
When initializing and connecting the SDK to the Voximplant Cloud, you need to specify the node to connect to. Your node is bound to your Voximplant account. To find which node your account belongs to, log in to your control panel and check the **Credentials for working with API, SDK, SIP** section on the main dashboard.
</Info>

### Connection and authentication flow

Configure global session listeners, connect to your specified Voximplant node, and authenticate a user upon establishing a successful connection:

```kotlin title="Connect and log in"
import com.voximplant.android.sdk.core.AuthParams
import com.voximplant.android.sdk.core.ClientSessionListener
import com.voximplant.android.sdk.core.ConnectOptions
import com.voximplant.android.sdk.core.ConnectionCallback
import com.voximplant.android.sdk.core.ConnectionError
import com.voximplant.android.sdk.core.DisconnectReason
import com.voximplant.android.sdk.core.LoginCallback
import com.voximplant.android.sdk.core.LoginError
import com.voximplant.android.sdk.core.Node

// 1. Listen for global connection changes (such as unexpected network drops)
client.setClientSessionListener(object : ClientSessionListener {
    override fun onConnectionClosed(reason: DisconnectReason) {
        // Log or update UI to reflect the disconnected state
    }
})

// 2. Establish connection to your specified Voximplant node (e.g., Node.Node1)
client.connect(
    options = ConnectOptions(node = yourNode),
    callback = object : ConnectionCallback {
        override fun onSuccess() {
            // 3. Connection succeeded, now authenticate the user
            client.login(
                // Your user's fully qualified username
                username = "user@app.account.voximplant.com",
                // Your user's password
                password = "password",
                callback = object : LoginCallback {
                    override fun onSuccess(displayName: String, authParams: AuthParams?) {
                        // Authentication succeeded!
                        // Display name is user's display name, e.g. "John Doe"
                    }

                    override fun onFailure(loginError: LoginError) {
                        // Authentication failed
                        // (e.g. invalid username/password or token expiration)
                    }
                },
            )
        }

        override fun onFailure(error: ConnectionError) {
            // Connection failed (e.g. network issues or timeout)
        }
    },
)
```

## Android SDK demos

To accelerate your integration, explore our reference application showcasing best practices for Android SDK v3:

[Android SDK v3 Demo Repository]() — A modern sample application built with Kotlin, Jetpack Compose, and Hilt. It features a modular architecture and demonstrates:
- **User authentication**: Logging in with credentials and silent token-based authentication.
- **Audio calling**: Initiating, receiving, and managing audio call routing.
- **Video calling**: Building video communication feeds using `android-sdk-renderer-compose` to display local and remote camera streams.

<Info title="Legacy demo applications">
Legacy v2-based demo applications remain accessible in repository archives, but we recommend referencing the v3 demo for all new integrations.
</Info>

## Android SDK v2 (Legacy)

<Warning title="Legacy SDK notice">
Use SDK v2 only when maintaining an existing application. For all new integrations, use SDK v3 to take advantage of its modular architecture and modern Android ecosystem support.
</Warning>

SDK v2 will be supported until **December 31, 2027**. Support for SDK v2 is limited to critical bug fixes, while new features and ongoing platform enhancements are exclusive to SDK v3.

To upgrade an existing project, refer to the [Android Migration Guide]().

### Monolithic dependency configuration

Unlike SDK v3, SDK v2 is distributed as a monolithic package. Add it to your build configuration along with Java 11 compatibility options:

```kotlin title="build.gradle (SDK v2)"
dependencies {
    // ...
    // Monolithic Voximplant SDK v2 package
    implementation("com.voximplant:voximplant-sdk:<version>")
}

android {
    // ...
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_11
        targetCompatibility = JavaVersion.VERSION_11
    }
}
```

### Legacy connection and authentication flow

In SDK v2, connection and login are handled through `IClient` instance listeners. Instantiate the client, configure session listeners, and authenticate a user:

```kotlin title="Legacy connect and log in"
// 1. Create client configuration and instantiate the client
val clientConfig = ClientConfig()
val client: IClient = Voximplant.getClientInstance(
    Executors.newSingleThreadExecutor(),
    applicationContext,
    clientConfig
)

// 2. Add listener to monitor connection status and trigger login
client.addClientSessionListener(object : IClientSessionListener {
    override fun onConnectionEstablished() {
        // Log in once the connection is established successfully
        client.login("user@app.account.voximplant.com", "password")
    }

    override fun onConnectionFailed(error: String) {
        // Handle connection failure
    }

    override fun onConnectionClosed() {
        // Handle unexpected disconnection
    }
})

// 3. Add listener to handle authentication results
client.addClientLoginListener(object : IClientLoginListener {
    override fun onLoginSuccess(displayName: String, authParams: AuthParams) {
        // Authentication succeeded
    }

    override fun onLoginFailed(reason: LoginFailureReason) {
        // Handle authentication failure
    }
})

// 4. Initiate the connection sequence
client.connect()
```

For detailed documentation on the legacy API, see the [Android SDK v2 reference]().