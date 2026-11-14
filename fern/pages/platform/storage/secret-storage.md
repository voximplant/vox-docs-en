# Secret storage

Voximplant provides a secure secret storage vault to protect sensitive credentials—such as third-party API keys, database passwords, and private tokens—allowing you to access them inside your scenarios without hardcoding sensitive strings in source code.

---

## Managing secrets

### Via the Control Panel

To create and manage secrets in the [Control Panel]():

1. Open the [Control Panel]() and navigate to your [application]().
2. In the application sidebar, select **Secrets**.
3. Click **Add secret**.
4. Enter a key name (for example, `OPENAI_API_KEY`) and its secret value, then click **Save**.

To edit or delete an existing secret, click the edit or delete icon next to the corresponding secret record in the list.

<Info title="Management API access">
You can also manage secrets programmatically via the Management API using [AddSecret](), [DelSecret](), [GetSecrets](), [GetSecretValue](), and [SetSecretInfo]().
</Info>

---

## Usage in scenarios

To retrieve a saved secret within your cloud scenario, call the [VoxEngine.getSecretValue()]() method:

```javascript title="Retrieve a secret in a scenario"
VoxEngine.addEventListener(AppEvents.Started, () => {
  const secretKey = 'a2';
  const secret = VoxEngine.getSecretValue(secretKey);
  const message = typeof secret === 'undefined' ? 'The secret value is undefined!' : secret;
  Logger.write(`===> ${message}`);
  VoxEngine.terminate();
});
```

---

## See also

- [Key-Value Storage]()
- [Custom data]()