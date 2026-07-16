import 'package:flutter/material.dart';
import 'package:playverseapp/services/api_service.dart';
import '../theme/app_colors.dart';
import '../widgets/app_background.dart';
import '../widgets/top_nav_bar.dart';
import '../widgets/auth_card_shell.dart';
import '../widgets/auth_tabs.dart';
import '../widgets/bottom_info_bar.dart';
import '../widgets/login_form.dart';
import '../widgets/register_form.dart';
import 'home_page.dart';

class AuthPage extends StatefulWidget {
  const AuthPage({super.key});

  @override
  State<AuthPage> createState() => _AuthPageState();
}

class _AuthPageState extends State<AuthPage> {
  bool _isLogin = true;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: GestureDetector(
        onTap: () => FocusScope.of(context).unfocus(),
        behavior: HitTestBehavior.opaque,
        child: Stack(
          children: [
            const AppBackground(),
            const TopNavBar(),
            AuthCardShell(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  AuthTabs(
                    isLoginSelected: _isLogin,
                    onLoginTap: () => setState(() => _isLogin = true),
                    onRegisterTap: () => setState(() => _isLogin = false),
                  ),
                  const SizedBox(height: 24),
                  AnimatedSwitcher(
                    duration: const Duration(milliseconds: 300),
                    child: _isLogin ? const LoginForm() : const RegisterForm(),
                  ),
                  const SizedBox(height: 16),
                  Center(
                    child: GestureDetector(
                      onTap: () => setState(() => _isLogin = !_isLogin),
                      child: RichText(
                        text: TextSpan(
                          style: const TextStyle(color: Colors.grey),
                          children: [
                            TextSpan(text: _isLogin ? "Don't have an account? " : 'Already have one? '),
                            TextSpan(
                              text: _isLogin ? 'Register' : 'Login',
                              style: const TextStyle(color: AppColors.primaryLight, fontWeight: FontWeight.bold),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),
                  Center(
                    child: TextButton(
                      onPressed: () async {
                        await ApiService().logout();   // ← clears any old token
                        Navigator.pushReplacement(
                          context,
                          MaterialPageRoute(builder: (context) => const HomePage()),
                        );
                      },
                      child: const Text(
                        'Continue as Guest',
                        style: TextStyle(color: Colors.grey, decoration: TextDecoration.underline),
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const BottomInfoBar(),
          ],
        ),
      ),
    );
  }
}