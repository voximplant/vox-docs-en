# WhatsApp Business

Voximplant integrates with Meta's WhatsApp Business Calling API (Cloud API), allowing you to receive incoming calls from WhatsApp users and initiate outbound business calls directly to customers' WhatsApp applications.

<Info title="Video walkthrough">
For a complete visual walkthrough covering Meta developer account setup and Voximplant integration, watch our [video guide]().
</Info>

## Contents

- [Country availability and prerequisites](#country-availability-and-prerequisites)
- [Meta WhatsApp Cloud API setup](#meta-whatsapp-cloud-api-setup)
  - [Step 1: Add and verify the phone number](#step-1-add-and-verify-the-phone-number)
  - [Step 2: Register the number via Meta Graph API](#step-2-register-the-number-via-meta-graph-api)
- [Connect your WhatsApp number to Voximplant](#connect-your-whatsapp-number-to-voximplant)
- [Handle incoming WhatsApp calls](#handle-incoming-whatsapp-calls)
- [Initiate outbound WhatsApp calls](#initiate-outbound-whatsapp-calls)
  - [Customer call permissions](#customer-call-permissions)
  - [Outbound scenario implementation](#outbound-scenario-implementation)
- [PSTN bridging restrictions](#pstn-bridging-restrictions)

---

## Country availability and prerequisites

Before configuring WhatsApp calling, ensure you have:
* A verified **Meta Business Account** with access to the **WhatsApp Manager**.
* A dedicated phone number not currently registered with any personal or business WhatsApp mobile app.
* A Voximplant account with an active [application]().

<Info title="Regional availability for outbound calls">
Business-initiated WhatsApp calling is available in all regions supported by the WhatsApp Cloud API, except the following countries: **United States, Canada, Turkey, Egypt, Vietnam, and Nigeria**.
</Info>

---

## Meta WhatsApp Cloud API setup

### Step 1: Add and verify the phone number

1. Log in to your Meta Business Suite and open the [WhatsApp Manager]().
2. Navigate to **Phone numbers** and click **Add phone number**.
3. Complete the Business Profile form with your company details.
4. On the **Profile** tab, click **Send verification code**.
5. Choose your delivery method (SMS or Voice Call) and receive the 6-digit code.
6. Enter the verification code. Save this code securely—it is required during API registration in Step 2.
7. Switch to the **Certificate** tab in WhatsApp Manager. Under **Display Name**, ensure your certificate review status is **Approved**.

### Step 2: Register the number via Meta Graph API

Once your display name is approved, register the number with the Cloud API using two Meta Graph API requests. You will need your WhatsApp Business Account ID and an access token generated from the [Graph API Explorer]().

1. **Retrieve the Phone Number ID**:

```bash title="Get Phone Number ID"
curl -X GET "https://graph.facebook.com/v23.0/<YOUR_WA_ACCOUNT_ID>/phone_numbers?access_token=<ACCESS_TOKEN>"
```

```json title="Response"
{
  "data": [
    {
      "id": "YOUR_PHONE_NUMBER_ID",
      "verified_name": "YOUR_DISPLAY_NAME",
      "display_phone_number": "YOUR_PHONE_NUMBER",
      "code_verification_status": "VERIFIED"
    }
  ]
}
```

2. **Register the number with the Cloud API**:

Pass your `YOUR_PHONE_NUMBER_ID`, the certificate string from the **Certificate** tab, and the 6-digit verification code:

```bash title="Register number with Meta Cloud API"
curl -X POST \
  "https://graph.facebook.com/v23.0/<YOUR_PHONE_NUMBER_ID>/register" \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "messaging_product": "whatsapp",
    "certificate": "<YOUR_CERTIFICATE>",
    "pin": "<YOUR_VERIFICATION_CODE>"
  }'
```

```json title="Response"
{
  "success": true
}
```

Refresh the phone numbers view in WhatsApp Manager to confirm your number status is now **Connected**.

---

## Connect your WhatsApp number to Voximplant

Once your number is connected to the Cloud API:

1. Log in to the [Voximplant Control Panel]().
2. In the main navigation, go to **Settings** → **WhatsApp phone numbers**.
3. Click **Add a WhatsApp phone number**.
4. Follow the on-screen instructions to run the two required Meta Graph API commands to generate your SIP credentials.
5. Enter your WhatsApp phone number and the SIP password returned by the API commands, then click **Save**.
6. Open your Voximplant [application](), navigate to the **WhatsApp numbers** tab, and attach the newly added number.

---

## Handle incoming WhatsApp calls

When a customer calls your WhatsApp Business account from their WhatsApp application, Voximplant routes the call to your application's [routing rule]().

1. Create a [scenario]() that answers the call and executes your media or IVR logic:

```javascript title="Inbound WhatsApp call scenario"
let call;
let player;

VoxEngine.addEventListener(AppEvents.CallAlerting, (e) => {
  call = e.call;
  call.answer();

  call.addEventListener(CallEvents.Connected, (callEvent) => {
    player = VoxEngine.createTTSPlayer(
      'Hello, you have made the call using WhatsApp Business Calling API integration from Voximplant',
      { voice: VoiceList.ElevenLabs.Jessica }
    );
    player.sendMediaTo(call);
  });

  call.addEventListener(CallEvents.Disconnected, VoxEngine.terminate);
});
```

2. Create a [routing rule]() with the pattern `.*` and bind it to your inbound scenario.

---

## Initiate outbound WhatsApp calls

### Customer call permissions

According to Meta policies, businesses cannot place unsolicited outbound calls to WhatsApp users without prior user consent. You can obtain call permissions through two mechanisms:

1. **Permission request template**: Send an interactive WhatsApp message template asking the user to approve calls from your business.
2. **Inbound call window (7-day temporary permission)**: If a customer calls your WhatsApp Business number first, your business automatically receives a 7-day window to place return calls to that user.

Users can also manage call permissions directly from your business profile in their WhatsApp application. For detailed compliance rules, refer to Meta's [Business-initiated calling documentation]().

### Outbound scenario implementation

To place an outbound call to a customer's WhatsApp application, use the `VoxEngine.callWhatsappUser()` method. Pass the destination number in `number` and your registered WhatsApp Business number in `callerid`:

```javascript title="Outbound WhatsApp call scenario"
VoxEngine.addEventListener(AppEvents.CallAlerting, (e) => {
  const number = '19999999999'; // customer's whatsapp phone number
  const callerid = '442039665862'; // whatsapp business account

  let callParameters = {
    number,
    callerid
  };

  const call = VoxEngine.callWhatsappUser(callParameters);
  VoxEngine.easyProcess(e.call, call, () => {});

  e.call.addEventListener(CallEvents.Failed, (e2) => {
    Logger.write('Call failed: ' + e2.reason);
    VoxEngine.terminate();
  });

  e.call.addEventListener(CallEvents.Disconnected, VoxEngine.terminate);
});
```

---

## PSTN bridging restrictions

<Warning title="No bridging between WhatsApp and PSTN">
Under Meta's WhatsApp Business Calling API Terms of Service, audio streams originating from or terminating on WhatsApp cannot be bridged, transferred, or forwarded to the public switched telephone network (PSTN). Combining PSTN call legs and WhatsApp call legs within the same scenario session is strictly prohibited.
</Warning>