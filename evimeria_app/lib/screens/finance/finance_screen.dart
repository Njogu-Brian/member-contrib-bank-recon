import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../models/budget.dart';
import '../../models/expense.dart';
import '../../providers/budget_provider.dart';
import '../../providers/expense_provider.dart';
import '../../widgets/loading_overlay.dart';

class FinanceScreen extends ConsumerStatefulWidget {
  const FinanceScreen({super.key});

  @override
  ConsumerState<FinanceScreen> createState() => _FinanceScreenState();
}

class _FinanceScreenState extends ConsumerState<FinanceScreen>
    with SingleTickerProviderStateMixin {
  @override
  Widget build(BuildContext context) {
    return DefaultTabController(
      length: 2,
      child: Scaffold(
        appBar: AppBar(
          title: const Text('Finance (Expenses & Budgets)'),
          bottom: const TabBar(
            tabs: [
              Tab(text: 'Expenses'),
              Tab(text: 'Budgets'),
            ],
          ),
        ),
        body: const TabBarView(
          children: [
            _ExpensesTab(),
            _BudgetsTab(),
          ],
        ),
      ),
    );
  }
}

class _ExpensesTab extends ConsumerWidget {
  const _ExpensesTab();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(expenseProvider);
    final notifier = ref.read(expenseProvider.notifier);
    final formatter = NumberFormat.currency(symbol: 'KES ');

