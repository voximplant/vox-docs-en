# Create an application

A Voximplant application is the central container for your project. Similar to a project workspace in other developer platforms, an application bundles your serverless JavaScript code ([scenarios]()), [routing rules](), [users](), [phone numbers](), and third-party integrations into an isolated environment.

**Before you write code, purchase numbers, or handle your first call, you must create an application.**

---

## How to create an application

To create an application in the Voximplant Control Panel:

1. Log in to the [Voximplant Control Panel]().
2. In the left navigation menu, click **Applications**.
3. Click **Create application** (or the **+** icon).
4. Enter a descriptive name for your application (for example, `customer-support` or `voice-assistant`). Application names must be unique within your account.
5. Click **Create**.

Your application is now created. Click on its name in the list to open its workspace.

---

## Application sections

Inside an application workspace, you will find dedicated sections to manage all resources and configurations connected to your project:

### Project overview & monitoring
* **Overview**: The main dashboard summarizing active sessions, call statistics (last hour, 24 hours, and 30 days), sample templates, and expiring phone numbers or SIP registrations.
* **Call history**: Search and filter past call records (CDRs), review session costs, download audio recordings, and inspect full execution debug logs.

### Code & routing
* **Scenarios**: The code editor where you create and manage your JavaScript scenarios. Scenarios contain the business logic executed by VoxEngine whenever calls or requests occur.
* **Routing**: The rule engine that dictates which scenario executes when an incoming call, SIP request, or SDK user connects.

### Telephony & connectivity
* **Numbers**: Rent and manage local, national, and toll-free virtual phone numbers in 60+ countries and bind them to your routing rules.
* **SIP registrations**: Connect Voximplant to third-party PBXs, SBCs, or carrier SIP trunks.
* **WhatsApp numbers**: Provision and manage numbers for WhatsApp Business messaging workflows.

### Identity & mobile
* **Users**: Create and manage user credentials required for authenticating Web, iOS, Android, React Native, and Flutter SDK clients.
* **Push certificates**: Upload Apple Push Notification service (APNs) and Firebase Cloud Messaging (FCM) credentials to wake up mobile applications for incoming calls.

### Storage & security
* **Key-Value storage**: Built-in cloud database for persisting data pairs across calls and sessions (keys up to 200 characters, values up to 2,000 characters).
* **Secrets**: Secure vault for private keys, database credentials, and third-party API tokens accessed inside your scenarios.

### Contact center & automation
* **SmartQueue**: Configure skills-based routing queues to distribute calls and chat conversations to agents based on availability.
* **Call lists**: Create contact lists for automated outbound campaigns powered by the Predictive Dialing System (PDS).
* **Dialogflow connector**: Upload Google Dialogflow ES or CX credentials to integrate virtual agents into your call flows.
* **VoxEngine CI**: Integrate your external IDE and version control workflows to deploy scenarios and routing rules programmatically.

---

## Next steps

Once your application is created, you are ready to write your first scenario. Proceed to [Create a scenario]() to start building your call logic.