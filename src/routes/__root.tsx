import { TanStackDevtools } from '@tanstack/react-devtools'
import { formDevtoolsPlugin } from '@tanstack/react-form-devtools'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtoolsPanel } from '@tanstack/react-query-devtools'
import { Outlet, createRootRoute } from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'

const queryClient = new QueryClient()

export const Route = createRootRoute({
  component: RootComponent,
})

function RootComponent() {
  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
      <TanStackDevtools plugins={[
        formDevtoolsPlugin(),
        {
          name: 'TanStack Query',
          render: <ReactQueryDevtoolsPanel />,
          defaultOpen: true
        },
        {
          name: 'TanStack Router',
          render: <TanStackRouterDevtoolsPanel />,
          defaultOpen: false
        }
      ]} />
    </QueryClientProvider>
  )
}