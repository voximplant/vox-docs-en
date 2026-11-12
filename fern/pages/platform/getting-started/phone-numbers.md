# Buy a phone number

In Voximplant, phone numbers connect your cloud applications directly to the public switched telephone network (PSTN), enabling communication with mobile and landline phones worldwide.

---

## Do you need a phone number?

Phone numbers are required only when bridging calls between the public telecom network and your Voximplant application:

* **You need a phone number if**:
  * You want customers to dial in from regular mobile or landline phones to reach your scenarios, IVR menus, or Voice AI assistants.
  * You make outbound calls to external phone numbers from a scenario and need a verified, compliant **Caller ID**.
* **You do not need a phone number if**:
  * Your application only supports in-app communications (such as WebRTC calling between Web, iOS, Android, React Native, or Flutter SDK clients). App-to-app and internal conference calling operate entirely over IP without phone numbers.

---

## Real numbers vs. test numbers

Voximplant offers two types of numbers:

* **Real numbers**: Commercial virtual numbers (local geographic, mobile, or national toll-free) across 60+ countries. Real numbers accept direct inbound calls from any phone network and can be used as outbound Caller IDs.
* **Test numbers**: Free sandboxed numbers designed for development and testing. To reach a test number, callers dial a regional Voximplant access number and enter the test number as an extension.

<Warning title="Test number restrictions">
Test numbers cannot be used as outbound Caller IDs and are subject to platform limits: a maximum of **100 calls per day** and **3 calls per minute**. For live production deployments, always use real numbers.
</Warning>

---

## How to buy a phone number

To purchase a number in the Voximplant Control Panel:

1. Log in to the [Voximplant Control Panel]().
2. In the main navigation menu, select **Numbers**.
3. In the top-left corner, click **Buy phone number** (or the **+** icon).
4. Choose between **Real** and **Test** numbers.
5. Filter by your target **Country**, **Phone category** (Local, Mobile, or Toll-free), and **Region/City**.
6. Review the one-time setup fee, monthly subscription cost, and any local regulatory requirements (KYC).
7. Select your preferred number from the available list and click **Buy**.

<Info title="Telecom regulations and verification (KYC)">
Depending on the country, local telecom regulations may require identity verification or proof of a local address before a number is activated. If verification is required, you will be prompted to submit the necessary documents in the control panel after purchase. If a country or city is not available for self-service purchase, contact [support]() to reserve numbers through our carrier team.
</Info>

---

## Attach a phone number to an application

Purchasing a number reserves it on your account, but it will not accept calls until it is linked to an application and assigned to a routing rule.

To attach a number:

1. In the control panel, navigate to **Applications** and open your project.
2. Select the **Numbers** tab.
3. Click **Attach number**.
4. Select your purchased number from the list.
5. Under **Routing rule**, choose which [routing rule]() should process incoming calls to this number (you can also bind it later under the application's **Routing** tab).
6. Click **Attach**.

Incoming calls to this phone number will now trigger the scenario assigned to your routing rule.

---

## Frequently asked questions

**Q**: **I purchased a phone number, but incoming callers always hear a busy tone. Why?**  
**A**: This usually means the number is not attached to an application, or it is not assigned to an active routing rule. Ensure the number is linked under your application's **Numbers** tab and attached to a rule in the **Routing** tab.

**Q**: **Can I forward incoming calls from a landline number to a mobile phone?**  
**A**: Yes. Rent a phone number, attach it to your application, and use a simple VoxEngine scenario that answers the inbound call and uses `VoxEngine.callPSTN()` and `VoxEngine.sendMediaBetween()` to bridge the caller to your mobile destination.

**Q**: **What types of phone numbers can I purchase?**  
**A**: Depending on the country, Voximplant offers **local geographic numbers** (tied to specific cities), **mobile numbers** (capable of receiving voice and SMS), and **toll-free numbers** (such as 800/888 numbers where the caller is not charged).

**Q**: **How does recurring billing work for phone numbers?**  
**A**: Phone numbers incur a one-time setup fee upon purchase and a recurring monthly subscription fee reserved on the purchase anniversary date. For detailed billing and cancellation rules, refer to [Phone number subscriptions]().

**Q**: **Can I use my existing phone numbers with Voximplant?**  
**A**: Yes. You can port existing phone numbers to Voximplant or connect your existing telecom carrier and PBX via [SIP integration]().