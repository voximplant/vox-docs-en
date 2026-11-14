# Media Stream format

Applications can use `Voximplant.WebSocketFormat` to stream real-time audio over the WebSocket protocol using JSON serialization.

<Info title="Proto file">
The WebSocket media stream format is defined in a Protocol Buffers specification [available on GitHub]().
</Info>

---

## Receiving a media stream from Voximplant

A media stream always begins with a `StartEvent`, followed by a sequence of `MediaInfo` events delivering audio chunks. The stream concludes with a `StopEvent`.

Within a VoxEngine scenario, the initiation and termination of a stream are controlled by the `sendMediaTo` and `stopMediaTo` methods.

After a media stream has been stopped, a new stream can be started with a fresh `StartEvent`. If multiple streams are transmitted concurrently over the same WebSocket, each stream is identified by a unique `tag` across its `StartEvent`, `MediaInfo`, and `StopEvent` payloads.

### StartEvent

This event is generated when the scenario invokes `sendMediaTo`. For example, routing audio from a call into a WebSocket:

```javascript title="Direct call audio to WebSocket"
call.sendMediaTo(webSocket);
```

This action sends a `StartEvent` in the following format:

```json title="StartEvent JSON"
{
  "event": "start",
  "sequenceNumber": 0,
  "start": {
    "mediaFormat": {
      "encoding": "PCM16",
      "sampleRate": 16000
    }
  }
}
```

You can optionally specify a `tag`, custom parameters, and audio encoding:

```javascript title="Set tag and custom parameters"
call.sendMediaTo(webSocket, {
  tag: "stream2",
  encoding: WebSocketAudioEncoding.PCM16_8KHZ,
  customParameters: { test: "123" }
});
```

This generates a `StartEvent` with serialized custom parameters:

```json title="StartEvent with custom parameters JSON"
{
  "event": "start",
  "sequenceNumber": 0,
  "start": {
    "tag": "stream2",
    "mediaFormat": {
      "encoding": "PCM16",
      "sampleRate": 8000
    },
    "customParameters": "{\"test\":\"123\"}"
  }
}
```

### MediaInfo event

`MediaInfo` events deliver binary audio chunks encoded as base64 strings in the `MediaInfo.payload` field.

The following example shows a `MediaInfo` object containing 20 ms of audio encoded as `PCM16` at 16,000 Hz:

```json title="MediaInfo event JSON"
{
  "event": "media",
  "sequenceNumber": 4,
  "media": {
    "timestamp": 18880,
    "chunk": 3,
    "payload": "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=="
  }
}
```

#### MediaInfo.payload field

The `MediaInfo.payload` field contains audio data encoded using the codec specified in `StartEvent.mediaFormat`.

#### Audio duration in MediaInfo.payload

The duration of audio in each payload depends on the source (a call, player, or external WebSocket). When sourcing audio from a call, the chunk duration aligns with the `a=ptime` and `a=maxptime` [attributes]() in that call's SDP negotiation. Typically, each payload contains **20 milliseconds** of audio.

#### Calculating audio duration in MediaInfo.payload

After decoding the payload into `PCM16` at the source sample rate, the duration in milliseconds is calculated as:

$$\text{duration (ms)} = \frac{\text{sizeInBytes(payloadInPcm16)}}{2} \times \frac{1000}{\text{StartEvent.mediaFormat.sampleRate}}$$

#### MediaEvent.chunk and MediaEvent.timestamp fields

These fields correspond to the sequence number and timestamp fields defined in the [RTP header]():

1. Unlike RFC 3550, `MediaEvent.chunk` and `MediaEvent.timestamp` are 64-bit unsigned integers (`uint64`).
2. Gaps in `MediaEvent.chunk` sequence numbers indicate packet loss over the network. Applications should implement [Packet Loss Concealment (PLC)]() to handle missing frames.  
   The number of lost chunks is calculated as:
   $$\text{lostChunks} = \text{Current.MediaInfo.chunk} - \text{LastReceived.MediaInfo.chunk} - 1$$
