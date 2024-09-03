import requests

from app.agents.tools.base import BaseTool, StructuredTool
from app.agents.tools.avis_bot.common import ENDPOINT
from langchain_core.pydantic_v1 import BaseModel, Field


class FinalizePrices(BaseModel):
    session_id: str = Field(description="The current session id, stated at the beginning of the conversation by the system")
    car_group: str = Field(description="The negotiated car group")
    price: float = Field(description="The price of the negotiated car group")


def finalize_prices(session_id: str,
                    car_group: str,
                    price: float) -> str:
    response = requests.post(f"{ENDPOINT}/finalize_prices/{session_id}", json={
        "car_group": car_group,
        "price": price
    })

    if response.status_code != 200:
        return "There was an error uploading the information, ask the user to try again later."

    return "Uploaded successfully"


finalize_prices_tool = StructuredTool.from_function(
    func=finalize_prices,
    name="finalize_prices",
    description="Upload the negotiated price to the server and generate the contract",
    args_schema=FinalizePrices,
)