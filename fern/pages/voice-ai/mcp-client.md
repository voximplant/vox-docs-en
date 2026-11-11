# MCP client

With Voximplant, you can connect to Model Context Protocol (MCP) servers over WebSockets and act as an MCP client directly from your cloud scenarios.

The Model Context Protocol is an open standard that enables AI models to communicate with external data sources, business logic, and tools through a unified, secure interface. By acting as an MCP client, Voximplant bridges its real-time telephony capabilities—such as live speech-to-text (STT), high-quality neural speech synthesis (TTS), and intelligent turn detection—directly with MCP servers hosting private databases, CRMs, or internal APIs. 

This architecture allows voice agents to listen via Voximplant VAD, fetch dynamic context from an MCP resource, and execute MCP tools (such as checking account balances, updating ticketing systems, or booking calendar appointments) mid-conversation without requiring external orchestration middleware.

Learn more about MCP on the [official website]().

---

## Usage

<Aside>
```javascript title="Working with MCP servers"
require(Modules.MCP);

const MCP_TOOL_NAME = 'roll';

VoxEngine.addEventListener(AppEvents.CallAlerting, async ({ call }) => {
  let mcpClient;

  const cleanup = () => {
    if (mcpClient) mcpClient.close();
    VoxEngine.terminate();
  };

  call.addEventListener(CallEvents.Disconnected, cleanup);
  call.addEventListener(CallEvents.Failed, cleanup);

  try {
    call.answer();

    mcpClient = await MCP.createClient({
      mcpServerConnectionConfig: {
        transport: 'sse',
        endpoint: VoxEngine.getSecretValue('MCP_SERVER_URL'),
        headers: {
          Authorization: `Bearer ${VoxEngine.getSecretValue('MCP_SERVER_TOKEN')}`,
        },
        clientName: 'voximplant-mcp-demo',
        clientVersion: '1.0.0',
      },
      onWebSocketClose: (event) => {
        Logger.write('===MCP_CONNECTION_CLOSED===');
        if (event) Logger.write(JSON.stringify(event));
        VoxEngine.terminate();
      },
    });

    mcpClient.addEventListener(MCP.ServerEvents.MCPError, (event) => {
      Logger.write('===MCP_ERROR===');
      Logger.write(JSON.stringify(event.data));
    });

    mcpClient.addEventListener(MCP.ServerEvents.ConnectorInformation, () => {
      Logger.write('===MCP_CONNECTED===');
      mcpClient.listTools({});
    });

    mcpClient.addEventListener(MCP.ServerEvents.ToolsList, (event) => {
      const payload = event.data && event.data.payload;
      const tools =
        payload && typeof payload === 'object' && 'tools' in payload ? payload.tools : undefined;

      if (!Array.isArray(tools)) return;

      Logger.write('===MCP_TOOLS_LIST===');
      Logger.write(JSON.stringify(tools.map((tool) => tool.name)));

      mcpClient.callTool({
        name: MCP_TOOL_NAME,
        arguments: {
          diceRollExpression: '2d6 + 1d4',
        },
      });
    });

    mcpClient.addEventListener(MCP.ServerEvents.ToolResult, (event) => {
      Logger.write('===MCP_TOOL_RESULT===');
      Logger.write(JSON.stringify(event.data));
      cleanup();
    });
  } catch (error) {
    Logger.write('===MCP_CLIENT_ERROR===');
    Logger.write(error);
    if (mcpClient) mcpClient.close();
    VoxEngine.terminate();
  }
});

```
</Aside>

To connect to an MCP server and interact with its tools:

1. Require the `Modules.MCP` module in your VoxEngine [scenario]().
2. Create an `MCP.Client` instance using `MCP.createClient()` and configure your connection parameters.
3. Call `mcpClient.listTools()` to retrieve the list of available tools exposed by the MCP server.
4. Call `mcpClient.callTool()` to execute a specified tool and receive results back into your scenario.
5. Listen to `MCP.Client` events (via `MCP.ServerEvents`) to handle responses, errors, and tool outputs within your application logic.