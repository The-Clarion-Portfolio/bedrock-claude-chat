import requests

from app.agents.tools.base import BaseTool, StructuredTool
from app.agents.tools.avis_bot.common import ENDPOINT
from langchain_core.pydantic_v1 import BaseModel, Field


class CallBack(BaseModel):
    session_id: str = Field(description="The current session id, stated at the beginning of the conversation by the system")
    name: str = Field(description="The users full name (first and last name)")
    phone_no: str = Field(description="The users phone number (work or personal)")
    question: str = Field(description="The users question or query")


def call_back(session_id: str,
              name: str,
              phone_no: str,
              question: str) -> str:
    response = requests.post(f"{ENDPOINT}/call_back/{session_id}", data={
        "name": name,
        "phone_no": phone_no,
        "question": question
    })

    if response.status_code != 200:
        return "There was an error requesting the callback."

    return response.text


get_data_tool = StructuredTool.from_function(
    func=call_back,
    name="call_back",
    description="Request a call back on behalf of the user",
    args_schema=CallBack,
)