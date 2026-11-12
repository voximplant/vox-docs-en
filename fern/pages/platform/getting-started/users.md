# Create users

In Voximplant, **users** represent identity and authorization credentials within an [application](). They provide the credentials that client applications (Web, iOS, Android, React Native, and Flutter) or SIP endpoints use to authenticate, place calls, receive calls, and send messages.

---

## Do you need to create users?

Users are required only when your application authenticates client endpoints directly:

* **You need users if**:
  * You build in-app voice, video, or conferencing experiences using our client SDKs (WebRTC).
  * You allow users to call each other directly by username or join shared rooms.
  * You register third-party SIP hardware or softphones to your application.
  * You use instant messaging or manage Monthly Active User (MAU) quotas.
* **You do not need users if**:
  * Your application interacts exclusively with the public telephone network (PSTN). For example, if you rent a phone number that runs an automated IVR, or your backend triggers automated outbound calls to mobile phones via the Management API, no user entities are needed.

---

## User credentials structure

Every Voximplant user belongs to a specific application and account. When authenticating an SDK or SIP client, the fully qualified username format is:

```text
username@appname.accountname.voximplant.com
```

* **`username`**: The individual user's login identifier (e.g., `alice` or `agent_101`).
* **`appname`**: The name of the Voximplant application where the user was created.
* **`accountname`**: Your Voximplant account name.

---

## How to create a user in the Control Panel

To create a user manually:

1. Log in to the [Voximplant Control Panel]().
2. In the left navigation menu, click **Applications** and open your project.
3. Select the **Users** tab from the application sidebar.
4. Click **Create user** (or the **+** icon).
5. Fill in the user details:
   * **Username**: A unique identifier within this application (alphanumeric, hyphens, and underscores).
   * **Password**: The password the client will supply during authentication.
   * **Display name**: An optional human-readable name (e.g., `Alice Smith`).
   * **Active**: Keep this enabled so the user can log in. Inactive users cannot authenticate or receive calls.
   * **Separate balance** (optional): Enable if you want this user to draw from their own dedicated balance pool instead of the parent account balance.
6. Click **Create** (or check **Create another** to continue adding users).

<Info title="Programmatic user provisioning">
If your application manages a dynamic user base, do not create users manually. Use the [AddUser]() Management API method from your backend to automatically provision users when they register in your product.
</Info>

---

## Frequently asked questions

**Q**: **What is the difference between an account user and an application user?**  
**A**: An **account user** is a team member who logs in to the Voximplant Control Panel to manage applications, billing, and settings. An **application user** is an end user identity that connects through client SDKs or SIP softphones to place and receive calls.

**Q**: **Can I allocate a separate balance to specific users?**  
**A**: Yes. When creating or editing a user, enable the **Separate balance** option. This is useful when you want specific departments, clients, or test accounts to operate with their own prepaid funds. For complete workspace isolation, consider creating [child accounts]().

**Q**: **What happens when a user is marked inactive?**  
**A**: Inactive users cannot log in via SDKs or SIP clients. Any active sessions for that user will fail to authenticate until the active flag is restored.

**Q**: **Can an SDK client call another user directly?**  
**A**: Yes. Once authenticated, an SDK user can place a call to another application user using call methods like `client.call('bob')`. This generates a call leg into your scenario, which you can then bridge to the destination user using `VoxEngine.callUser()`.