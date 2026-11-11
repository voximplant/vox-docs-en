# Contact support

Got stuck on a tricky call flow, hunting down an edge-case error, or designing an architecture for massive concurrency? We’re here to help you get unblocked.

Our technical support team works alongside the engineers who build the platform. Here is how to reach us, how to get the fastest resolution, and where to look if you want to solve the problem yourself.

---

## How to reach support

Depending on your plan and workflow, choose the channel that works best for you:

* **Support ticket (Recommended)**: Open a ticket directly inside the [Voximplant Control Panel](). Submitting via the control panel automatically associates your ticket with your account and assigned infrastructure node.
* **Email**: Drop us a line at [support@voximplant.com](). Please send from the email address linked to your Voximplant account.
* **Premium & Slack support**: Enterprise tier customers have access to dedicated Slack or Microsoft Teams channels and 24/7 emergency phone lines for critical production incidents.

<Info title="How to get your issue resolved on the first reply">
Telephony and real-time streaming issues are almost impossible to diagnose without trace IDs. To avoid back-and-forth questions, always include:

1. **Account ID & Application Name**: Found in the header of your control panel.
2. **Call Session ID (`call_session_history_id`)**: The unique string printed in your VoxEngine session logs and CDRs.
3. **Exact timestamp & timezone**: When the issue occurred.
4. **Caller & callee IDs**: Phone numbers (PSTN), SIP URIs, or SDK usernames involved.
5. **Code snippets & console logs**: The relevant block of your scenario or client-side SDK logs.
</Info>

---

## Explore self-service guides

Before waiting for a ticket response, check the resources in this section. Most common issues—from silent audio to promise rejections in scenarios—can be diagnosed in minutes:

### Troubleshooting
A practical playbook for diagnosing issues across every layer of the stack:
- **VoxEngine debugging**: Inspecting live logs, catching asynchronous unhandled promise rejections, and setting timeouts properly.
- **Client SDK diagnostics**: Resolving WebRTC ICE failures, mic/camera permission issues, and push notification delivery hiccups.
- **Audio & media issues**: Troubleshooting one-way audio, latency, packet loss, and codec mismatches.
- **Error dictionary**: A comprehensive index of platform error codes and HTTP API status responses.

### How it works
The conceptual blueprint of the platform:
- **Architecture & lifecycle**: How calls arrive, how routing rules trigger scenarios, and how media bridges without proxy bottlenecks.
- **Limits & restrictions**: Concurrency caps, Calls Per Second (CPS) thresholds, execution timeouts, and database limits.
- **Management API vs. VoxEngine**: When to orchestrate from your server via REST versus reacting in real time in the cloud runtime.