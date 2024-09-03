import requests

from app.agents.tools.base import BaseTool, StructuredTool
from app.agents.tools.avis_bot.common import ENDPOINT
from langchain_core.pydantic_v1 import BaseModel, Field


class GetData(BaseModel):
    query: str = Field(description="The data you would like to get, options are ['car_prices', 'locations', 'fleet']\n"
                                   "'car_prices' returns the prices of all of the car groups.\n"
                                   "'locations' returns the main locations Avis operates in.\n"
                                   "'fleet' returns the fleet of Avis's cars.\n")


def get_data(query: str) -> str:
    response = requests.get(f"{ENDPOINT}/get_{query}")

    if response.status_code != 200:
        return "There was an error getting the information, are you sure your query was valid?"

    return response.text


get_data_tool = StructuredTool.from_function(
    func=get_data,
    name="get_data",
    description="Get some data from the server about car prices, locations, and the fleet of cars",
    args_schema=GetData,
)