require(Modules.Jev);

VoxEngine.addEventListener(AppEvents.CallAlerting, async ({ call }) => {
  let client;

  const cleanup = () => {
    if (client) client.close();
    VoxEngine.terminate();
  };

  call.addEventListener(CallEvents.Disconnected, cleanup);
  call.addEventListener(CallEvents.Failed, cleanup);

  try {
    call.answer();

    client = await Jev.createSystemOneClient({
      apiKey: VoxEngine.getSecretValue("TYPESAFE_API_KEY"),
      onWebSocketClose: (event) => {
        Logger.write("===JEV_CONNECTION_CLOSED===");
        if (event) Logger.write(JSON.stringify(event));
        VoxEngine.terminate();
      },
    });

    client.addEventListener(Jev.SystemOneEvents.Error, (event) => {
      Logger.write("===JEV_ERROR===");
      Logger.write(JSON.stringify(event.data));
    });

    client.addEventListener(Jev.SystemOneEvents.ConnectorInformation, () => {
      Logger.write("===JEV_CONNECTED===");
      client.systemOne({
        requestId: "r1",
        body: {
          model: "jev-latest",
          state: "Help! My payouts have been failing for 3 days.",
          questions: {
            is_urgent: Jev.noul("Does this convey urgency?"),
          },
        },
      });
    });

    client.addEventListener(Jev.SystemOneEvents.Result, (event) => {
      const payload = event.data && event.data.payload;
      // @ts-ignore
      const requestId = payload && payload.requestId;
      Logger.write("===JEV_RESULT===");
      Logger.write(JSON.stringify(event.data));

      if (requestId === "r1") {
        client.systemOne({
          requestId: "r2",
          body: {
            model: "jev-latest",
            state: "Second decision on the same connection.",
            questions: {
              is_urgent: Jev.noul("Does this convey urgency?"),
            },
          },
        });
        return;
      }

      cleanup();
    });
  } catch (error) {
    Logger.write("===JEV_CLIENT_ERROR===");
    Logger.write(error);
    if (client) client.close();
    VoxEngine.terminate();
  }
});
