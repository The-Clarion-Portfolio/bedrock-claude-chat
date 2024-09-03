from app.agents.langchain import BedrockLLM
from app.agents.tools.base import BaseTool
from app.agents.tools.internet_search import internet_search_tool
from app.agents.tools.avis_bot.basic_info import basic_info_tool
from app.agents.tools.avis_bot.finalize_prices import finalize_prices_tool
from app.agents.tools.avis_bot.get_data import get_data_tool
from app.agents.tools.avis_bot.call_back import call_back_tool


def get_available_tools() -> list[BaseTool]:
    tools: list[BaseTool] = [
        internet_search_tool,
        basic_info_tool,
        finalize_prices_tool,
        get_data_tool,
        call_back_tool,
    ]
    return tools


def get_tool_by_name(name: str) -> BaseTool:
    for tool in get_available_tools():
        if tool.name == name:
            return tool
    raise ValueError(f"Tool with name {name} not found")
