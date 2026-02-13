import { ComponentExample } from "@/components/component-example";
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/overview')({
  component: ComponentExample,
})

function RouteComponent() {
  return (
  
  <div>Hello "/overview"!</div>)
}
