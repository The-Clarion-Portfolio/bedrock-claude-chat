import requests

from app.agents.tools.base import BaseTool, StructuredTool
from app.agents.tools.avis_bot.common import ENDPOINT
from langchain_core.pydantic_v1 import BaseModel, Field


class BasicInfo(BaseModel):
    session_id: str = Field(description="The current session id, stated at the beginning of the conversation by the system")
    company: str = Field(description="The company the user works for")
    name: str = Field(description="The users full name (first and last name)")
    email: str = Field(description="The users email that they can be reached at (work or personal)")
    phone_no: str = Field(description="The users phone number (work or personal)")
    marketing_consent: bool = Field(description="Whether the user consents to follow up emails or not")
    title: str = Field(description="The users title otherwise known as honorific")
    authorized: bool = Field(description="Whether the user is authorized to sign contracts on behalf of their company")


def basic_info(session_id: str,
               company: str,
               name: str,
               email: str,
               phone_no: str,
               marketing_consent: bool,
               title: str,
               authorized: bool) -> str:
    response = requests.post(f"{ENDPOINT}/basic_info/{session_id}", json={
        "company": company,
        "name": name,
        "email": email,
        "phone_no": phone_no,
        "marketing_consent": marketing_consent,
        "title": title,
        "authorized": authorized
    })

    if response.status_code != 200:
        return "There was an error uploading the information, ask the user to try again later."

    return "Uploaded successfully"


basic_info_tool = StructuredTool.from_function(
    func=basic_info,
    name="basic_info",
    description="Upload the basic customer information to the server",
    args_schema=BasicInfo,
)