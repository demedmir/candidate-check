from app.connectors.base import ConnectorOutcome
from app.models import Candidate


def validate_inn(inn: str) -> tuple[bool, str]:
    inn = inn.strip()
    if not inn.isdigit():
        return False, "ИНН должен состоять только из цифр"
    if len(inn) == 12:
        coef1 = [7, 2, 4, 10, 3, 5, 9, 4, 1, 3]
        coef2 = [3, 7, 2, 4, 10, 3, 5, 9, 4, 1, 3]
        d1 = sum(int(inn[i]) * coef1[i] for i in range(10)) % 11 % 10
        d2 = sum(int(inn[i]) * coef2[i] for i in range(11)) % 11 % 10
        if d1 == int(inn[10]) and d2 == int(inn[11]):
            return True, "ИНН ФЛ валиден (контрольные суммы сошлись)"
        return False, "Контрольные суммы ИНН ФЛ не сошлись"
    if len(inn) == 10:
        coef = [2, 4, 10, 3, 5, 9, 4, 1, 3]
        d = sum(int(inn[i]) * coef[i] for i in range(9)) % 11 % 10
        if d == int(inn[9]):
            return True, "ИНН ЮЛ валиден (структурно)"
        return False, "Контрольная сумма ИНН ЮЛ не сошлась"
    return False, f"Неверная длина ИНН: {len(inn)}"


class InnValidatorConnector:
    key = "inn_checksum"
    title = "ИНН — контрольная сумма"

    async def run(self, candidate: Candidate) -> ConnectorOutcome:
        if not candidate.inn:
            return ConnectorOutcome(
                status="warning",
                summary="ИНН не указан — проверка пропущена",
                payload={"reason": "no_inn"},
            )
        ok, msg = validate_inn(candidate.inn)
        return ConnectorOutcome(
            status="ok" if ok else "fail",
            summary=msg,
            payload={"inn": candidate.inn, "valid": ok},
        )
