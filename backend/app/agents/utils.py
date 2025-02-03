from app.agents.tools.agent_tool import AgentTool
from app.agents.tools.internet_search import internet_search_tool
from app.agents.tools.avis_bot.basic_info import basic_info_tool
from app.agents.tools.avis_bot.finalize_prices import finalize_prices_tool
from app.agents.tools.avis_bot.get_data import get_data_tool
from app.agents.tools.avis_bot.call_back import call_back_tool


def get_available_tools() -> list[AgentTool]:
    tools: list[AgentTool] = []
    tools.append(internet_search_tool)

    return tools


def get_tool_by_name(name: str) -> AgentTool:
    for tool in get_available_tools():
        if tool.name == name:
            return tool
    raise ValueError(f"Tool with name {name} not found")
