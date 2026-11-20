import os
import asyncio
from typing import Annotated, Optional

import httpx

from line.llm_agent import LlmAgent
from line.llm_agent.config import LlmConfig
from line.events import AgentEndCall, AgentSendText
from line.llm_agent.tools.decorators import passthrough_tool
from line.llm_agent.tools.utils import ToolEnv
from line.voice_agent_app import AgentEnv, CallRequest, VoiceAgentApp


DEFAULT_SYSTEM_PROMPT = """\
You are a helpful voice agent running on Cartesia Line, connected to a phone call via Voximplant.

This demo has a very simple call transfer:
1) If the caller asks for Voxy or a human, call call_transfer(summary=...).
2) The call_transfer tool will speak the transfer confirmation to the caller.
3) Do not continue the conversation after calling call_transfer.

Ending the call:
- If the caller asks to hang up or says goodbye, say a short goodbye and then call end_call().

Be concise, polite, and ask one question at a time.
"""

DEFAULT_INTRODUCTION = "Hi, this is Voximplant Voice AI powered by Cartesia Line. How can I help?"


async def _post_vox_control(
    url: str,
    payload: dict,
    *,
    timeout_s: float = 3.0,
) -> dict:
    """Send a POST request to the given URL with the provided payload."""
    try:
        async with httpx.AsyncClient(timeout=timeout_s) as client:
            response = await client.post(url, json=payload)
            try:
                return response.json()
            except Exception:
                return {"status_code": response.status_code, "text": response.text}
    except Exception:
        return {"error": "request_failed"}


async def get_agent(env: AgentEnv, request: CallRequest):
    # Extract the Voximplant control URL from the request metadata, if present and valid.
    vox_control_url: Optional[str] = None
    if request.metadata and isinstance(request.metadata, dict):
        raw = request.metadata.get("vox_session_control_url")
        if isinstance(raw, str) and raw.startswith("https://"):
            vox_control_url = raw

    if not vox_control_url:
        return {
            "error": "missing_vox_control_url",
            "message": "The call request is missing a valid 'vox_session_control_url' in its metadata.",
        }

    @passthrough_tool
    async def call_transfer(
        ctx: ToolEnv,
        summary: Annotated[
            str,
            "Optional short transfer summary (for logs / analytics). Voximplant will receive it.",
        ] = "",
    ):
        """Request Voximplant to transfer the call to a human (Voximplant performs the telephony actions).
           Speak first so the caller reliably hears the transfer confirmation before Voximplant
           detaches the agent audio and bridges to PSTN.
        """
        yield AgentSendText(text="Sure. One moment, I'm transferring you to a human now.")

        async def _do_transfer():
            # Give TTS time to play before Voximplant starts tearing down the agent bridge.
            # use line.events.AgentTurnEnded to be more precise
            await asyncio.sleep(5.0)
            await _post_vox_control(
                vox_control_url,
                {"action": "call_transfer", "summary": summary},
                timeout_s=10.0,
            )

        asyncio.create_task(_do_transfer())

    @passthrough_tool
    async def end_call(ctx: ToolEnv):
        """End the call."""
        yield AgentEndCall()
        # Give TTS time to play before Voximplant starts tearing down the agent bridge.
        # use line.events.AgentTurnEnded to be more precise
        await asyncio.sleep(3.0)
        await _post_vox_control(vox_control_url, {"action": "end_call"})

    agent = LlmAgent(
        model="gpt-5-nano",
        api_key=os.getenv("OPENAI_API_KEY", ""),
        tools=[end_call, call_transfer],
        config=LlmConfig(
            system_prompt=DEFAULT_SYSTEM_PROMPT,  # use request.agent.system_prompt for the GUI version
            introduction=DEFAULT_INTRODUCTION,    # use request.agent.introduction for the GUI version
        ),
    )

    return agent


voice_agent_app = VoiceAgentApp(get_agent=get_agent)
app = voice_agent_app.fastapi_app


if __name__ == "__main__":
    # Local dev only. Cartesia runs this as a web service in the cloud.
    voice_agent_app.run()
