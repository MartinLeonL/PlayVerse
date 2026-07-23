import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../services/api_service.dart';
import '../theme/app_colors.dart';
import '../widgets/app_shell.dart';
import '../widgets/editable_field.dart';
import 'auth_page.dart';

class AccountPage extends StatefulWidget {
  const AccountPage({super.key});

  @override
  State<AccountPage> createState() => _AccountPageState();
}

class _AccountPageState extends State<AccountPage> {
  String _firstName = 'Loading...';
  String _lastName = 'Loading...';
  String _username = 'Loading...';
  String _email = 'Loading...';
  int _passwordLength = 8;
  String _reviewDisplayPreference = 'fullName';

  @override
  void initState() {
    super.initState();
    _loadUserData();
  }

  Future<void> _loadUserData() async {
    final storage = const FlutterSecureStorage();
    final first = await storage.read(key: 'firstName') ?? 'John';
    final last = await storage.read(key: 'lastName') ?? 'Doe';
    final username = await storage.read(key: 'username') ?? '';
    final email = await storage.read(key: 'email') ?? 'johndoe@gmail.com';
    final passwordLengthStr = await storage.read(key: 'password_length');
    final passwordLength = int.tryParse(passwordLengthStr ?? '') ?? 8;
    final displayPreference = await storage.read(key: 'reviewDisplayPreference') ?? 'fullName';

    if (mounted) {
      setState(() {
        _firstName = first;
        _lastName = last;
        _username = username;
        _email = email;
        _passwordLength = passwordLength;
        _reviewDisplayPreference = displayPreference;
      });
    }
  }

  Future<void> _setReviewDisplayPreference(String preference) async {
    final previous = _reviewDisplayPreference;
    setState(() => _reviewDisplayPreference = preference);

    try {
      await ApiService().updateAccount(
        firstName: _firstName,
        lastName: _lastName,
        username: _username,
        email: _email,
        reviewDisplayPreference: preference,
      );
    } catch (e) {
      if (mounted) {
        setState(() => _reviewDisplayPreference = previous);
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Failed to update: $e')));
      }
    }
  }

  Future<void> _confirmDelete(BuildContext context) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete Account?'),
        content: const Text('This action cannot be undone.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
          TextButton(onPressed: () => Navigator.pop(context, true), child: const Text('Delete', style: TextStyle(color: Colors.red))),
        ],
      ),
    );

    if (confirmed == true) {
      try {
        await ApiService().deleteAccount();

        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Account deleted')));
          Navigator.pushAndRemoveUntil(
            context,
            MaterialPageRoute(builder: (_) => const AuthPage()),
            (route) => false,
          );
        }
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Delete failed: $e')));
        }
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return AppShell(
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const SizedBox(height: 20),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(24),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  EditableField(
                    key: ValueKey('firstName_$_firstName'),
                    label: 'First Name',
                    initialValue: _firstName,
                    onSave: (newValue, {currentPassword}) async {
                      await ApiService().updateAccount(
                        firstName: newValue,
                        lastName: _lastName,
                        username: _username,
                        email: _email,
                      );
                      if (mounted) setState(() => _firstName = newValue);
                    },
                  ),
                  EditableField(
                    key: ValueKey('lastName_$_lastName'),
                    label: 'Last Name',
                    initialValue: _lastName,
                    onSave: (newValue, {currentPassword}) async {
                      await ApiService().updateAccount(
                        firstName: _firstName,
                        lastName: newValue,
                        username: _username,
                        email: _email,
                      );
                      if (mounted) setState(() => _lastName = newValue);
                    },
                  ),
                  EditableField(
                    key: ValueKey('username_$_username'),
                    label: 'Username',
                    initialValue: _username,
                    onSave: (newValue, {currentPassword}) async {
                      if (!RegExp(r'^[a-zA-Z0-9_]{3,20}$').hasMatch(newValue)) {
                        throw Exception('3-20 characters, letters/numbers/underscores only');
                      }
                      await ApiService().updateAccount(
                        firstName: _firstName,
                        lastName: _lastName,
                        username: newValue,
                        email: _email,
                      );
                      if (mounted) setState(() => _username = newValue);
                    },
                  ),
                  EditableField(
                    key: ValueKey('email_$_email'),
                    label: 'Email',
                    initialValue: _email,
                    onSave: (newValue, {currentPassword}) async {
                      if (!newValue.contains('@')) {
                        throw Exception('Please enter a valid email address');
                      }
                      await ApiService().updateAccount(
                        firstName: _firstName,
                        lastName: _lastName,
                        username: _username,
                        email: newValue,
                      );
                      if (mounted) setState(() => _email = newValue);
                    },
                  ),
                  EditableField(
                    label: 'Password',
                    initialValue: '',
                    obscureText: true,
                    requireCurrentPassword: true,
                    dotCount: _passwordLength,
                    onSave: (newValue, {currentPassword}) async {
                      if (newValue.length < 8) {
                        throw Exception('Password must be at least 8 characters');
                      }
                      await ApiService().updateAccount(
                        firstName: _firstName,
                        lastName: _lastName,
                        username: _username,
                        email: _email,
                        currentPassword: currentPassword ?? '',
                        password: newValue,
                      );
                      if (mounted) setState(() => _passwordLength = newValue.length);
                    },
                  ),
                  const SizedBox(height: 16),
                  const Text('Show on my reviews:', style: TextStyle(fontWeight: FontWeight.w600)),
                  const SizedBox(height: 4),
                  RadioListTile<String>(
                    contentPadding: EdgeInsets.zero,
                    dense: true,
                    title: Text('Full name ($_firstName $_lastName)'),
                    value: 'fullName',
                    groupValue: _reviewDisplayPreference,
                    onChanged: (value) => _setReviewDisplayPreference(value!),
                  ),
                  RadioListTile<String>(
                    contentPadding: EdgeInsets.zero,
                    dense: true,
                    title: Text('Username (@$_username)'),
                    value: 'username',
                    groupValue: _reviewDisplayPreference,
                    onChanged: (value) => _setReviewDisplayPreference(value!),
                  ),
                  const SizedBox(height: 8),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton.icon(
                      onPressed: () => _confirmDelete(context),
                      icon: const Icon(Icons.delete, color: AppColors.onDestructive),
                      label: const Text('Delete Account', style: TextStyle(color: AppColors.onDestructive, fontWeight: FontWeight.bold)),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.destructive,
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(30)),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}