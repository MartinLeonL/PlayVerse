import 'package:flutter/material.dart';
import 'package:playverseapp/services/api_service.dart';
import '../pages/account_page.dart';
import '../pages/auth_page.dart';
import '../pages/playlists_page.dart';
import '../theme/app_colors.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class ProfileDropdown extends StatefulWidget {
  final bool visible;
  final VoidCallback onClose;

  const ProfileDropdown({super.key, required this.visible, required this.onClose});

  @override
  State<ProfileDropdown> createState() => _ProfileDropdownState();
}

class _ProfileDropdownState extends State<ProfileDropdown> {
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
        color: AppColors.primary,
        borderRadius: const BorderRadius.only(bottomLeft: Radius.circular(24)),
        elevation: widget.visible ? 8 : 0,
        child: ClipRect(
          child: AnimatedSize(
            duration: const Duration(milliseconds: 250),
            curve: Curves.easeInOut,
            alignment: Alignment.topCenter,
            child: widget.visible
                ? Padding(
                    padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 8),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        FutureBuilder<String>(
                          future: _getUserName(),
                          builder: (context, snapshot) {
                            return Text(
                              snapshot.data ?? 'Jane Doe',
                              style: const TextStyle(color: Colors.white, fontSize: 16),
                            );
                          },
                        ),
                        ...items.map((item) {
                          return InkWell(
                            onTap: () {
                              widget.onClose();
                              if (item['label'] == 'Account') {
                                Navigator.push(
                                  context,
                                  MaterialPageRoute(builder: (context) => const AccountPage()),
                                );
                              } else if (item['label'] == 'Sign Out') {
                                ApiService().logout();
                                Navigator.pushAndRemoveUntil(
                                  context,
                                  MaterialPageRoute(builder: (context) => const AuthPage()),
                                  (route) => false,
                                );
                              } else if (item['label'] == 'Playlists') {
                                Navigator.push(
                                  context,
                                  MaterialPageRoute(builder: (context) => const PlaylistsPage()),
                                );
                              }
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
                      ],
                    ),
                  )
                : const SizedBox.shrink(),
          ),
        ),
      ),
    );
  }

  Future<String> _getUserName() async {
    final storage = const FlutterSecureStorage();
    final firstName = await storage.read(key: 'firstName') ?? 'Jane';
    final lastName = await storage.read(key: 'lastName') ?? 'Doe';
    return '$firstName $lastName';
  }
}