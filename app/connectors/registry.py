from app.connectors.base import SourceConnector
from app.connectors.efrsb import EfrsbConnector
from app.connectors.fssp import FsspConnector
from app.connectors.inn import InnValidatorConnector
from app.connectors.npd import SelfEmployedConnector
from app.connectors.opensanctions import OpenSanctionsConnector
from app.connectors.passport_mvd import PassportMvdConnector
from app.connectors.rdl import RdlConnector
from app.connectors.rosfinmon import RosfinmonConnector


def all_connectors() -> list[SourceConnector]:
    return [
        InnValidatorConnector(),
        SelfEmployedConnector(),
        RdlConnector(),
        EfrsbConnector(),
        FsspConnector(),
        RosfinmonConnector(),
        OpenSanctionsConnector(),
        PassportMvdConnector(),
    ]


def get_by_key(key: str) -> SourceConnector | None:
    for c in all_connectors():
        if c.key == key:
            return c
    return None
