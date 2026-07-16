import 'package:flutter/material.dart';

class AuthTabs extends StatelessWidget {
  final bool isLoginSelected;
  final VoidCallback onLoginTap;
  final VoidCallback onRegisterTap;

  const AuthTabs({
    super.key,
    required this.isLoginSelected,
    required this.onLoginTap,
    required this.onRegisterTap,
  });

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: double.infinity,
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          GestureDetector(
            onTap: onLoginTap,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
              decoration: BoxDecoration(
                color: isLoginSelected ? Colors.grey[200] : Colors.transparent,
                borderRadius: BorderRadius.circular(20),
              ),
              child: Text(
                'Login',
                style: TextStyle(
                  fontWeight: FontWeight.w600,
                  color: isLoginSelected ? Colors.black87 : Colors.grey[500],
                ),
              ),
            ),
          ),
          Container(
            height: 18,
            width: 1,
            color: Colors.grey[300],
            margin: const EdgeInsets.symmetric(horizontal: 4),
          ),
          GestureDetector(
            onTap: onRegisterTap,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
              decoration: BoxDecoration(
                color: !isLoginSelected ? Colors.grey[200] : Colors.transparent,
                borderRadius: BorderRadius.circular(20),
              ),
              child: Text(
                'Register',
                style: TextStyle(
                  fontWeight: FontWeight.w600,
                  color: !isLoginSelected ? Colors.black87 : Colors.grey[500],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}