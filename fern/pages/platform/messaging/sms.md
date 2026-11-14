# SMS

Voximplant allows you to send and receive SMS messages globally for transactional notifications, one-time passwords (OTP), two-way customer support conversations, and automated alerts.

## Contents

- [Choosing an SMS-enabled number](#choosing-an-sms-enabled-number)
- [Enabling SMS on a phone number](#enabling-sms-on-a-phone-number)
- [Sending SMS messages](#sending-sms-messages)
  - [One-way A2P SMS](#one-way-a2p-sms)
  - [Two-way conversational SMS](#two-way-conversational-sms)
- [Receiving incoming SMS (Webhooks)](#receiving-incoming-sms-webhooks)
- [Message segmentation and encoding](#message-segmentation-and-encoding)

---

## Choosing an SMS-enabled number

Before you can send or receive SMS messages, you must have a phone number with SMS capabilities enabled in your account. SMS availability depends on the destination country and phone number type (mobile or local).

### Check SMS support in the Control Panel

1. Log in to the [Voximplant Control Panel]().
2. Navigate to **Numbers** → **Buy phone number**.
3. Select your desired country and phone category (e.g., `Mobile`).
4. Select a number to view its details. If a number does not support SMS, a warning message will state that SMS is unavailable for that specific pool.

### Check SMS support via the Management API

You can check which regions and number pools support SMS by calling the [GetPhoneNumberRegions]() Management API method:

```bash title="Check SMS support by region"
curl -X POST "https://api.voximplant.com/platform_api/GetPhoneNumberRegions" \
  -H "Authorization: Bearer YOUR_GENERATED_JWT" \
  -d "account_id=1&country_code=GB&phone_category_name=MOBILE"
```

```json title="Response"
{
  "result": [
    {
      "country_code": "GB",
      "phone_region_id": 27085,
      "is_sms_supported": true,
      "phone_count": 408,
      "phone_category_name": "MOBILE",
      "phone_price": 1.2
    }
  ],
  "count": 1
}
```

If `is_sms_supported` is `true`, numbers in that category can be used for SMS messaging.

---

## Enabling SMS on a phone number

SMS capabilities are disabled by default when you purchase a number. You must enable SMS before sending or receiving messages.

### Enable SMS in the Control Panel

1. In the [Control Panel](), go to **Numbers** → **My phone numbers**.
2. Locate your number, click the actions menu (**⋮**), and select **Edit**.
3. Toggle the **Enable SMS** switch to the active position.
4. Click **Save**.

### Enable or disable SMS via the Management API

Use the [ControlSms]() method to toggle SMS functionality programmatically:

```bash title="Enable SMS"
curl -X POST "https://api.voximplant.com/platform_api/ControlSms" \
  -H "Authorization: Bearer YOUR_GENERATED_JWT" \
  -d "account_id=1&phone_number=447443332211&command=enable"
```

```json title="Response"
{
  "result": 1
}
```

To disable SMS, pass `command=disable`:

```bash title="Disable SMS"
curl -X POST "https://api.voximplant.com/platform_api/ControlSms" \
  -H "Authorization: Bearer YOUR_GENERATED_JWT" \
  -d "account_id=1&phone_number=447443332211&command=disable"
```

<Info title="Storing message history">
To log message bodies in your account history for compliance or debugging, navigate to **Settings** → [SMS configuration]() in the Control Panel and enable **Always save the text of outgoing messages** and **Always save the text of incoming messages**.
</Info>

---

## Sending SMS messages

Voximplant supports both one-way application-to-person (A2P) broadcasts and two-way interactive messaging.

### One-way A2P SMS

Use the [A2PSendSms]() method to send one-way notifications, alerts, or OTP verification codes:

* **`src_number`**: An SMS-enabled number or an approved alphanumeric Sender ID (contact [support]() to register custom Sender IDs).
* **`dst_numbers`**: One or more destination phone numbers separated by semicolons (`;`).
* **`text`**: Message body up to 1,600 characters.

```bash title="Send one-way A2P SMS"
curl -X POST "https://api.voximplant.com/platform_api/A2PSendSms" \
  -H "Authorization: Bearer YOUR_GENERATED_JWT" \
  -d "account_id=1&src_number=447443332211&dst_numbers=447443332212;447443332213&text=Your verification code is 123456"
```

```json title="Response"
{
  "result": [
    {
      "transaction_id": 3996474,
      "destination_number": "447443332213"
    }
  ],
  "fragments_count": 1,
  "failed": [
    {
      "destination_number": "447443332212",
      "error_description": "SMS failed to send.",
      "error_code": 385
    }
  ]
}
```

### Two-way conversational SMS

For two-way conversations where customers can reply directly to your number, use the [SendSmsMessage]() method:

* **`source`**: The sending phone number registered on your account.
* **`destination`**: The recipient's phone number.
* **`sms_body`**: The text content of the message (up to 765 characters).

```bash title="Send two-way SMS"
curl -X POST "https://api.voximplant.com/platform_api/SendSmsMessage" \
  -H "Authorization: Bearer YOUR_GENERATED_JWT" \
  -d "account_id=1&source=447443332211&destination=447443332212&sms_body=Hello! How can we assist you today?"
```

```json title="Response"
{
  "result": 1,
  "fragments_count": 1
}
```

---

## Receiving incoming SMS (Webhooks)

When an incoming SMS arrives at an enabled number, the Voximplant Cloud sends an asynchronous HTTP callback—[IncomingSmsCallback]()—to your configured webhook endpoint.

The callback payload contains an `IncomingSmsCallbackItem` with the following details:
* Source phone number (sender)
* Destination phone number (your Voximplant number)
* SMS body text
* Message timestamp

### Configure your webhook endpoint

1. In the [Control Panel](), navigate to the **Webhooks** section.
2. Click **Add**.
3. In the **Callback URL** field, enter your public backend HTTPS URL.
4. Optionally specify a **Security salt** to verify callback authenticity.
5. Click **Save**.

Your backend can now receive incoming SMS events, trigger automated follow-ups, or route the text to your CRM. Refer to the [Management API callbacks guide]() for webhook security and payload parsing examples.

---

## Message segmentation and encoding

SMS messages are segmented and billed based on standard telecom character encodings:

* **GSM-7 encoding**: Standard Latin characters, digits, and basic punctuation. A single message segment holds up to **160 characters**.
* **UCS-2 (UTF-16) encoding**: Applied automatically if your message contains non-Latin scripts, accented characters, or emojis. A single segment holds up to **70 characters**.

When a message exceeds the single-segment limit:
* The message is split into concatenated parts (each using 7 bytes for concatenation headers).
* Multi-part GSM-7 segments hold **153 characters** each.
* Multi-part UCS-2 segments hold **67 characters** each.
* The `fragments_count` field in API responses reports how many billable segments the message was divided into.

Review per-segment inbound and outbound rates on the [pricing page]().