    return LoadingOverlay(
      isLoading: state.isLoading,
      child: RefreshIndicator(
        onRefresh: notifier.refresh,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            Align(
              alignment: Alignment.centerRight,
              child: FilledButton.icon(
                onPressed: () => _openExpenseSheet(context, ref),
                icon: const Icon(Icons.add),
                label: const Text('Add expense'),
              ),
            ),
            const SizedBox(height: 12),
            if (state.expenses.isEmpty)
              const Card(
                child: Padding(
                  padding: EdgeInsets.all(24),
                  child: Text('No expenses recorded for this period.'),
                ),
              )
            else
              ...state.expenses.map(
                (expense) => Card(
                  child: ListTile(
                    leading: CircleAvatar(
                      backgroundColor: Colors.redAccent.withValues(alpha: .15),
                      foregroundColor: Colors.redAccent,
                      child: const Icon(Icons.money_off_outlined),
                    ),
                    title: Text('${expense.category} • ${formatter.format(expense.amount)}'),
                    subtitle: Text(
                      [
                        expense.description ?? 'No description',
                        if (expense.incurredOn != null)
                          DateFormat('dd MMM yyyy').format(expense.incurredOn!),
                      ].join(' • '),
                    ),
                    trailing: PopupMenuButton<String>(
                      onSelected: (value) {
                        if (value == 'edit') {
                          _openExpenseSheet(context, ref, existing: expense);
                        } else if (value == 'delete') {
                          notifier.deleteExpense(expense.id);
                        }
                      },
                      itemBuilder: (context) => const [
                        PopupMenuItem(value: 'edit', child: Text('Edit')),
                        PopupMenuItem(
                          value: 'delete',
                          child: Text('Delete', style: TextStyle(color: Colors.red)),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }

  Future<void> _openExpenseSheet(
    BuildContext context,
    WidgetRef ref, {
    Expense? existing,
  }) async {
    return showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      builder: (context) => ExpenseFormSheet(existing: existing),
    );
  }
}

class ExpenseFormSheet extends ConsumerStatefulWidget {
  const ExpenseFormSheet({super.key, this.existing});

  final Expense? existing;

  @override
  ConsumerState<ExpenseFormSheet> createState() => _ExpenseFormSheetState();
}

class _ExpenseFormSheetState extends ConsumerState<ExpenseFormSheet> {
  late final TextEditingController _categoryController;
  late final TextEditingController _amountController;
  late final TextEditingController _descriptionController;
  DateTime? _incurredOn;
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    _categoryController =
        TextEditingController(text: widget.existing?.category ?? '');
    _amountController = TextEditingController(
      text: widget.existing?.amount.toStringAsFixed(2) ?? '',
    );
    _descriptionController =
        TextEditingController(text: widget.existing?.description ?? '');
    _incurredOn = widget.existing?.incurredOn ?? DateTime.now();
  }

  @override
  void dispose() {
    _categoryController.dispose();
    _amountController.dispose();
    _descriptionController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final notifier = ref.read(expenseProvider.notifier);
    return Padding(
      padding: EdgeInsets.only(
        left: 16,
        right: 16,
        top: 24,
        bottom: MediaQuery.of(context).viewInsets.bottom + 24,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            widget.existing == null ? 'Add expense' : 'Update expense',
            style: Theme.of(context).textTheme.titleLarge,
          ),
          const SizedBox(height: 16),
          TextField(
            controller: _categoryController,
            decoration: const InputDecoration(labelText: 'Category'),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _amountController,
            keyboardType: TextInputType.number,
            decoration: const InputDecoration(labelText: 'Amount (KES)'),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _descriptionController,
            decoration: const InputDecoration(labelText: 'Description'),
            minLines: 2,
            maxLines: 4,
          ),
          const SizedBox(height: 12),
          Align(
            alignment: Alignment.centerLeft,
            child: TextButton.icon(
              onPressed: () async {
                final picked = await showDatePicker(
                  context: context,
                  initialDate: _incurredOn ?? DateTime.now(),
                  firstDate: DateTime(DateTime.now().year - 1),
                  lastDate: DateTime(DateTime.now().year + 1),
                );
                if (picked != null) {
                  setState(() => _incurredOn = picked);
                }
              },
              icon: const Icon(Icons.calendar_today_outlined),
              label: Text(
                _incurredOn == null
                    ? 'Select date'
                    : DateFormat('dd MMM yyyy').format(_incurredOn!),
              ),
            ),
          ),
          const SizedBox(height: 16),
          SizedBox(
            width: double.infinity,
            child: FilledButton(
              onPressed: _saving
                  ? null
                  : () async {
                      final navigator = Navigator.of(context);
                      setState(() => _saving = true);
                      final payload = {
                        'category': _categoryController.text.trim(),
                        'amount':
                            double.tryParse(_amountController.text.trim()) ?? 0,
                        'description': _descriptionController.text.trim(),
                        if (_incurredOn != null)
                          'incurred_on': _incurredOn!.toIso8601String(),
                      };
                      await notifier.saveExpense(
                        existing: widget.existing,
                        payload: payload,
                      );
                      if (!mounted) return;
                      navigator.pop();
                    },
              child: Text(_saving ? 'Saving...' : 'Save expense'),
            ),
          ),
        ],
      ),
    );
  }
}

class _BudgetsTab extends ConsumerWidget {
  const _BudgetsTab();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(budgetProvider);
    final notifier = ref.read(budgetProvider.notifier);

    return LoadingOverlay(
      isLoading: state.isLoading,
      child: RefreshIndicator(
        onRefresh: notifier.refresh,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            Align(
              alignment: Alignment.centerRight,
              child: FilledButton.icon(
                onPressed: () => _openBudgetSheet(context, ref),
                icon: const Icon(Icons.add_chart),
                label: const Text('New budget'),
              ),
            ),
            const SizedBox(height: 12),
            if (state.budgets.isEmpty)
              const Card(
                child: Padding(
                  padding: EdgeInsets.all(24),
                  child: Text('Create your first budget to start tracking.'),
                ),
              )
            else
              ...state.budgets.map(
                (budget) => Card(
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Expanded(
                              child: Text(
                                budget.name,
                                style: Theme.of(context).textTheme.titleMedium,
                              ),
                            ),
                            Text(
                              'KES ${budget.spent.toStringAsFixed(0)} / ${budget.total.toStringAsFixed(0)}',
                              style: const TextStyle(fontWeight: FontWeight.bold),
                            ),
                          ],
                        ),
                        const SizedBox(height: 8),
                        LinearProgressIndicator(
                          value: budget.utilization,
                          backgroundColor: Colors.grey[200],
                          minHeight: 10,
                        ),
                        const SizedBox(height: 12),
                        Text(
                          'Monthly allocation',
                          style: Theme.of(context).textTheme.labelLarge,
                        ),
                        const SizedBox(height: 8),
                        ...budget.months.map(
                          (month) => ListTile(
                            contentPadding: EdgeInsets.zero,
                            title: Text(month.label),
                            subtitle: LinearProgressIndicator(
                              value: month.utilization,
                              backgroundColor: Colors.grey[300],
                              minHeight: 6,
                            ),
                            trailing: Text(
                              'KES ${month.spent.toStringAsFixed(0)} / ${month.allocated.toStringAsFixed(0)}',
                            ),
                            onTap: () => _openMonthDialog(
                              context,
                              ref,
                              budget,
                              month,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }

  Future<void> _openBudgetSheet(BuildContext context, WidgetRef ref,
      {Budget? existing}) {
    return showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      builder: (context) => BudgetFormSheet(existing: existing),
    );
  }

  Future<void> _openMonthDialog(
    BuildContext context,
    WidgetRef ref,
    Budget budget,
    BudgetMonth month,
  ) {
    final controller =
        TextEditingController(text: month.allocated.toStringAsFixed(2));
    return showDialog<void>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('Adjust ${month.label} allocation'),
        content: TextField(
          controller: controller,
          keyboardType: TextInputType.number,
          decoration: const InputDecoration(labelText: 'Amount (KES)'),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
          FilledButton(
            onPressed: () async {
              final amount = double.tryParse(controller.text.trim()) ?? month.allocated;
              await ref
                  .read(budgetProvider.notifier)
                  .updateMonth(budget, month, amount);
              if (context.mounted) Navigator.pop(context);
            },
            child: const Text('Save'),
          ),
        ],
      ),
    );
  }
}

class BudgetFormSheet extends ConsumerStatefulWidget {
  const BudgetFormSheet({super.key, this.existing});

  final Budget? existing;

  @override
  ConsumerState<BudgetFormSheet> createState() => _BudgetFormSheetState();
}

class _BudgetFormSheetState extends ConsumerState<BudgetFormSheet> {
  late final TextEditingController _nameController;
  late final TextEditingController _amountController;
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    _nameController = TextEditingController(text: widget.existing?.name ?? '');
    _amountController = TextEditingController(
      text: widget.existing?.total.toStringAsFixed(2) ?? '',
    );
  }

  @override
  void dispose() {
    _nameController.dispose();
    _amountController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final notifier = ref.read(budgetProvider.notifier);
    return Padding(
      padding: EdgeInsets.only(
        left: 16,
        right: 16,
        top: 24,
        bottom: MediaQuery.of(context).viewInsets.bottom + 24,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            widget.existing == null ? 'Create budget' : 'Update budget',
            style: Theme.of(context).textTheme.titleLarge,
          ),
          const SizedBox(height: 16),
          TextField(
            controller: _nameController,
            decoration: const InputDecoration(labelText: 'Name'),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _amountController,
            keyboardType: TextInputType.number,
            decoration: const InputDecoration(labelText: 'Total amount (KES)'),
          ),
          const SizedBox(height: 16),
          SizedBox(
            width: double.infinity,
            child: FilledButton(
              onPressed: _saving
                  ? null
                  : () async {
                      final navigator = Navigator.of(context);
                      setState(() => _saving = true);
                      final payload = {
                        'name': _nameController.text.trim(),
                        'amount':
                            double.tryParse(_amountController.text.trim()) ?? 0,
                      };
                      await notifier.saveBudget(
                        existing: widget.existing,
                        payload: payload,
                      );
                      if (!mounted) return;
                      navigator.pop();
                    },
              child: Text(_saving ? 'Saving...' : 'Save budget'),
            ),
          )
        ],
      ),
    );
  }
}

