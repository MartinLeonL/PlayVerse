import 'package:flutter/material.dart';

class EditableField extends StatefulWidget {
  final String label;
  final String initialValue;
  final bool obscureText;

  /// Called when the user confirms an edit. Throw inside this (or let
  /// the underlying Future throw) to show a failure snackbar instead
  /// of a success one.
  ///
  /// For a normal field: onSave(newValue) { ... }
  /// For the password field: onSave receives the NEW password; if
  /// [requireCurrentPassword] is true, the current password the user
  /// typed is passed as [currentPassword] to the same callback.
  final Future<void> Function(String newValue, {String? currentPassword}) onSave;

  /// When true, shows an extra "Current password" field above the new
  /// value field while editing, and passes it to onSave. Use this for
  /// the Password row only.
  final bool requireCurrentPassword;

  /// Number of dots to show when obscureText is true and not editing.
  /// Falls back to 12 if not provided.
  final int? dotCount;

  const EditableField({
    super.key,
    required this.label,
    required this.initialValue,
    required this.onSave,
    this.obscureText = false,
    this.requireCurrentPassword = false,
    this.dotCount,
  });

  @override
  State<EditableField> createState() => _EditableFieldState();
}

class _EditableFieldState extends State<EditableField> {
  late TextEditingController _controller;
  final TextEditingController _currentPasswordController = TextEditingController();
  bool _isEditing = false;
  bool _isSaving = false;

  @override
  void initState() {
    super.initState();
    _controller = TextEditingController(text: widget.initialValue);
  }

  @override
  void didUpdateWidget(covariant EditableField oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.initialValue != widget.initialValue) {
      _controller.text = widget.initialValue;
    }
  }

  Future<void> _save() async {
    // Password field: don't allow submitting an empty current password
    if (widget.requireCurrentPassword && _currentPasswordController.text.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Enter your current password first')),
      );
      return;
    }

    setState(() => _isSaving = true);
    try {
      await widget.onSave(
        _controller.text,
        currentPassword: widget.requireCurrentPassword ? _currentPasswordController.text : null,
      );
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('${widget.label} updated')),
        );
        _currentPasswordController.clear();
        // Don't leave the new password visible in the field after saving
        if (widget.obscureText) _controller.clear();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to save: $e')),
        );
      }
    } finally {
      if (mounted) setState(() => _isSaving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            widget.label,
            style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 4),
          if (_isEditing && widget.requireCurrentPassword) ...[
            TextField(
              controller: _currentPasswordController,
              obscureText: true,
              style: const TextStyle(fontSize: 16),
              decoration: const InputDecoration(
                isDense: true,
                hintText: 'Current password',
                border: UnderlineInputBorder(),
              ),
            ),
            const SizedBox(height: 8),
          ],
          Row(
            children: [
              Expanded(
                child: _isEditing
                    ? TextField(
                        controller: _controller,
                        obscureText: widget.obscureText,
                        autofocus: true,
                        style: const TextStyle(fontSize: 16),
                        decoration: InputDecoration(
                          isDense: true,
                          hintText: widget.requireCurrentPassword ? 'New password' : null,
                          border: const UnderlineInputBorder(),
                        ),
                      )
                    : Text(
                        widget.obscureText ? '•' * (widget.dotCount ?? 12) : _controller.text,
                        style: const TextStyle(fontSize: 16, color: Colors.black87),
                      ),
              ),
              IconButton(
                icon: Icon(
                  _isEditing ? Icons.check : Icons.edit,
                  size: 20,
                  color: Colors.black54,
                ),
                onPressed: _isSaving
                    ? null
                    : () async {
                        if (_isEditing) {
                          await _save();
                        }
                        setState(() => _isEditing = !_isEditing);
                      },
              ),
            ],
          ),
        ],
      ),
    );
  }

  @override
  void dispose() {
    _controller.dispose();
    _currentPasswordController.dispose();
    super.dispose();
  }
}