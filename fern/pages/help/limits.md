# Limits and restrictions

When an incoming call or an HTTP request triggers a Voximplant scenario, a new JavaScript session starts in the cloud. To guarantee real-time execution speed and prevent resource exhaustion, each session is subject to the following limits and restrictions.

## Account and security limits

* **Users per account**: Up to 1,000 users per account. Once this limit is reached, the Management API returns error code `109`. Contact [support@voximplant.com]() to increase your user limit.
* **Destination security blocks**: By default, destinations exceeding $0.20 per minute and calls to African countries are blocked to prevent toll fraud. Contact [support@voximplant.com]() to enable access to these destinations.

<Warning title="Child account settings inheritance">
If high-cost destination restrictions or custom security settings are applied to your parent account, all child accounts created afterward inherit these settings automatically.
</Warning>

## VoxEngine runtime limits

* **Scenario size**: Limited to 256 × 1024 Unicode characters (262,144 characters).
* **JavaScript memory**: Limited to 16 MB per session.
* **String length**: Maximum length of a single JavaScript string is 8,388,607 Unicode characters.
* **Callback execution time**: Limited to 1 second per callback. Heavy computations should be offloaded to your external backend and accessed via HTTP requests.
* **Active timers**: Maximum of 100 concurrent timers (`setTimeout` / `setInterval`) per session.

## Session lifecycle and timeouts

* **Unanswered incoming calls**: Automatically disconnected after 60 seconds if not answered.
* **Idle sessions without calls**: 
  * Terminated after **60 seconds** if no calls and no ACD requests are active.
  * Terminated after **120 minutes** if no calls are active, but at least one ACD request is in progress.
* **Outbound call timeout**: All outbound call methods ([callConference](), [callPSTN](), [callSIP](), [callUser](), [callUserDirect]()) trigger the `CallEvents.Failed` event with error code `408` if there is no answer after 60 seconds.
* **Termination behavior**: When the `Terminating` event fires, timers and external resources become unavailable. However, the scenario can make one final HTTP request to notify an external service that the session has ended.

## Call and media limits

* **Total call attempts**: Limited to 50 incoming and outgoing call attempts per session (both successful and failed attempts are counted). Attempts beyond this limit fail with a `CallEvents.Failed` event (`code: 403`, `reason: "Call limit reached"`).
  * Use the [Call list]() module for high-volume outbound calling campaigns.
  * Use the [Conference]() module for large multi-party sessions.
* **Concurrent progressing calls**: Maximum of 10 simultaneous unanswered ("progressing") calls at any given moment. Excess calls fail with `CallEvents.Failed` (`code: 403`, `reason: "Call limit reached"`).
* **Media players**: Maximum of 10 active media player instances per session.
* **In-call messaging payload**: The maximum data size that can be transmitted using [sendInfo]() or [sendMessage]() on a [Call class]() instance is 8,192 bytes.

## HTTP and network I/O limits

* **Concurrent active HTTP requests**: Maximum of 3 active requests in flight at a time. Additional requests are queued up to the simultaneous connection limit.
* **Simultaneous HTTP requests**: Maximum of 35 simultaneous requests (active plus queued). Exceeding this limit throws the `Exceeded the HTTP connection count limit!` exception.
* **HTTP response size**: Limited to 2 MB per response.
* **Concurrent active SMTP requests**: Maximum of 2 active requests. Additional requests are queued up to the simultaneous limit.
* **Simultaneous SMTP requests**: Maximum of 10 simultaneous requests (active plus queued). Exceeding this limit throws the `Exceeded the SMTP connection count limit!` exception.
* **Termination request draining**: Before the `Terminating` event finishes, VoxEngine waits up to 90 seconds for pending HTTP/SMTP requests to complete and execute their callbacks. Any remaining queued requests are dropped silently without executing callbacks.
* **Incoming WebSockets**: The maximum number of incoming WebSocket connections cannot exceed the number of active calls in the session plus 3 (`calls + 3`). Exceeding this triggers the [NewWebSocketFailed]() event. Existing connections are not automatically closed when a call ends.

## SIP protocol limits

* **SIP packet size**: Maximum 307,200 bytes.
* **Total SIP header size**: Maximum 4,095 bytes.
* **Single SIP header field**: Maximum 200 bytes.
* **SIP Refers (RFC 3551)**: Maximum of 10 refer requests per call.