# Management API

The **Management API** is an OpenAPI-compliant REST API that gives your backend servers programmatic control over your Voximplant resources. 

Anything you can manage manually inside the [control panel]()—from provisioning phone numbers and deploying scenarios to initiating outbound calls and fetching call logs—can be automated via Management API endpoints.

---

## What you can do with the Management API

* **Application & scenario orchestration**: Create, update, and deploy applications, JavaScript scenarios, and routing rules dynamically from your CI/CD pipelines.
* **Telephony & numbers**: Search, purchase, configure, and bind local or toll-free phone numbers across 60+ countries, and manage SIP registrations.
* **User & credential management**: Automatically provision application users for Web, iOS, Android, and Flutter SDK clients as users sign up in your product.
* **Call automation & session control**: Launch outbound calls and multi-party conferences programmatically (`StartScenarios`, `StartConference`), and pass custom payload data directly into active VoxEngine sessions.
* **Analytics, records & reporting**: Retrieve detailed Call Detail Records (CDRs), download audio/video session recordings, and export billing data.
* **Multi-tenant account management**: Provision and manage isolated [child accounts]() and balance allocations for enterprise customers or sub-organizations.

For complete endpoint documentation and schemas, refer to the [Management API reference]().

---

## Authentication and service accounts

Management API requests authenticate server-to-server using **Service Accounts**. Instead of exposing your primary account credentials, you generate cryptographic key pairs linked to a service account and authenticate requests using signed JSON Web Tokens (JWT).

### How to create a service account

To generate service account credentials in the Voximplant Control Panel:

1. Log in to the [Voximplant Control Panel]().
2. In the top or sidebar settings menu, navigate to **Settings** → **Service Accounts**.
3. Click **Add** in the upper-right corner.
4. Enter a descriptive name and optional description for the service account (for example, `backend-call-dispatcher`).
5. Select the **Roles** required for your integration (see [Role-based permissions](#role-based-permissions)).
6. Click **Generate key**.

Your browser will automatically download a credentials JSON file.

<Warning title="Store your private key securely">
The downloaded JSON file contains your `account_id`, `service_account_id`, `key_id`, and your RSA `private_key`. Store this file securely in your backend secret manager. Voximplant does not store a copy of your private key and cannot retrieve it if lost.
</Warning>

### Authenticating API requests

<Aside>
```bash title="Example Management API request"
curl -X POST "https://api.voximplant.com/platform_api/StartScenarios" \
  -H "Authorization: Bearer YOUR_GENERATED_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "rule_id": 12345,
    "script_custom_data": "{\"customerId\": \"user_987\"}"
  }'
```
</Aside>

To authenticate a request, your server generates a short-lived JSON Web Token (JWT) signed with your RSA private key (using the RS256 algorithm) and passes it in the HTTP request:

For complete step-by-step instructions and code samples in Node.js, Python, and other languages, refer to the [JWT authorization guide]().

---

## Role-based permissions

Voximplant enforces the principle of least privilege using role-based access control (RBAC). 

A service account created **without any roles** has access only to non-destructive baseline metadata methods, such as:

* [GetAccountInfo]() — View basic account details
* [GetResourcePrice]() and [GetSubscriptionPrice]() — Check service rates
* [GetActualPhoneNumberRegion]() — Inspect geographic number regions
* [GetRoles](), [GetKeys](), and key management endpoints — Manage subordinate key permissions

### Granting additional roles

To grant your service account access to operational endpoints (such as initiating calls, modifying scenarios, or provisioning users), assign specific roles to it:

1. Go to **Settings** → **Service Accounts**.
2. Locate your service account, click the three-dots menu (**⋮**), and select **Edit**.
3. Click **Add role** and select the permission scopes required for your backend (such as *Calls*, *Applications*, *Users*, or *Billing*).
4. Click **Save** to apply the updated permissions immediately.

<Info title="Granular security">
Create separate service accounts for different backend microservices. For example, give your outbound campaign service the *Calls* role, while assigning your CI/CD deployment service the *Applications* and *Scenarios* roles.
</Info>