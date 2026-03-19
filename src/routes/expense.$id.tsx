import { Wrapper } from '@/components/Wrapper';
import { useGetExpense } from '@/hooks/useApi';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/expense/$id')({
  component: RouteComponent,
})

function RouteComponent() {
  const { id } = Route.useParams();

  const { data: expense, isLoading } = useGetExpense(id);

  return (
    isLoading ? (
      <Wrapper>
        <p>Loading...</p>
      </Wrapper>
    ) : (
      <>
        <Wrapper>
          <h1>
            {expense?.title}
          </h1>
        </Wrapper>
      </>
    )
  )
}