3. An adaptive jitter buffer is used when transmitting media chunks via WebSocket to mitigate out-of-order packets. However, applications should be designed to handle or drop out-of-order chunks when network conditions vary.

#### MediaEvent.tag field

When transmitting multiple media streams simultaneously, applications should use `MediaInfo.tag` to demultiplex incoming chunks into separate audio streams.

### StopEvent

A `StopEvent` signals the end of audio transmission for a specific media stream. After a `StopEvent`, no further `MediaInfo` events are sent for that stream unless a new `StartEvent` is initiated.

The `StopEvent.tag` field identifies the terminated stream, while `StopEvent.mediaInfo` provides final statistics:

```json title="StopEvent JSON"
{
  "event": "stop",
  "tag": "stream2",
  "sequenceNumber": 1009,
  "stop": {
    "mediaInfo": {
      "bytesSent": 645120,
      "duration": 340800
    }
  }
}
```

---

## Sending a media stream to Voximplant

You can route audio streams sent from your external service over a WebSocket into an active call, conference, recorder, or another WebSocket endpoint.

To route an incoming WebSocket audio stream into an active call:

```javascript title="Route audio from WebSocket to call"
webSocket.sendMediaTo(call);
```

If multiple streams are multiplexed over the same WebSocket connection, assign a unique `tag` to each stream:

```javascript title="Demultiplex multiple streams"
webSocket.sendMediaTo(call, {
  tag: "stream1" // Route stream1 into the call
});

webSocket.sendMediaTo(recorder, {
  tag: "stream2" // Route stream2 into the call recorder
});
```

### Sending the StartEvent

The first message sent across the media stream must be a `StartEvent` specifying the stream codec in `StartEvent.mediaFormat`.

When Voximplant successfully processes a valid `StartEvent`, the [WebSocketEvents.MEDIA_STARTED]() event fires in your scenario. The `tag`, `customParameters`, and `mediaFormat` properties are mapped to the event's `tag`, `customParameters`, and `encoding` fields.

### Sending MediaInfo events

Format and transmit audio chunks according to the following guidelines:

1. **Chunk duration**: Chunk duration can be arbitrary, but sending multiples of **20 ms** is recommended.
2. **Timing & buffering**: You do not need to throttle chunk transmission strictly in real time. Chunks sent ahead of time are buffered in the platform's WebSocket buffer and forwarded to the target media unit in real time.
3. **Buffer limits**: The platform WebSocket buffer holds up to **10 seconds** of audio. Any chunks exceeding this capacity are dropped.
4. **Encoding**: Audio data in `MediaInfo.payload` must strictly match the codec specified in `StartEvent.mediaFormat`.

#### MediaEvent.chunk and MediaEvent.timestamp fields

These fields mirror the sequence number and timestamp fields of the [RTP header]():

* In an uninterrupted stream, increment `MediaEvent.chunk` by `1` for each consecutive chunk.
* Calculate `MediaEvent.timestamp` as the cumulative sum of audio samples in all preceding chunks:
  $$\text{samplesPerChunk} = \frac{\text{sizeInBytes(payloadInPcm16)}}{2}$$
* If your application experiences frame loss or reordering, ensure `MediaEvent.chunk` and `MediaEvent.timestamp` reflect these gaps accurately so jitter buffers can compensate properly.

#### MediaEvent.tag field

When streaming multiple audio tracks over a single connection, set `MediaInfo.tag` to match the corresponding stream's `StartEvent.tag`. Voximplant uses this tag to demultiplex and route chunks to the correct media destination.

### Sending a StopEvent

When media transmission finishes, send a `StopEvent`. The `StopEvent.tag` must match the `StartEvent.tag` of the completed stream.

Upon receiving a valid `StopEvent`, the scenario triggers the [WebSocketEvents.MEDIA_ENDED]() event.

### Changing the media codec

The codec defined in `StartEvent.mediaFormat` cannot be changed mid-stream. To switch codecs, terminate the active stream with a `StopEvent`, then initiate a new stream by sending a `StartEvent` containing the updated `mediaFormat`.