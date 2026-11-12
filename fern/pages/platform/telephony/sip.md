# SIP calls and registrations

Manage incoming and outgoing SIP traffic between Voximplant and external PBXs, softswitches, or third-party SIP clients.

## Contents

* [How to call a third-party PBX](#how-to-call-a-third-party-pbx)
* [How to receive calls from a third-party PBX](#how-to-receive-calls-from-a-third-party-pbx)
* [How to use third-party SIP software with Voximplant](#how-to-use-third-party-sip-software-with-voximplant)
* [How to work with SIP registrations](#how-to-work-with-sip-registrations)
* [Supported codecs and ciphers](#supported-codecs-and-ciphers)
* [Frequently asked questions](#frequently-asked-questions)

---

## How to call a third-party PBX

To dial an external SIP address from your cloud scenario, use the [callSIP]() method:

```javascript title="SIP call transport options"
// Use default UDP transport
const call = VoxEngine.callSIP('sip:alice@example.com');

// Use TCP transport
const callTcp = VoxEngine.callSIP('sip:alice@example.com;transport=tcp');
```

<Info title="UDP and TCP transport">
Voximplant uses UDP as the default transport protocol for SIP calls. To use TCP, append `;transport=tcp` to the target SIP URI.
</Info>

### Enable TLS for SIP calls

To encrypt signaling with TLS, change the URI prefix from `sip:` to `sips:`, or append `;transport=tls` to the URI:

```javascript title="Enable TLS for SIP calls"
// Use the sips: URI prefix
const call = VoxEngine.callSIP('sips:alice@example.org:5061', {
  callerid: '5510',
  displayName: 'Steve Rogers',
  password: 'shield',
  authUser: 'captain',
});

// Or specify TLS in the transport parameter
const call2 = VoxEngine.callSIP('alice@example.org:5061;transport=tls', {
  callerid: '8014',
  displayName: 'Hedy Lamarr',
  password: 'wifi',
  authUser: 'inventor',
});
```

<Info title="Placing SIP calls from client SDKs">
To place a SIP call directly from a Web or Mobile SDK, pass the target SIP URI as the destination parameter of the SDK's [call()]() method. Your cloud scenario receives this value in the `e.destination` property of the `AppEvents.CallAlerting` event.
</Info>

---

## How to receive calls from a third-party PBX

To allow an external PBX or SIP server to send calls into your Voximplant application, you must first whitelist your PBX's public IP address in the [control panel]().

<Info title="Whitelist IP addresses, not domain names">
Always whitelist the numerical public IP address of your PBX rather than a domain name (for example, whitelist `79.104.38.102` rather than `sip.example.com`).
</Info>

Once whitelisted, configure your external PBX to route calls to your Voximplant application using either of the following address formats:

* `destination@application.account.voximplant.com`
* `app_id#account_id#destination@sip.voximplant.com` *(in this format, `destination` must contain digits only)*

### Processing incoming SIP calls in scenarios

When an incoming SIP call arrives:

1. A matching [routing rule]() evaluates the `destination` portion of the SIP URI.
2. The matched [scenario]() starts execution.
3. Access the dialed target string in your scenario using the `e.destination` property on the incoming call object.

For full implementation examples, refer to the [voice calls guide]() and [video calls guide]().

<Warning title="Restricted domain">
You cannot route incoming SIP calls from external PBXs using `voximplant.com` as the source domain. To route calls between Voximplant users, follow the instructions in [how to call a Voximplant user]().
</Warning>

---

## How to use third-party SIP software with Voximplant

You can connect external SIP softphones or hardware devices (such as Linphone, Bria, or standard desk phones) to Voximplant:

1. In the control panel, [create an application]() and [create a user]().
2. In your third-party SIP client, add a new SIP account with the following parameters:
   * **Username**: The Voximplant username (e.g., `alice`).
   * **Domain / Proxy**: Your Voximplant application domain (`application.account.voximplant.com`).
   * **Password**: The password created for the user.
   * **Transport**: Select UDP, TCP, or TLS based on your security configuration.
3. Log in to register the device with Voximplant.

Once authenticated, the SIP client can place and receive calls through your application scenarios.

---

## How to work with SIP registrations

A **SIP registration** allows Voximplant to register as an extension (client) on an external PBX or SIP provider. This enables your external PBX to forward inbound calls directly into Voximplant without requiring dedicated SIP trunks or static IP whitelisting.

### Create a SIP registration

You can configure SIP registrations in the [control panel]() or programmatically using the [Management API]():

Required parameters:
* **Proxy**: Your provider's SIP proxy host and optional port (e.g., `sip.provider.com` or `sip.provider.com:5090;transport=tcp`). UDP is used by default.
* **Username**: The authentication username or extension assigned by your provider.
* **Password**: The SIP account password.
* **Outgoing proxy & Auth user** *(optional)*: Specify if required by your provider.

<Info title="Billing notice">
SIP registrations incur a recurring monthly fee billed according to our [price list](). Deleting a registration immediately after creation still bills the initial monthly fee.
</Info>

### SIP registration statuses

You can monitor registration health in the control panel:

* **Successful**: Registration succeeded and Voximplant is actively listening for forwarded calls.
* **In progress**: Provisioning is underway (typically completes within 2 minutes).
* **Failed**: The remote SIP proxy rejected registration. Check the error code in the control panel tooltip.

Status change notifications can be dispatched via email or HTTP callbacks. Learn more in [Management API callbacks]().

### Placing calls through a SIP registration

To place an outbound call through an active SIP registration, pass its `regId` to [VoxEngine.callSIP]():

```javascript title="Outbound call via SIP registration"
const call = VoxEngine.callSIP("12125550199", {
  regId: 12345, // Registration ID from the control panel or API
});
```

You can obtain the `regId` from the control panel or via the [GetSipRegistrations]() Management API method.

### Processing incoming calls from a SIP registration

To route inbound calls arriving through a SIP registration:

1. Open your application in the control panel.
2. Navigate to **SIP registrations** and click **Attach registration**.
3. Select your active registration and choose the target [routing rule]().

Calls arriving via this registration automatically execute the scenario bound to that routing rule without requiring regex pattern matching.

---

## Supported codecs and ciphers

Voximplant supports the following media codecs across SIP connections:

* **Audio codecs**: [G.729](), [G.722](), [G.711 (u-law and a-law)](), [Opus](), [ILBC]()
* **Video codecs**: [H.264](), [VP8]()

The platform supports the following OpenSSL cipher suites for TLS encryption:

`ECDHE-RSA-AES256-GCM-SHA384`, `ECDHE-ECDSA-AES256-GCM-SHA384`, `ECDHE-RSA-AES256-SHA384`, `ECDHE-ECDSA-AES256-SHA384`, `ECDHE-RSA-AES256-SHA`, `ECDHE-ECDSA-AES256-SHA`, `SRP-DSS-AES-256-CBC-SHA`, `SRP-RSA-AES-256-CBC-SHA`, `SRP-AES-256-CBC-SHA`, `DH-DSS-AES256-GCM-SHA384`, `DHE-DSS-AES256-GCM-SHA384`, `DH-RSA-AES256-GCM-SHA384`, `DHE-RSA-AES256-GCM-SHA384`, `DHE-RSA-AES256-SHA256`, `DHE-DSS-AES256-SHA256`, `DH-RSA-AES256-SHA256`, `DH-DSS-AES256-SHA256`, `DHE-RSA-AES256-SHA`, `DHE-DSS-AES256-SHA`, `DH-RSA-AES256-SHA`, `DH-DSS-AES256-SHA`, `DHE-RSA-CAMELLIA256-SHA`, `DHE-DSS-CAMELLIA256-SHA`, `DH-RSA-CAMELLIA256-SHA`, `DH-DSS-CAMELLIA256-SHA`, `GOST2001-GOST89-GOST89`, `GOST94-GOST89-GOST89`, `ECDH-RSA-AES256-GCM-SHA384`, `ECDH-ECDSA-AES256-GCM-SHA384`, `ECDH-RSA-AES256-SHA384`, `ECDH-ECDSA-AES256-SHA384`, `ECDH-RSA-AES256-SHA`, `ECDH-ECDSA-AES256-SHA`, `AES256-GCM-SHA384`, `AES256-SHA256`, `AES256-SHA`, `CAMELLIA256-SHA`, `PSK-AES256-CBC-SHA`, `ECDHE-RSA-AES128-GCM-SHA256`, `ECDHE-ECDSA-AES128-GCM-SHA256`, `ECDHE-RSA-AES128-SHA256`, `ECDHE-ECDSA-AES128-SHA256`, `ECDHE-RSA-AES128-SHA`, `ECDHE-ECDSA-AES128-SHA`, `SRP-DSS-AES-128-CBC-SHA`, `SRP-RSA-AES-128-CBC-SHA`, `SRP-AES-128-CBC-SHA`, `DH-DSS-AES128-GCM-SHA256`, `DHE-DSS-AES128-GCM-SHA256`, `DH-RSA-AES128-GCM-SHA256`, `DHE-RSA-AES128-GCM-SHA256`, `DHE-RSA-AES128-SHA256`, `DHE-DSS-AES128-SHA256`, `DH-RSA-AES128-SHA256`, `DH-DSS-AES128-SHA256`, `DHE-RSA-AES128-SHA`, `DHE-DSS-AES128-SHA`, `DH-RSA-AES128-SHA`, `DH-DSS-AES128-SHA`, `DHE-RSA-SEED-SHA`, `DHE-DSS-SEED-SHA`, `DH-RSA-SEED-SHA`, `DH-DSS-SEED-SHA`, `DHE-RSA-CAMELLIA128-SHA`, `DHE-DSS-CAMELLIA128-SHA`, `DH-RSA-CAMELLIA128-SHA`, `DH-DSS-CAMELLIA128-SHA`, `ECDH-RSA-AES128-GCM-SHA256`, `ECDH-ECDSA-AES128-GCM-SHA256`, `ECDH-RSA-AES128-SHA256`, `ECDH-ECDSA-AES128-SHA256`, `ECDH-RSA-AES128-SHA`, `ECDH-ECDSA-AES128-SHA`, `AES128-GCM-SHA256`, `AES128-SHA256`, `AES128-SHA`, `SEED-SHA`, `CAMELLIA128-SHA`, `IDEA-CBC-SHA`, `PSK-AES128-CBC-SHA`, `ECDHE-RSA-RC4-SHA`, `ECDHE-ECDSA-RC4-SHA`, `ECDH-RSA-RC4-SHA`, `ECDH-ECDSA-RC4-SHA`, `RC4-SHA`, `RC4-MD5`, `PSK-RC4-SHA`, `ECDHE-RSA-DES-CBC3-SHA`, `ECDHE-ECDSA-DES-CBC3-SHA`, `SRP-DSS-3DES-EDE-CBC-SHA`, `SRP-RSA-3DES-EDE-CBC-SHA`, `SRP-3DES-EDE-CBC-SHA`, `EDH-RSA-DES-CBC3-SHA`, `EDH-DSS-DES-CBC3-SHA`, `DH-RSA-DES-CBC3-SHA`, `DH-DSS-DES-CBC3-SHA`, `ECDH-RSA-DES-CBC3-SHA`, `ECDH-ECDSA-DES-CBC3-SHA`, `DES-CBC3-SHA`, `PSK-3DES-EDE-CBC-SHA`.

---

## Frequently asked questions

**Q**: **Can I create a SIP account directly on the Voximplant platform?**  
**A**: Yes. Application users double as SIP accounts. Use the username as the SIP user and your application domain as the SIP host (for example: `user@application.account.voximplant.com`).