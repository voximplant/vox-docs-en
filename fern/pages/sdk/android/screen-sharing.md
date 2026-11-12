# Screen sharing

The Voximplant Android SDK allows applications to capture and stream the device screen into active calls using Android's [MediaProjection API]().

Screen sharing requires **Android 5.0 (API level 21)** or higher.

---

## 1. Request user permission

Android requires explicit user permission before screen capture can begin. Create a screen capture intent using `MediaProjectionManager` and launch it for a result:

<CodeBlocks>
```kotlin title="Kotlin"
val mediaProjectionManager = getSystemService(Context.MEDIA_PROJECTION_SERVICE) as MediaProjectionManager
val screenSharingIntent = mediaProjectionManager.createScreenCaptureIntent()

startActivityForResult(screenSharingIntent, SCREEN_SHARE_REQUEST_CODE)

override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
    if (requestCode == SCREEN_SHARE_REQUEST_CODE && resultCode == Activity.RESULT_OK && data != null) {
        // User granted permission; ready to start screen sharing
        startScreenShare(data)
    }
}
```

```java title="Java"
MediaProjectionManager mediaProjectionManager = 
    (MediaProjectionManager) getSystemService(Context.MEDIA_PROJECTION_SERVICE);
Intent screenSharingIntent = mediaProjectionManager.createScreenCaptureIntent();

startActivityForResult(screenSharingIntent, SCREEN_SHARE_REQUEST_CODE);

@Override
public void onActivityResult(int requestCode, int resultCode, Intent data) {
    if (requestCode == SCREEN_SHARE_REQUEST_CODE && resultCode == Activity.RESULT_OK && data != null) {
        // User granted permission; ready to start screen sharing
        startScreenShare(data);
    }
}
```
</CodeBlocks>

---

## 2. Start screen sharing

Pass the received permission `Intent` to [startScreenSharing()]() on the active `ICall` instance:

<CodeBlocks>
```kotlin title="Kotlin"
call?.startScreenSharing(screenSharingIntent, object : ICallCompletionHandler {
    override fun onComplete() {
        // Screen sharing started successfully
    }

    override fun onFailure(e: CallException) {
        // Failed to start screen sharing; check e.errorCode for details
    }
})
```

```java title="Java"
call.startScreenSharing(screenSharingIntent, new ICallCompletionHandler() {
    @Override
    public void onComplete() {
        // Screen sharing started successfully
    }

    @Override
    public void onFailure(CallException exception) {
        // Failed to start screen sharing; check exception.getErrorCode()
    }
});
```
</CodeBlocks>

If initialization fails, review the error code defined in the [CallError enum]().

---

## 3. Stop screen sharing

To stop sharing the screen, invoke [sendVideo]() on the call instance:

* Pass `true` to stop screen sharing and immediately resume transmitting camera video.
* Pass `false` to stop screen sharing and mute all video transmission.

<CodeBlocks>
```kotlin title="Kotlin"
val resumeCameraVideo = false

call?.sendVideo(resumeCameraVideo, object : ICallCompletionHandler {
    override fun onComplete() {
        // Screen sharing stopped
        // If resumeCameraVideo is true, camera feed is now active
        // If resumeCameraVideo is false, all outgoing video is stopped
    }

    override fun onFailure(e: CallException) {
        // Handle error
    }
})
```

```java title="Java"
boolean resumeCameraVideo = false;

call.sendVideo(resumeCameraVideo, new ICallCompletionHandler() {
    @Override
    public void onComplete() {
        // Screen sharing stopped
        // If resumeCameraVideo is true, camera feed is now active
        // If resumeCameraVideo is false, all outgoing video is stopped
    }

    @Override
    public void onFailure(CallException exception) {
        // Handle error
    }
});
```
</CodeBlocks>