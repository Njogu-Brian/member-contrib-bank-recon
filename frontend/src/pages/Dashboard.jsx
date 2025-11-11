import { useQuery } from '@tanstack/react-query';
import { statementsApi } from '../api/statements';
import { transactionsApi } from '../api/transactions';
import { membersApi } from '../api/members';
import { manualContributionsApi } from '../api/manualContributions';
import { settingsApi } from '../api/settings';

export default function Dashboard() {
  const { data: statements } = useQuery({
    queryKey: ['statements'],
    queryFn: () => statementsApi.list({ per_page: 5 }),
  });

  // Fetch all transactions for accurate stats
  const { data: allTransactionsData } = useQuery({
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
      
      return { data: allTransactions };
    },
  });

  const { data: transactions } = useQuery({
    queryKey: ['transactions', 'recent'],
    queryFn: () => transactionsApi.list({ per_page: 10 }),
  });

  const { data: members } = useQuery({
    queryKey: ['members'],
    queryFn: () => membersApi.list({ per_page: 1000 }),
  });

  const { data: manualContributions } = useQuery({
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
      
      return { data: allContributions };
    },
  });

  const { data: weekData } = useQuery({
    queryKey: ['settings', 'current-week'],
    queryFn: () => settingsApi.getCurrentWeek(),
  });

  const allTransactions = allTransactionsData?.data || [];
  const assignedTransactions = allTransactions.filter(t => 
    t.member_id && t.credit > 0 && t.assignment_status !== 'unassigned' && t.assignment_status !== 'draft'
  );
  const totalContributions = assignedTransactions.reduce((sum, t) => sum + (parseFloat(t.credit) || 0), 0) +
    (manualContributions?.data?.reduce((sum, c) => sum + (parseFloat(c.amount) || 0), 0) || 0);

  // Calculate contributions by week
  const contributionsByWeek = {};
  const startDate = weekData?.start_date ? new Date(weekData.start_date) : null;
  
  if (startDate) {
    [...assignedTransactions, ...(manualContributions?.data || [])].forEach((item) => {
      const date = new Date(item.tran_date || item.contribution_date);
      const weeksSinceStart = Math.floor((date - startDate) / (7 * 24 * 60 * 60 * 1000)) + 1;
      if (weeksSinceStart > 0) {
        if (!contributionsByWeek[weeksSinceStart]) {
          contributionsByWeek[weeksSinceStart] = 0;
        }
        contributionsByWeek[weeksSinceStart] += parseFloat(item.credit || item.amount) || 0;
      }
    });
  }

  // Calculate contributions by month
  const contributionsByMonth = {};
  [...assignedTransactions, ...(manualContributions?.data || [])].forEach((item) => {
    const date = new Date(item.tran_date || item.contribution_date);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    if (!contributionsByMonth[monthKey]) {
      contributionsByMonth[monthKey] = 0;
    }
    contributionsByMonth[monthKey] += parseFloat(item.credit || item.amount) || 0;
  });

  const weekLabels = Object.keys(contributionsByWeek).sort((a, b) => parseInt(a) - parseInt(b)).slice(-12);
  const monthLabels = Object.keys(contributionsByMonth).sort().slice(-6);
  const maxWeekValue = Math.max(...Object.values(contributionsByWeek), 1);
  const maxMonthValue = Math.max(...Object.values(contributionsByMonth), 1);

  const stats = [
    {
      name: 'Total Members',
      value: members?.total || 0,
      color: 'bg-blue-500',
    },
    {
      name: 'Unassigned Transactions',
      value: allTransactions.filter((t) => t.assignment_status === 'unassigned').length,
      color: 'bg-yellow-500',
    },
    {
      name: 'Draft Assignments',
      value: allTransactions.filter((t) => t.assignment_status === 'draft').length,
      color: 'bg-orange-500',
    },
    {
      name: 'Auto-Assigned',
      value: allTransactions.filter((t) => t.assignment_status === 'auto_assigned').length,
      color: 'bg-green-500',
    },
    {
      name: 'Total Contributions',
      value: `KES ${totalContributions.toLocaleString()}`,
      color: 'bg-purple-500',
    },
    {
      name: 'Statements Processed',
      value: statements?.total || 0,
      color: 'bg-indigo-500',
    },
  ];

  return (
    <div className="px-4 py-6 sm:px-0">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 mb-8">
        {stats.map((stat) => (
          <div key={stat.name} className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-4">
              <div className="flex flex-col">
                <div className="text-xs font-medium text-gray-500 mb-2 leading-tight">{stat.name}</div>
                <div className={`${stat.color} rounded-md p-3 text-center min-h-[60px] flex items-center justify-center`}>
                  <div className="text-white text-xl font-bold break-words">{stat.value}</div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 mb-6">
        {/* Contributions by Week */}
        {weekLabels.length > 0 && (
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Contributions by Week (Last 12 Weeks)</h3>
            <div className="space-y-3">
              {weekLabels.map((week) => {
                const value = contributionsByWeek[week] || 0;
                const percentage = maxWeekValue > 0 ? (value / maxWeekValue) * 100 : 0;
                return (
                  <div key={week} className="flex items-center gap-3">
                    <div className="w-20 text-sm text-gray-700 font-medium flex-shrink-0">Week {week}</div>
                    <div className="flex-1 bg-gray-200 rounded-full h-8 relative overflow-hidden">
                      <div
                        className="bg-blue-600 h-8 rounded-full flex items-center justify-end pr-3 transition-all duration-300"
                        style={{ width: `${Math.max(percentage, value > 0 ? 5 : 0)}%` }}
                      >
                        {value > 0 && percentage > 15 && (
                          <span className="text-xs text-white font-semibold whitespace-nowrap">
                            KES {value.toLocaleString()}
                          </span>
                        )}
                      </div>
                      {value > 0 && percentage <= 15 && (
                        <span className="absolute right-2 top-1/2 transform -translate-y-1/2 text-xs text-gray-700 font-semibold">
                          KES {value.toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Contributions by Month */}
        {monthLabels.length > 0 && (
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Contributions by Month (Last 6 Months)</h3>
            <div className="space-y-3">
              {monthLabels.map((month) => {
                const value = contributionsByMonth[month] || 0;
                const percentage = maxMonthValue > 0 ? (value / maxMonthValue) * 100 : 0;
                const date = new Date(month + '-01');
                const monthName = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
                return (
                  <div key={month} className="flex items-center gap-3">
                    <div className="w-28 text-sm text-gray-700 font-medium flex-shrink-0">{monthName}</div>
                    <div className="flex-1 bg-gray-200 rounded-full h-8 relative overflow-hidden">
                      <div
                        className="bg-green-600 h-8 rounded-full flex items-center justify-end pr-3 transition-all duration-300"
                        style={{ width: `${Math.max(percentage, value > 0 ? 5 : 0)}%` }}
                      >
                        {value > 0 && percentage > 15 && (
                          <span className="text-xs text-white font-semibold whitespace-nowrap">
                            KES {value.toLocaleString()}
                          </span>
                        )}
                      </div>
                      {value > 0 && percentage <= 15 && (
                        <span className="absolute right-2 top-1/2 transform -translate-y-1/2 text-xs text-gray-700 font-semibold">
                          KES {value.toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Recent Transactions</h3>
            <div className="space-y-3">
              {transactions?.data && transactions.data.length > 0 ? (
                transactions.data.slice(0, 5).map((transaction) => {
                const getStatusLabel = (status) => {
                  const statusMap = {
                    'auto_assigned': 'Auto-Assigned',
                    'manual_assigned': 'Manual',
                    'draft': 'Draft',
                    'unassigned': 'Unassigned',
                    'flagged': 'Flagged'
                  };
                  return statusMap[status] || status;
                };

                const getStatusColor = (status) => {
                  if (status === 'auto_assigned') return 'bg-green-100 text-green-800';
                  if (status === 'manual_assigned') return 'bg-blue-100 text-blue-800';
                  if (status === 'draft') return 'bg-orange-100 text-orange-800';
                  if (status === 'flagged') return 'bg-red-100 text-red-800';
                  return 'bg-gray-100 text-gray-800';
                };

                return (
                  <div key={transaction.id} className="flex justify-between items-start border-b pb-3 last:border-b-0">
                    <div className="flex-1 min-w-0 pr-4">
                      <p className="text-sm font-medium text-gray-900 break-words" title={transaction.particulars}>
                        {transaction.particulars?.length > 60 
                          ? transaction.particulars.substring(0, 60) + '...' 
                          : transaction.particulars}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(transaction.tran_date).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-medium text-green-600 whitespace-nowrap">
                        KES {transaction.credit?.toLocaleString()}
                      </p>
                      <span className={`inline-block text-xs px-2 py-1 rounded mt-1 whitespace-nowrap ${getStatusColor(transaction.assignment_status)}`}>
                        {getStatusLabel(transaction.assignment_status)}
                      </span>
                    </div>
                  </div>
                );
              })
              ) : (
                <p className="text-sm text-gray-500 text-center py-4">No transactions found</p>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Recent Statements</h3>
            <div className="space-y-3">
              {statements?.data && statements.data.length > 0 ? (
                statements.data.map((statement) => {
                  const getStatusLabel = (status) => {
                    const statusMap = {
                      'completed': 'Completed',
                      'processing': 'Processing',
                      'failed': 'Failed',
                      'uploaded': 'Uploaded'
                    };
                    return statusMap[status] || status;
                  };

                  return (
                    <div key={statement.id} className="flex justify-between items-start border-b pb-3 last:border-b-0">
                      <div className="flex-1 min-w-0 pr-4">
                        <p className="text-sm font-medium text-gray-900 break-words">{statement.filename}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(statement.created_at).toLocaleDateString()}
                        </p>
                        {statement.status === 'failed' && statement.error_message && (
                          <p className="text-xs text-red-600 mt-1 break-words" title={statement.error_message}>
                            Error: {statement.error_message.length > 60 
                              ? statement.error_message.substring(0, 60) + '...' 
                              : statement.error_message}
                          </p>
                        )}
                      </div>
                      <span className={`inline-block text-xs px-2 py-1 rounded whitespace-nowrap flex-shrink-0 ${
                        statement.status === 'completed' ? 'bg-green-100 text-green-800' :
                        statement.status === 'processing' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {getStatusLabel(statement.status)}
                      </span>
                    </div>
                  );
                })
              ) : (
                <p className="text-sm text-gray-500 text-center py-4">No statements found</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

