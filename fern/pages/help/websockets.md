# Media over WebSockets

WebSockets provide full-duplex, bidirectional communication between your Voximplant application and external third-party services in real time. This persistent connection enables continuous data exchange without the overhead of repeated HTTP polling.

Voximplant offers the [WebSocket module]() for streaming media and data to and from external endpoints. The module supports both outgoing connections (initiated from your scenario) and incoming connections (initiated by an external service).

Media streaming over WebSockets uses standardized JSON event payloads categorized into four primary event types: `init`, `start`, `media`, and `stop`.

---

## Outgoing connection

To establish an outbound connection, create a [WebSocket]() instance using the [VoxEngine.createWebSocket]() method. It accepts two parameters: a **URL** (in the format `wss://domain/path`) and an optional **protocols** array.

Once the connection is open, stream audio from an active call to the WebSocket using the [call.sendMediaTo]() method. You can specify a preferred audio encoding format and custom metadata parameters (defaults to `PCM8` if omitted). The [WebSocket.send]() method transmits text or serialized JSON payloads across the socket.

Use [WebSocket.close]() to close the connection from either the client or server side.

The scenario code for establishing an outgoing connection looks like this:

```javascript title="Outgoing WebSocket scenario"
VoxEngine.addEventListener(AppEvents.CallAlerting, (event) => {
  const webSocket = VoxEngine.createWebSocket('wss://your-url.example.com');
  // You can handle an outgoing WebSocket connection here
});
```

---

## Incoming connection

To allow external services to connect to an active Voximplant session over WebSockets, call [VoxEngine.allowWebSocketConnections]() in your scenario. Then subscribe to the [AppEvents.WebSocket]() event. Each incoming connection emits this event, providing access to the underlying socket object via `event.webSocket`.

You can obtain the session's WebSocket URL from the HTTP response of the [StartScenarios]() Management API method or directly from the [AppEvents.Started]() event in your scenario (ensure the URL scheme uses `wss://` rather than `https://`).

Once connected, stream media between the incoming socket and an active call using [call.sendMediaTo]():

```javascript title="Incoming WebSocket scenario"
VoxEngine.allowWebSocketConnections();

VoxEngine.addEventListener(AppEvents.WebSocket, (event) => {
  const webSocket = event.websocket;
  // You can handle an incoming WebSocket connection here
});
```

<Warning title="Connection limit">
The maximum number of concurrent incoming WebSocket connections cannot exceed the number of active calls in the session plus 3 (`calls + 3`). Exceeding this limit triggers the [NewWebSocketFailed]() event. Note that existing WebSocket connections are not automatically closed when a call ends.
</Warning>

---

## Sending audio and text data via WebSocket

### Sending text data

To transmit text or serialized JSON payloads across a WebSocket, use the [WebSocket.send]() method:

```javascript title="Sending text over WebSocket"
VoxEngine.addEventListener(AppEvents.CallAlerting, ({ call }) => {
  call.answer();
  call.addEventListener(CallEvents.Disconnected, VoxEngine.terminate);

  const webSocket = VoxEngine.createWebSocket('wss://your-url.example.com');

  webSocket.addEventListener(WebSocketEvents.OPEN, () => {
    Logger.write('Sending message');
    webSocket.send('Some test message');
  });
  webSocket.addEventListener(WebSocketEvents.MESSAGE, (message) => {
    Logger.write(`Received message ${message.text}`);
  });
  webSocket.addEventListener(WebSocketEvents.CLOSE, () => {
    VoxEngine.terminate();
  });
});
```

You can test your WebSocket client logic against a minimal Python echo server:

```python title="Python echo server"
import asyncio
import websockets

async def echo(websocket):
    async for message in websocket:
        await websocket.send(message)

async def main():
    async with websockets.serve(echo, "localhost", 8765):
        await asyncio.Future()  # Keep running

asyncio.run(main())
```

### Streaming audio from a call to WebSocket

