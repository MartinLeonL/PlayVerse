import 'dart:io';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
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
  File? _profileImage;

  String _firstName = 'Loading...';
  String _lastName = 'Loading...';
  String _username = 'Loading...';
  String _email = 'Loading...';
  int _passwordLength = 8;

  @override
  void initState() {
    super.initState();
    _loadUserData();
  }

  Future<void> _loadUserData() async {
    final storage = const FlutterSecureStorage();
    final first = await storage.read(key: 'firstName') ?? 'John';
    final last = await storage.read(key: 'lastName') ?? 'Doe';
    final login = await storage.read(key: 'login') ?? 'test';
    final email = await storage.read(key: 'email') ?? 'johndoe@gmail.com';
    final passwordLengthStr = await storage.read(key: 'password_length');
    final passwordLength = int.tryParse(passwordLengthStr ?? '') ?? 8;

    if (mounted) {
      setState(() {
        _firstName = first;
        _lastName = last;
        _username = login;
        _email = email;
        _passwordLength = passwordLength;
      });
    }
  }

  Future<void> _pickImage() async {
    final picker = ImagePicker();
    final picked = await picker.pickImage(source: ImageSource.gallery, imageQuality: 80);
    if (picked != null) {
      setState(() {
        _profileImage = File(picked.path);
      });
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
        await ApiService().logout();

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
        child: Stack(
          clipBehavior: Clip.none,
          children: [
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const SizedBox(height: 40),
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.fromLTRB(24, 60, 24, 24),
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
                          await ApiService().updateProfile(firstName: newValue);
                          if (mounted) setState(() => _firstName = newValue);
                        },
                      ),
                      EditableField(
                        key: ValueKey('lastName_$_lastName'),
                        label: 'Last Name',
                        initialValue: _lastName,
                        onSave: (newValue, {currentPassword}) async {
                          await ApiService().updateProfile(lastName: newValue);
                          if (mounted) setState(() => _lastName = newValue);
                        },
                      ),
                      EditableField(
                        key: ValueKey('username_$_username'),
                        label: 'Username',
                        initialValue: _username,
                        onSave: (newValue, {currentPassword}) async {
                          await ApiService().updateProfile(login: newValue);
                          if (mounted) setState(() => _username = newValue);
                        },
                      ),
                      EditableField(
                        key: ValueKey('email_$_email'),
                        label: 'Email',
                        initialValue: _email,
                        onSave: (newValue, {currentPassword}) async {
                          await ApiService().updateProfile(email: newValue);
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
                          await ApiService().updatePassword(
                            currentPassword: currentPassword ?? '',
                            newPassword: newValue,
                          );
                          if (mounted) setState(() => _passwordLength = newValue.length);
                        },
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
            Positioned(
              left: 10,
              top: 0,
              child: GestureDetector(
                onTap: _pickImage,
                child: Stack(
                  children: [
                    CircleAvatar(
                      radius: 50,
                      backgroundColor: Colors.black12,
                      backgroundImage: _profileImage != null ? FileImage(_profileImage!) : null,
                      child: _profileImage == null
                          ? const Icon(Icons.person, size: 55, color: Colors.black54)
                          : null,
                    ),
                    Positioned(
                      bottom: 4,
                      right: 4,
                      child: Container(
                        padding: const EdgeInsets.all(4),
                        decoration: const BoxDecoration(
                          color: Colors.white,
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(Icons.edit, size: 16, color: Colors.black87),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}