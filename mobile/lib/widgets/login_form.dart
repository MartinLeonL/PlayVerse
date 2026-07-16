import 'package:flutter/material.dart';
import '../theme/app_colors.dart';
import '../services/api_service.dart';
import '../pages/home_page.dart';

class LoginForm extends StatefulWidget {
  const LoginForm({super.key});

  @override
  State<LoginForm> createState() => _LoginFormState();
}

class _LoginFormState extends State<LoginForm> {
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _obscurePassword = true;
  bool _isLoading = false;

  Future<void> _login() async {
  if (_emailController.text.isEmpty || _passwordController.text.isEmpty) {
    ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Please fill all fields')));
    return;
  }

  setState(() => _isLoading = true);
  try {
    await ApiService().login(
      login: _emailController.text.trim(),
      password: _passwordController.text.trim(),
    );

    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Login successful!')));
      Navigator.pushReplacement(context, MaterialPageRoute(builder: (_) => const HomePage()));
    }
  } catch (e) {
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Login failed: $e')));
    }
  } finally {
    if (mounted) setState(() => _isLoading = false);
  }
}

  @override
  Widget build(BuildContext context) {
    return Column(
      key: const ValueKey('login_form'),
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        const Text('Email', style: TextStyle(fontWeight: FontWeight.w600)),
        const SizedBox(height: 8),
        TextField(
          controller: _emailController,
          decoration: _fieldDecoration('Enter your email', Icons.email_outlined),
        ),
        const SizedBox(height: 16),
        const Text('Password', style: TextStyle(fontWeight: FontWeight.w600)),
        const SizedBox(height: 8),
        TextField(
          controller: _passwordController,
          obscureText: _obscurePassword,
          decoration: _fieldDecoration('Enter your password', Icons.lock_outline).copyWith(
            suffixIcon: IconButton(
              icon: Icon(_obscurePassword ? Icons.visibility_off : Icons.visibility, color: Colors.grey),
              onPressed: () => setState(() => _obscurePassword = !_obscurePassword),
            ),
          ),
        ),
        const SizedBox(height: 24),
        SizedBox(
          width: double.infinity,
          child: ElevatedButton(
            onPressed: _isLoading ? null : _login,
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.primary,
              padding: const EdgeInsets.symmetric(vertical: 16),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(30)),
            ),
            child: _isLoading
                ? const CircularProgressIndicator(color: Colors.white)
                : const Text('Login', style: TextStyle(fontSize: 16, color: Colors.white)),
          ),
        ),
      ],
    );
  }

  InputDecoration _fieldDecoration(String hint, IconData icon) {
    return InputDecoration(
      hintText: hint,
      prefixIcon: Icon(icon, color: Colors.grey),
      filled: true,
      fillColor: Colors.grey[100],
      contentPadding: const EdgeInsets.symmetric(vertical: 14),
      border: OutlineInputBorder(borderRadius: BorderRadius.circular(30), borderSide: BorderSide.none),
    );
  }

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }
}