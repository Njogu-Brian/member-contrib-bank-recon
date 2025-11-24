import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../../models/investment.dart';

class InvestmentFormSheet extends StatefulWidget {
  const InvestmentFormSheet({
    super.key,
    required this.onSubmit,
    this.existing,
  });

  final Investment? existing;
  final Future<void> Function(Map<String, dynamic> payload) onSubmit;

  @override
  State<InvestmentFormSheet> createState() => _InvestmentFormSheetState();
}

class _InvestmentFormSheetState extends State<InvestmentFormSheet> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _nameController;
  late final TextEditingController _descriptionController;
  late final TextEditingController _amountController;
  late final TextEditingController _roiController;
  DateTime? _startDate;
  DateTime? _endDate;
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    _nameController = TextEditingController(text: widget.existing?.name);
    _descriptionController = TextEditingController(text: widget.existing?.description);
    _amountController = TextEditingController(
      text: widget.existing?.principalAmount.toStringAsFixed(2) ?? '',
    );
    _roiController = TextEditingController(
      text: widget.existing?.expectedRoiRate?.toStringAsFixed(2) ?? '',
    );
    _startDate = widget.existing?.startDate;
    _endDate = widget.existing?.endDate;
  }

  @override
  void dispose() {
    _nameController.dispose();
    _descriptionController.dispose();
    _amountController.dispose();
    _roiController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final bottomPadding = MediaQuery.of(context).viewInsets.bottom;

    return Padding(
      padding: EdgeInsets.only(
        bottom: bottomPadding,
        left: 16,
        right: 16,
        top: 24,
      ),
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              widget.existing == null ? 'Create investment' : 'Edit investment',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 12),
            Form(
              key: _formKey,
              child: Column(
                children: [
                  TextFormField(
                    controller: _nameController,
                    decoration: const InputDecoration(labelText: 'Name'),
                    validator: (value) =>
                        value == null || value.isEmpty ? 'Name is required' : null,
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: _descriptionController,
                    decoration: const InputDecoration(labelText: 'Description'),
                    minLines: 2,
                    maxLines: 4,
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: _amountController,
                    keyboardType: TextInputType.number,
                    decoration: const InputDecoration(
                      labelText: 'Principal amount',
                      prefixText: 'KES ',
                    ),
                    validator: (value) =>
                        double.tryParse(value ?? '') == null ? 'Amount required' : null,
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: _roiController,
                    keyboardType: TextInputType.number,
                    decoration: const InputDecoration(
                      labelText: 'ROI target (%)',
                    ),
                  ),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Expanded(
                        child: _DateButton(
                          label: 'Start date',
                          value: _startDate,
                          onPressed: () => _pickDate(context, true),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: _DateButton(
                          label: 'End date',
                          value: _endDate,
                          onPressed: () => _pickDate(context, false),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 20),
                  SizedBox(
                    width: double.infinity,
                    child: FilledButton(
                      onPressed: _saving ? null : _handleSubmit,
                      child: Text(_saving ? 'Saving...' : 'Save investment'),
                    ),
                  ),
                  const SizedBox(height: 12),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _pickDate(BuildContext context, bool isStart) async {
    final now = DateTime.now();
    final initial = isStart ? (_startDate ?? now) : (_endDate ?? now.add(const Duration(days: 30)));
    final picked = await showDatePicker(
      context: context,
      initialDate: initial,
      firstDate: DateTime(now.year - 5),
      lastDate: DateTime(now.year + 5),
    );
    if (picked != null) {
      setState(() {
        if (isStart) {
          _startDate = picked;
        } else {
          _endDate = picked;
        }
      });
    }
  }

  Future<void> _handleSubmit() async {
    if (!(_formKey.currentState?.validate() ?? false)) return;
    setState(() => _saving = true);
    try {
      final payload = {
        'name': _nameController.text.trim(),
        'description': _descriptionController.text.trim(),
        'amount': double.parse(_amountController.text.trim()),
        'expected_roi_rate': _roiController.text.trim().isEmpty
            ? null
            : double.parse(_roiController.text.trim()),
        if (_startDate != null) 'investment_date': _startDate!.toIso8601String(),
        if (_endDate != null) 'maturity_date': _endDate!.toIso8601String(),
      };
      await widget.onSubmit(payload);
      if (mounted) Navigator.of(context).pop();
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }
}

class _DateButton extends StatelessWidget {
  const _DateButton({
    required this.label,
    required this.value,
    required this.onPressed,
  });

  final String label;
  final DateTime? value;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    return OutlinedButton.icon(
      onPressed: onPressed,
      icon: const Icon(Icons.calendar_today_outlined),
      label: Text(
        value == null ? label : DateFormat('dd MMM yyyy').format(value!),
      ),
    );
  }
}

