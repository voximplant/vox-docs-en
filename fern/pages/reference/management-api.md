# Overview

Welcome to the **Management API reference**. The Management API is an OpenAPI-compliant HTTP REST API that gives your backend servers programmatic control over your Voximplant account and infrastructure.

Anything you can configure in the [Control Panel]()—from provisioning phone numbers and deploying scenarios to initiating outbound calls and fetching recordings—can be triggered via standard HTTP requests.

---

## Base endpoint & authentication

All Management API requests are sent via HTTPS to our centralized API endpoint:

```text
https://api.voximplant.com/platform_api/
```

<Aside>
```bash title="Example authenticated API request"
curl -X POST "https://api.voximplant.com/platform_api/StartScenarios" \
  -H "Authorization: Bearer YOUR_GENERATED_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "rule_id": 12345,
    "script_custom_data": "{\"orderId\": \"ABC-99\"}"
  }'
```
</Aside>

Authentication uses server-to-server **Service Accounts**. Requests must include a signed JSON Web Token (JWT) in the `Authorization` header:

Refer to the [JWT authorization guide]() for instructions on generating service account private keys and signing tokens in Node.js, Python, or curl.

---

## Reference categories

The Management API methods are organized by operational domain:

* **[Applications & Scenarios]()** — Create and configure applications, upload and version JavaScript scenarios, and manage routing rules.
* **[Call Control & Scenarios]()** — Trigger outbound calls and campaigns (`StartScenarios`), launch video rooms (`StartConference`), and pass runtime data to active sessions.
* **[Phone Numbers & SIP]()** — Search, purchase, attach, and configure phone numbers in 60+ countries, and manage third-party SIP registrations.
* **[Users & Push Credentials]()** — Provision end-user accounts for client SDKs, manage passwords, and upload APNs/FCM certificates.
* **[Call History & Records]()** — Search past Call Detail Records (CDRs), retrieve debug logs, and download audio/video session recordings.
* **[Account & Sub-Accounts]()** — Query balance and subscription info, manage multi-tenant [child accounts](), and configure service account roles.