To stream live audio from a call into a WebSocket endpoint, use [call.sendMediaTo](). You can configure a preferred encoding format and custom parameters (defaults to `PCM8` if unspecified):

```javascript title="Sending audio to WebSocket"
VoxEngine.addEventListener(AppEvents.CallAlerting, ({ call }) => {
  call.answer();
  call.addEventListener(CallEvents.Disconnected, VoxEngine.terminate);

  const webSocket = VoxEngine.createWebSocket('wss://your-url.example.com');

  // NOTE: using the 'ws.onopen' callback is the same as the 'WebSocketEvents.OPEN' event handling
  webSocket.onopen = () => {
    // Send audio to the websocket in the G.711 a-law encoding
    call.sendMediaTo(webSocket, {
      encoding: WebSocketAudioEncoding.ALAW,
      tag: 'call' //label for identifying the audio stream
    });
  };
  webSocket.onmessage = (message) => {
    Logger.write(JSON.stringify(message));
  };
});
```

### Streaming audio from WebSocket to a call

You can also stream audio from an external WebSocket server into an active call. The scenario prepares the session WebSocket URL and passes it to the external service, which then connects and streams audio back:

```javascript title="Streaming audio from WebSocket to a call"
let inCall;
let url;

VoxEngine.addEventListener(AppEvents.Started, ({ accessSecureURL }) => {
  url = accessSecureURL;
  VoxEngine.allowWebSocketConnections();
});

VoxEngine.addEventListener(AppEvents.CallAlerting, ({ call }) => {
  inCall = call;
  call.answer();

  // send ws url to the incoming call
  const wsUrl = url.replace('https', 'wss');
  call.sendMessage(`use websocket url ${wsUrl}`);

  const webSocket = VoxEngine.createWebSocket('wss://your-url.example.com');
  webSocket.addEventListener(WebSocketEvents.OPEN, () => {
    Logger.write('Sending message');
    webSocket.send(`use websocket url ${wsUrl}`);
  });
  webSocket.addEventListener(WebSocketEvents.MESSAGE, (message) => {
    Logger.write(`Received message ${message.text}`);
  });
  webSocket.addEventListener(WebSocketEvents.CLOSE, () => {
    VoxEngine.terminate();
  });

  call.addEventListener(CallEvents.Disconnected, VoxEngine.terminate);
  call.addEventListener(CallEvents.Failed, VoxEngine.terminate);
});

VoxEngine.addEventListener(AppEvents.WebSocket, ({ websocket }) => {
  websocket.addEventListener(WebSocketEvents.ERROR, () => {
    Logger.write('LOG INCOMING: WebSocketEvents.ERROR:');
  });
  websocket.addEventListener(WebSocketEvents.CLOSE, ({ reason }) => {
    Logger.write(`LOG INCOMING:  WebSocketEvents.CLOSE: ${reason}`);
  });
  websocket.addEventListener(WebSocketEvents.MESSAGE, ({ text }) => {
    Logger.write(`LOG INCOMING:  WebSocketEvents.MESSAGE: ${text}`);
  });
  websocket.addEventListener(WebSocketEvents.OPEN, () => {
    Logger.write('LOG INCOMING:  WebSocketEvents.OPEN');
  });

  websocket.sendMediaTo(inCall);

  inCall.addEventListener(CallEvents.Disconnected, VoxEngine.terminate);
});
```

Once your external server receives the target session URL, it can establish a connection and begin streaming:

```bash title="Run Node.js audio streamer"
node server_code.js wss://example_session_url
```

Here is a Node.js server implementation that reads a local audio file and streams it into the call:

