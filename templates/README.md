# templates/ — шаблоны для копирования

Эти файлы предназначены для AI-агентов и людей, расширяющих проект.
Каждый шаблон — полный рабочий каркас с TODO-комментариями.

## Содержание

| Файл | Что |
|---|---|
| `connector_template.py` | Новый коннектор-источник (RU госбаза или международный API) |
| `refresh_script_template.py` | Скрипт обновления локального кэша датасета (если источник большой и проще скачать дамп) |
| `react_page_template.tsx` | Новая страница React-фронта с TanStack Query, Layout, UI-каркасом |
| `alembic_migration_template.py` | Миграция БД Alembic |

## Как использовать

```bash
# новый коннектор
cp templates/connector_template.py app/connectors/my_source.py
# далее редактируй и следуй инструкциям внутри файла
```

См. также [`../MODULES.md`](../MODULES.md) и [`../AGENTS.md`](../AGENTS.md).
