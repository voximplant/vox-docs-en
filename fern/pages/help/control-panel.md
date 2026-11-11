# Control Panel

The **Voximplant Control Panel** is the web-based administrative interface and developer workspace for your account. It serves as your primary mission control: whether you are writing serverless code in the Cloud IDE, renting phone numbers across 60+ countries, inspecting live call logs, or generating API keys for your backend.

While virtually every action can also be automated programmatically via the [Management API](), the Control Panel provides the visual tools you need to build, test, and monitor your communications stack.

---

## How to sign up

Getting started with Voximplant takes less than two minutes:

1. Navigate to the [registration page]().
2. Enter your email address, create a secure password, and choose your **Account name**.
3. Confirm your email address via the verification link sent to your inbox.
4. Log in to the [Voximplant Control Panel]() to claim your testing balance and access your dashboard.

<Info title="Choosing your account name">
Your **Account name** is a permanent, unique identifier within the Voximplant global infrastructure. It is used across the platform, including fully qualified SDK/SIP login credentials (`username@appname.accountname.voximplant.com`) and API requests. Choose an alphanumeric name that represents your company or project.
</Info>

---

## What you can do in the Control Panel

The Control Panel is divided into dedicated functional areas designed to support every phase of the development lifecycle:

### 1. Applications and scenario development
* **Applications**: The top-level workspace where you group project resources. Everything you build lives inside an [application]().
* **Cloud IDE**: Write, edit, and test your serverless JavaScript [scenarios]() directly in your browser with built-in syntax highlighting, autocomplete, and code templates.
* **Routing rules**: Configure the pattern-matching engine that directs incoming phone calls, SIP URIs, and SDK connections to your scenarios.
* **Users**: Provision application users for authenticating Web, iOS, Android, and Flutter SDK clients.
* **Key-Value storage & Secrets**: Securely store API keys, tokens, and database credentials, and manage persistent key-value pairs across active calls.

### 2. Telephony and connectivity
* **Phone numbers**: Browse, purchase, and manage local, mobile, and toll-free virtual numbers in over 60 countries, and attach them to your application routing rules.
* **SIP registrations**: Connect Voximplant to third-party PBXs, softswitches, or existing telecom trunks.
* **WhatsApp Business**: Link and manage numbers for automated WhatsApp messaging workflows.

### 3. Monitoring, logs, and analytics
* **Call history**: Review detailed Call Detail Records (CDRs) for all completed and active sessions, complete with cost breakdowns and downloadable audio recordings.
* **Visual log inspector**: View color-coded, real-time debug execution logs for every scenario run. Filter logs by call legs, jump through events using a minimap, and share direct links with team members or support.
* **Active sessions**: Monitor live calls and conference rooms currently running across global media nodes.

### 4. Developer testing tools
Accessible from the top navigation bar under **Testing tools**:

* **Rule checker**: Input a destination phone number or username to instantly test which routing rule and scenario will trigger, without placing a real call.
* **Web softphone**: Place live test calls to your scenarios or registered users directly from your browser without configuring an external SIP client.

### 5. Access control and automation
* **Service accounts**: Create server-to-server credentials and generate cryptographic RSA key pairs for authenticating backend requests via [JWT authorization]().
* **Role-based permissions**: Restrict service account capabilities to specific scopes (e.g., billing, call control, or user management) according to the principle of least privilege.
* **Child accounts**: Create and manage isolated sub-accounts with independent balance pools for multi-tenant SaaS architectures.

### 6. Billing and settings
* **Balance & auto-recharge**: Top up your account balance, save credit cards, and configure automated recharge thresholds so production services never drop unexpectedly.
* **Invoices & tax details**: Download monthly PDF invoices and update company billing addresses or VAT IDs.
* **Notification preferences**: Set custom balance threshold alerts, service outage notices, and developer product update emails.

---

## Control Panel vs. Management API

| Feature | Control Panel | Management API |
| :--- | :--- | :--- |
| **Primary interface** | Web browser GUI | HTTP REST API / OpenAPI |
| **Best used for** | Prototyping, manual testing, reading logs, visual configuration | Automated provisioning, CI/CD deploys, backend call triggers |
| **Authentication** | Email & password (with 2FA) | Service account private keys & signed JWTs |
| **Code editing** | Built-in Cloud IDE editor | Programmatic file upload / VoxEngine CI |

Both interfaces interact with the same underlying platform. You can configure resources in the Control Panel and modify them later via the API, or vice versa.