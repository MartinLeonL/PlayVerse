import 'package:flutter/material.dart';
import '../pages/home_page.dart';
import 'nav_dropdown.dart';
import 'profile_dropdown.dart';

class AppShell extends StatefulWidget {
  final Widget body;
  final Future<void> Function()? onRefresh;

  const AppShell({super.key, required this.body, this.onRefresh});

  @override
  State<AppShell> createState() => _AppShellState();
}

class _AppShellState extends State<AppShell> {
  bool _showNavMenu = false;
  bool _showProfileMenu = false;

  void _toggleNavMenu() {
    setState(() {
      _showNavMenu = !_showNavMenu;
      _showProfileMenu = false;
    });
  }

  void _toggleProfileMenu() {
    setState(() {
      _showProfileMenu = !_showProfileMenu;
      _showNavMenu = false;
    });
  }

  void _closeMenus() {
    setState(() {
      _showNavMenu = false;
      _showProfileMenu = false;
    });
  }

  Future<void> _defaultRefresh() async {
  await Future.delayed(const Duration(milliseconds: 600));
  setState(() {});
  }

  void _goHome() {
    _closeMenus();
    Navigator.pushAndRemoveUntil(
      context,
      MaterialPageRoute(builder: (context) => const HomePage()),
      (route) => false,
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFE1D9F0),
      appBar: AppBar(
        backgroundColor: const Color(0xFF7C6FD8),
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.menu, color: Colors.white),
          onPressed: _toggleNavMenu,
        ),
        title: GestureDetector(
          onTap: _goHome,
          child: Row(
            children: [
              ColorFiltered(
                colorFilter: const ColorFilter.mode(Colors.white, BlendMode.srcIn),
                child: Image.asset('assets/images/logo.png', height: 36),
              ),
            ],
          ),
        ),
        actions: [
          const Icon(Icons.search, color: Colors.white),
          const SizedBox(width: 16),
          GestureDetector(
            onTap: _toggleProfileMenu,
            child: const Row(
              children: [
                Text('Jane Doe', style: TextStyle(color: Colors.white, fontSize: 16)),
                Icon(Icons.arrow_drop_down, color: Colors.white),
              ],
            ),
          ),
          const SizedBox(width: 12),
        ],
      ),
      body: GestureDetector(
        onTap: _closeMenus,
        behavior: HitTestBehavior.translucent,
        child: Stack(
          children: [
            RefreshIndicator(
              color: const Color(0xFF7C6FD8),
              onRefresh: widget.onRefresh ?? _defaultRefresh,
              child: widget.body,
            ),
            IgnorePointer(
              ignoring: !(_showNavMenu || _showProfileMenu),
              child: AnimatedOpacity(
                duration: const Duration(milliseconds: 250),
                opacity: (_showNavMenu || _showProfileMenu) ? 1 : 0,
                child: Container(color: Colors.black.withValues(alpha: 0.4)),
              ),
            ),
            NavDropdown(visible: _showNavMenu, onClose: _closeMenus),
            ProfileDropdown(visible: _showProfileMenu, onClose: _closeMenus),
          ],
        ),
      ),
    );
  }
}