```javascript title="Server code (Node.js)"
const fs = require('node:fs');
const WebSocketClient = require('websocket').client;

if (process.argv.length !== 3) return;

const wsUrl = process.argv[2];
const client = new WebSocketClient();
let startTime = null;

client.on('connectFailed', (error) => {
  console.log('Connect Error: ' + error.toString());
  process.exit();
});

client.on('connect', (connection) => {
  console.log('Connection established!');

  connection.on('error', (error) => {
    console.log('Connection error: ' + error.toString());
    process.exit();
  });

  connection.on('close', () => {
    console.log('Connection closed!');
    process.exit();
  });

  connection.on('message', (message) => {
    console.log("message: '" + message.utf8Data + "'");
  });

  const startEvent = {
    event: 'start',
    sequenceNumber: 0,
    start: {
      mediaFormat: {
        encoding: 'ULAW',
        sampleRate: 8000
      }
    }
  };

  console.log('send chunk ', JSON.stringify(startEvent));
  connection.send(JSON.stringify(startEvent));

  const CHUNK_DURATION_MS = 20;
  const CHUNK_SIZE = 160;
  const buffer = Buffer.alloc(CHUNK_SIZE);
  let sn = 0;

  fs.open('sample', 'r', (err, fd) => {
    function readNextChunk() {
      fs.read(fd, buffer, 0, CHUNK_SIZE, null, (err, nread) => {
        if (nread < CHUNK_SIZE) {
          const stopEvent = {
            event: 'stop',
            sequenceNumber: sn,
            stop: {}
          };
          console.log('send chunk ', JSON.stringify(stopEvent));
          connection.send(JSON.stringify(stopEvent));
          process.exit();
          return;
        }

        const chunk = {
          event: 'media',
          media: {
            chunk: sn,
            payload: buffer.toString('base64'),
            timestamp: sn * CHUNK_SIZE
          },
          sequenceNumber: sn
        };

        sn++;

        console.log('send chunk ', JSON.stringify(chunk));
        connection.send(JSON.stringify(chunk));

        const now = Date.now();
        if (startTime === null) startTime = now;
        const nextChunkTime = startTime + CHUNK_DURATION_MS * sn;

        setTimeout(() => {
          readNextChunk();
        }, nextChunkTime - now);
      });
    }
    readNextChunk();
  });
});

console.log('connect to ', wsUrl);
client.connect(wsUrl);
```

Voximplant buffers incoming media and plays it out in real time. To immediately interrupt active playback (for example, on user barge-in), call [clearMediaBuffer]() on the WebSocket instance in your scenario.

The Node.js server example above accepts raw PCM mu-law 8 kHz mono audio. You can convert existing audio files into this format using FFmpeg:

```bash title="FFmpeg audio conversion"
ffmpeg -i ./record.mp3 -f mulaw -acodec pcm_mulaw -ac 1 -ar 8000 output.raw
```

---

## Media stream message lifecycle

Streaming media over WebSockets follows a standardized three-part message lifecycle:

### 1. Data stream start (`start`)

```json title="1. Start stream message"
{ 
  "event": "start",
  "sequenceNumber": 0,
  "start": {
    "mediaFormat": { 
      "encoding": "audio/x-mulaw", 
      "sampleRate": 8000, 
      "channels": 1 
    },
    "customParameters": {
      "text1": "12312"
    }
  }
}
```

<Warning title="The event parameter">
The `event` parameter is mandatory for system messages. You cannot use both `event` and `customEvent` in the same custom message.
</Warning>

<Info title="Reading custom parameters">
To read `customParameters` passed from your external client inside a VoxEngine scenario, access `message.customParameters` on the `WebSocketEvents.MediaEventStarted` event object.
</Info>

### 2. Audio data chunk (`media`)

```json title="2. Audio chunk message"
{ 
  "event": "media",
  "sequenceNumber": 2, 
  "media": {
    "chunk": 1,
    "timestamp": 5,
    "payload": "no+JhoaJjpzSHxAKBgYJ...=="
  } 
}
```

### 3. Data stream termination (`stop`)

```json title="3. Stop stream message"
{ 
  "event": "stop",
  "sequenceNumber": 777,
  "stop": {
    "mediaInfo": { 
      "bytesSent": 21100,
      "duration": 124
    }
  }
}
```

For full implementation architectures, see [Connect external STT providers]().