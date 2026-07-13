import 'package:flutter/material.dart';
import '../pages/account_page.dart';
import '../pages/auth_page.dart';

class ProfileDropdown extends StatelessWidget {
  final bool visible;
  final VoidCallback onClose;

  const ProfileDropdown({super.key, required this.visible, required this.onClose});

  @override
  Widget build(BuildContext context) {
    final items = [
      {'label': 'Account', 'icon': Icons.person_outline},
      {'label': 'Playlists', 'icon': Icons.add},
      {'label': 'Sign Out', 'icon': Icons.logout},
    ];

    return Positioned(
      top: 0,
      right: 0,
      child: Material(
        color: const Color(0xFF7C6FD8),
        borderRadius: const BorderRadius.only(bottomLeft: Radius.circular(24)),
        elevation: visible ? 8 : 0,
        child: ClipRect(
          child: AnimatedSize(
            duration: const Duration(milliseconds: 250),
            curve: Curves.easeInOut,
            alignment: Alignment.topCenter,
            child: visible
                ? Padding(
                    padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 8),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: items.map((item) {
                        return InkWell(
                          onTap: () {
                            onClose();
                            if (item['label'] == 'Account') {
                              Navigator.push(
                                context,
                                MaterialPageRoute(builder: (context) => const AccountPage()),
                              );
                            } else if (item['label'] == 'Sign Out') {
                              Navigator.pushAndRemoveUntil(
                                context,
                                MaterialPageRoute(builder: (context) => const AuthPage()),
                                (route) => false,
                              );
                            }
                            // TODO: wire up playlists 
                          },
                          child: Padding(
                            padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 12),
                            child: Row(
                              children: [
                                Icon(item['icon'] as IconData, color: Colors.white, size: 20),
                                const SizedBox(width: 12),
                                Text(
                                  item['label'] as String,
                                  style: const TextStyle(color: Colors.white, fontSize: 16),
                                ),
                              ],
                            ),
                          ),
                        );
                      }).toList(),
                    ),
                  )
                : const SizedBox.shrink(),
          ),
        ),
      ),
    );
  }
}