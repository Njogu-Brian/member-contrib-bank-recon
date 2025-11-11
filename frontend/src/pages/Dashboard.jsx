import { useQuery } from '@tanstack/react-query';
import { statementsApi } from '../api/statements';
import { transactionsApi } from '../api/transactions';
import { membersApi } from '../api/members';

export default function Dashboard() {
  const { data: statements } = useQuery({
    queryKey: ['statements'],
    queryFn: () => statementsApi.list({ per_page: 5 }),
  });

  const { data: transactions } = useQuery({
    queryKey: ['transactions', 'recent'],
    queryFn: () => transactionsApi.list({ per_page: 10 }),
  });

  const { data: members } = useQuery({
    queryKey: ['members'],
    queryFn: () => membersApi.list({ per_page: 100 }),
  });

  const stats = [
    {
      name: 'Total Members',
      value: members?.total || 0,
      color: 'bg-blue-500',
    },
    {
      name: 'Unassigned Transactions',
      value: transactions?.data?.filter((t) => t.assignment_status === 'unassigned').length || 0,
      color: 'bg-yellow-500',
    },
    {
      name: 'Auto-Assigned',
      value: transactions?.data?.filter((t) => t.assignment_status === 'auto_assigned').length || 0,
      color: 'bg-green-500',
    },
    {
      name: 'Statements Processed',
      value: statements?.total || 0,
      color: 'bg-purple-500',
    },
  ];

  return (
    <div className="px-4 py-6 sm:px-0">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        {stats.map((stat) => (
          <div key={stat.name} className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className={`${stat.color} rounded-md p-3`}>
                  <div className="text-white text-2xl font-bold">{stat.value}</div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">{stat.name}</dt>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Recent Transactions</h3>
            <div className="space-y-3">
              {transactions?.data?.slice(0, 5).map((transaction) => (
                <div key={transaction.id} className="flex justify-between items-center border-b pb-2">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{transaction.particulars?.substring(0, 40)}...</p>
                    <p className="text-xs text-gray-500">{transaction.tran_date}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-green-600">KES {transaction.credit?.toLocaleString()}</p>
                    <span className={`text-xs px-2 py-1 rounded ${
                      transaction.assignment_status === 'auto_assigned' ? 'bg-green-100 text-green-800' :
                      transaction.assignment_status === 'manual_assigned' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {transaction.assignment_status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Recent Statements</h3>
            <div className="space-y-3">
              {statements?.data?.map((statement) => (
                <div key={statement.id} className="flex justify-between items-center border-b pb-2">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{statement.filename}</p>
                    <p className="text-xs text-gray-500">{new Date(statement.created_at).toLocaleDateString()}</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded ${
                    statement.status === 'completed' ? 'bg-green-100 text-green-800' :
                    statement.status === 'processing' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {statement.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

