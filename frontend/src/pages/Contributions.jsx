import { useQuery } from '@tanstack/react-query';
import { transactionsApi } from '../api/transactions';
import { membersApi } from '../api/members';
import { manualContributionsApi } from '../api/manualContributions';

export default function Contributions() {
  const { data: members } = useQuery({
    queryKey: ['members'],
    queryFn: () => membersApi.list({ per_page: 1000 }),
  });

  // Fetch all transactions (handle pagination)
  const { data: transactionsData, isLoading: transactionsLoading } = useQuery({
    queryKey: ['transactions', 'all'],
    queryFn: async () => {
      let allTransactions = [];
      let page = 1;
      let hasMore = true;
      
      while (hasMore) {
        const response = await transactionsApi.list({ page, per_page: 100 });
        if (response.data && response.data.length > 0) {
          allTransactions = [...allTransactions, ...response.data];
          hasMore = response.next_page_url !== null;
          page++;
        } else {
          hasMore = false;
        }
      }
      
      return { data: allTransactions, total: allTransactions.length };
    },
  });

  // Fetch all manual contributions
  const { data: manualContributionsData, isLoading: manualLoading } = useQuery({
    queryKey: ['manual-contributions', 'all'],
    queryFn: async () => {
      let allContributions = [];
      let page = 1;
      let hasMore = true;
      
      while (hasMore) {
        const response = await manualContributionsApi.list({ page, per_page: 100 });
        if (response.data && response.data.length > 0) {
          allContributions = [...allContributions, ...response.data];
          hasMore = response.next_page_url !== null;
          page++;
        } else {
          hasMore = false;
        }
      }
      
      return { data: allContributions, total: allContributions.length };
    },
  });

  // Calculate contributions per member
  const memberContributions = {};
  const transactionList = transactionsData?.data || [];
  const manualList = manualContributionsData?.data || [];
  const memberList = members?.data || [];
  
  // Add bank statement transactions (only assigned ones)
  if (transactionList.length > 0 && memberList.length > 0) {
    transactionList
      .filter((t) => t.member_id && t.credit > 0 && t.assignment_status !== 'unassigned' && t.assignment_status !== 'draft')
      .forEach((transaction) => {
        const memberId = transaction.member_id;
        if (!memberContributions[memberId]) {
          memberContributions[memberId] = {
            member: memberList.find((m) => m.id === memberId),
            total: 0,
            count: 0,
            transactions: [],
          };
        }
        const creditAmount = parseFloat(transaction.credit) || 0;
        memberContributions[memberId].total += creditAmount;
        memberContributions[memberId].count += 1;
        memberContributions[memberId].transactions.push(transaction);
      });
  }

  // Add manual contributions
  if (manualList.length > 0 && memberList.length > 0) {
    manualList.forEach((contribution) => {
      if (contribution.member_id) {
        const memberId = contribution.member_id;
        if (!memberContributions[memberId]) {
          memberContributions[memberId] = {
            member: memberList.find((m) => m.id === memberId),
            total: 0,
            count: 0,
            transactions: [],
          };
        }
        const amount = parseFloat(contribution.amount) || 0;
        memberContributions[memberId].total += amount;
        memberContributions[memberId].count += 1;
      }
    });
  }

  const contributions = Object.values(memberContributions).sort(
    (a, b) => b.total - a.total
  );

  if (transactionsLoading || manualLoading) {
    return (
      <div className="px-4 py-6 sm:px-0">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Contributions Dashboard</h1>
        <div className="p-8 text-center">Loading contributions...</div>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 sm:px-0">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Contributions Dashboard</h1>
      
      <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
        <p className="text-sm text-blue-800">
          <strong>Total Transactions:</strong> {transactionList.length} | 
          <strong> Assigned:</strong> {transactionList.filter(t => t.member_id && t.assignment_status !== 'unassigned' && t.assignment_status !== 'draft').length} | 
          <strong> Manual Contributions:</strong> {manualList.length}
        </p>
      </div>

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
            {contributions.length > 0 ? (
              contributions.map((contrib) => (
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
              ))
            ) : (
              <tr>
                <td colSpan="4" className="px-6 py-8 text-center text-gray-500">
                  No contributions found. Assign transactions to members to see contributions.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

