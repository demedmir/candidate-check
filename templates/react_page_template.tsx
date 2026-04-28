/**
 * TEMPLATE: новая страница приложения.
 *
 * ШАГИ:
 * 1. Скопируй файл в frontend/src/pages/<page-name>.tsx
 * 2. Замени TODO на реальные данные.
 * 3. Добавь маршрут в frontend/src/App.tsx:
 *      <Route path="/your-path" element={<YourPage />} />
 * 4. Добавь ссылку в Sidebar (frontend/src/components/layout.tsx, NAV).
 * 5. Если нужно: добавь типы в frontend/src/lib/api.ts и endpoint в backend.
 *
 * ПРАВИЛА:
 * - Импортируй UI-компоненты из `@/components/ui/*` — НЕ создавай свои стили.
 * - Используй TanStack Query (`useQuery`/`useMutation`) — никаких useEffect+fetch.
 * - Toasts — через `import { toast } from "sonner";`.
 * - Loading — через <Skeleton>, empty — через <Empty>.
 * - PageHeader + PageBody — каркас страницы.
 */
import { useQuery } from "@tanstack/react-query";
import { Activity, Plus } from "lucide-react";
import { api } from "@/lib/api";
import { PageBody, PageHeader } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Empty } from "@/components/ui/empty";

// TODO: тип данных страницы (вынести в @/lib/api.ts если переиспользуется)
type Item = { id: number; name: string };

export function TemplatePage() {
  const { data, isLoading } = useQuery({
    queryKey: ["template-items"],
    queryFn: async () => (await api.get<Item[]>("/TODO")).data, // TODO: endpoint
  });

  return (
    <>
      <PageHeader
        eyebrow="TODO раздел"
        title="TODO: заголовок"
        description="TODO: подзаголовок"
        actions={
          <Button variant="primary">
            <Plus size={16} /> Добавить
          </Button>
        }
      />
      <PageBody>
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </div>
        ) : !data?.length ? (
          <Empty
            icon={Activity}
            title="Пока нет данных"
            description="TODO: подсказка пользователю"
          />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Всего: {data.length}</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="divide-y divide-[hsl(var(--border))]">
                {data.map((item) => (
                  <li key={item.id} className="py-2 text-sm">
                    {item.name}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </PageBody>
    </>
  );
}
