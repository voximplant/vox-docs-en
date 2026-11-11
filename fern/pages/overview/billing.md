# How billing works

Understanding how Voximplant manages your balance, subscriptions, and automated payments ensures your services remain uninterrupted.

## Account balance & top-ups

Your account balance is the central pool for all Voximplant services:

* **Pricing reference**: Review live rates on the [pricing page]() or in the [control panel]().
* **Low balance alerts**: By default, notifications are sent when your balance reaches **$5.00**. You can customize this threshold in your [notification settings]().
* **Negative balance**: If a call is active when your balance hits $0, it may continue, resulting in a negative balance. Outbound services resume once your account is topped up.
* **Auto top-up**: Link a payment card via [Make a payment]() and contact [Technical support]() to set your custom balance threshold and recharge amount.

## Instant Messages & Monthly Active Users (MAU)

Voximplant uses a tiered model for messaging and active user logins, starting with a **Free tier**:

| Plan component | Free limit | Exceeding the limit |
| :--- | :--- | :--- |
| **Instant Messages (IM)** | 50K / month | Messages stop sending. |
| **Active Users (MAU)** | 1,000 / month | New user logins are blocked. |

<Info title="Paid plans (Small, Medium, Custom)">
Unlike the free tier, paid plans allow you to exceed limits. You are charged per pack of **100 additional messages** or **per new user login**.
</Info>

### Critical definitions

<Warning title="IM tracking">
The counter triggers on `sendMessage`, `editMessage`, and `removeMessage`. All actions are counted regardless of delivery status.
</Warning>

<Warning title="MAU tracking">
An **active user** is defined by a unique credential logging in at least once a month. One user logging in from multiple devices counts as **one MAU**. Active users of [child accounts]() are billed to the **parent account**.
</Warning>

### Plan changes & management

You can scale your subscription tier directly through the **[Billing section]()** or via the [ChangeAccountPlan]() Management API method:

* **Upgrading**: Can be done manually at any time.
* **Downgrading**: Requires submitting a request to **[Technical support]()**.
* **Prorated adjustments**: If you change plans mid-cycle, we refund the reserved amount for the old plan (minus usage) and apply the new plan's rate for the remaining days of the month.

## Grace period (USD and EUR accounts)

The grace period is a safety net enabled by default to prevent service interruption if a card payment fails:

* **How it works**: If your balance is insufficient for a subscription renewal, the fee amount is credited to your account for one month.
* **Repayment**: The credit must be repaid by the **1st day of the next month** to avoid account suspension.
* **Restrictions**: While in a grace period, you can spend remaining cash on calls, but you cannot purchase **new** plans until the credit is cleared.

<Info title="API check">
Use [GetAccountInfo]() to check your `grace_credit` status. A positive value indicates an active credit.
</Info>

## Phone number subscriptions

Purchasing a phone number involves specific one-time and recurring charges:

| Charge type | Timing |
| :--- | :--- |
| **Setup fee (+ tax)** | One-time at purchase |
| **Subscription fee (+ tax)** | Reserved monthly on the purchase anniversary |

### Important renewal rules

* **Reservation vs. charge**: The subscription fee is reserved on your anniversary date, but the final tax-adjusted charge occurs on the **1st of the following month**.
* **Insufficient funds**: If a reservation fails, the number is **suspended for one month**. If unpaid after that month, the number is released back into the public pool.
* **Verification**: Numbers in some countries are activated only after you **pass local verification**.
* **Cancellation**: Delete numbers via the **phone numbers** menu in the control panel to stop recurring billing.

## Invoices & taxes

Taxes are calculated based on your total spending and registered billing address.

* **Calculation**: Final tax rates are determined at the end of each month to account for any address updates or rate changes.
* **Availability**: Invoices are generated and sent on the **first day of every month**.
* **Reports**: Access and download all historical invoices in the **[Billing section]()** of the control panel.

## Notifications

You can receive notifications about low balances, rate changes, account updates, and developer notices.

To configure notifications, navigate to the [control panel]() → **Settings** → **Notifications**, and enable the alerts you want to receive.

## Regional differences

The billing experience varies slightly depending on your account currency:

### USD and EUR accounts

* **Address requirement**: You **cannot** add funds to your account without a valid billing address or VAT number.
* **Variable rates**: Tax rates vary based on your specific location and the services consumed.
* **API management**:
  * Use [GetAccountInvoices]() to list all invoices.
  * Use [DownloadInvoice]() to programmatically retrieve PDF copies.

### RUB accounts

* **Flat rates**: Tax rates are uniform for all customers.
* **Immediate deduction**: Prices are shown and deducted with tax already included.
* **Invoice detail**: 
  * **Legal entities**: Receive invoices with separate line items for price and tax.
  * **Individuals**: Receive invoices showing the total consolidated amount paid.