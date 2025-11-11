import { useQuery } from '@tanstack/react-query';
import { transactionsApi } from '../api/transactions';
import { membersApi } from '../api/members';

export default function Contributions() {
  const { data: members } = useQuery({
    queryKey: ['members'],
    queryFn: () => membersApi.list({ per_page: 1000 }),
  });

  const { data: transactions } = useQuery({
    queryKey: ['transactions'],
    queryFn: () => transactionsApi.list({ per_page: 10000 }),
  });

  // Calculate contributions per member
  const memberContributions = {};
  if (transactions?.data && members?.data) {
    transactions.data
      .filter((t) => t.member_id && t.credit > 0)
      .forEach((transaction) => {
        if (!memberContributions[transaction.member_id]) {
          memberContributions[transaction.member_id] = {
            member: members.data.find((m) => m.id === transaction.member_id),
            total: 0,
            count: 0,
            transactions: [],
          };
        }
        memberContributions[transaction.member_id].total += transaction.credit;
        memberContributions[transaction.member_id].count += 1;
        memberContributions[transaction.member_id].transactions.push(transaction);
      });
  }

  const contributions = Object.values(memberContributions).sort(
    (a, b) => b.total - a.total
  );

  return (
    <div className="px-4 py-6 sm:px-0">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Contributions Dashboard</h1>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Member
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Total Contributions
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Transaction Count
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Average
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {contributions.map((contrib) => (
              <tr key={contrib.member?.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {contrib.member?.name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  KES {contrib.total.toLocaleString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {contrib.count}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  KES {Math.round(contrib.total / contrib.count).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

