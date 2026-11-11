# Flutter

This section guides you through building an application using the Flutter SDK and integrating Voximplant.

## Add Flutter SDK to your project

To begin, add the Flutter package to your project as a library dependency.

<Aside>
```bash title="Add dependency"
flutter pub add flutter_voximplant
```
```yaml title="pubspec.yaml"
dependencies:
  flutter_voximplant: ^3.12.0
```
</Aside>

**1. Depend on it**

Run the following command to add the Flutter package to your project:

This command adds the dependency to your project's `pubspec.yaml` file and executes an implicit `flutter pub get`. Alternatively, your editor might support running `flutter pub get` directly.

<Aside>
```dart title="Import package"
import 'package:flutter_voximplant/flutter_voximplant.dart';
```
</Aside>

**2. Import it**

In your Dart code, import the package:

## Get started with Flutter SDK for iOS

<Aside>
```xml title="ios/Runner/Info.plist"
<key>NSMicrophoneUsageDescription</key>
<string>Microphone is required to make voice calls</string>
<key>NSCameraUsageDescription</key>
<string>Camera is required to make video calls</string>
```
</Aside>

To use the Flutter SDK for iOS, add the required microphone and camera usage keys to your `Info.plist` file located in `<project root>/ios/Runner/Info.plist`:

These declarations allow your app to access audio and video hardware on Apple devices.

## Get started with Flutter SDK for Android

<Aside>
```groovy title="android/app/build.gradle"
android {
    // ...
    compileOptions {
        sourceCompatibility JavaVersion.VERSION_1_8
        targetCompatibility JavaVersion.VERSION_1_8
    }
}
```
</Aside>

To use the Flutter SDK for Android, ensure Java 8 support is enabled. Open `<project root>/android/app/build.gradle` and add the `compileOptions` block inside the `android` section:

## Initialize the SDK

<Aside>
```dart title="Initialize VIClient"
import 'package:flutter_voximplant/flutter_voximplant.dart';

VIClient client = Voximplant().getClient();
```
</Aside>

`Client` is the main class of the SDK that provides access to Voximplant functions. To obtain an instance, use the `Voximplant().getClient()` method:

## Connect to the Voximplant Cloud and log in

<Info title="Connection node notice">
When connecting the SDK to the Voximplant Cloud, you need to specify the node to connect to. Your node is bound to your Voximplant account. To find which node your account belongs to, log in to your control panel and check the **Credentials for working with API, SDK, SIP** section on the main dashboard.
</Info>

<Aside>
```dart title="Connect and log in"
Future<String> loginWithPassword(String username, String password) async {
  VIClientState clientState = await _client.getClientState();
  if (clientState == VIClientState.LoggedIn) {
    return _displayName;
  }
  const accountNode = VINode.NodeX;
  if (clientState == VIClientState.Disconnected) {
    await _client.connect(node: accountNode);
  }
  VIAuthResult authResult = await _client.login(username, password);
  _displayName = authResult.displayName;
  return _displayName;
}
```
</Aside>

To connect to the Voximplant Cloud and log in, use the `VIClient.getClientState()` method. This method returns the current state of the connection to the platform, allowing you to react accordingly:

## Start implementing functionality

Now that your application and SDK are set up and connected to the Voximplant Cloud, you can implement features such as voice and video calls, conferences, and messaging. Visit the [Guides section]() to explore the features you need.

## Flutter SDK demos

Explore reference applications to see the Voximplant Flutter SDK in action:

- [Audio call]() — Demonstrates voice calling functionality, including making and receiving calls, muting audio, putting calls on hold, and more.
- [Video call]() — Demonstrates video calling functionality, including starting and stopping video transmission, handling calls, and managing stream states.