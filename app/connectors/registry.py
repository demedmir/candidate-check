from app.connectors.base import SourceConnector
from app.connectors.inn import InnValidatorConnector
from app.connectors.npd import SelfEmployedConnector


def all_connectors() -> list[SourceConnector]:
    return [
        InnValidatorConnector(),
        SelfEmployedConnector(),
    ]
