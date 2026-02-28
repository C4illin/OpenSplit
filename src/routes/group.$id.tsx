import type { CardHeader } from '@/components/ui/card';
import { createFileRoute, redirect } from '@tanstack/react-router';
import { pb } from '../lib/pocketbase';

export const Route = createFileRoute('/group/$id')({
  beforeLoad: () => {
    if (!pb.authStore.isValid) {
      throw redirect({ to: '/' });
    }
  },
  component: RouteComponent,
})


// const expenseCard = ({ title, amount,paidBy}) => {
//   return (
//     <Card className="w-full max-w-sm">
//       <CardHeader>
//         <CardTitle>Expense Title</CardTitle>
//       </CardHeader>
//       <CardContent>
//         <p>Amount: $100</p>

//         <div>
//           <p>Paid by: John Doe</p>
//         </div>
//       </CardContent>
//     </Card>
//   )
// }

function RouteComponent() {
  return <div>Hello "/group/$id"!</div>
}
