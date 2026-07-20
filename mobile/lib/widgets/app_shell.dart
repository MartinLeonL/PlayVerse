import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../main.dart';
import '../pages/ai_search_page.dart';
import '../pages/home_page.dart';
import '../pages/search_page.dart';
import '../theme/app_colors.dart';
import 'nav_dropdown.dart';
import 'profile_dropdown.dart';

class AppShell extends StatefulWidget {
  final Widget body;
  final Future<void> Function()? onRefresh;

  const AppShell({super.key, required this.body, this.onRefresh});

  @override
  State<AppShell> createState() => _AppShellState();
}

class _AppShellState extends State<AppShell> with RouteAware {
  bool _showNavMenu = false;
  bool _showProfileMenu = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final route = ModalRoute.of(context);
    if (route is PageRoute) {
      routeObserver.subscribe(this, route);
    }
  }

  @override
  void dispose() {
    routeObserver.unsubscribe(this);
    super.dispose();
  }

  // Called specifically when a route above this one gets popped and
  // this page becomes visible again — exactly the moment the back
  // button/hamburger icon needs to be recomputed.
  @override
  void didPopNext() {
    setState(() {});
  }

  Future<String> _getUserName() async {
    final storage = const FlutterSecureStorage();
    final firstName = await storage.read(key: 'firstName') ?? 'Jane';
    final lastName = await storage.read(key: 'lastName') ?? 'Doe';
    return '$firstName $lastName';
  }

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
    // Every page uses AppShell, and every AppBar here hardcodes `leading`
    // to the hamburger menu icon — which silently disables Flutter's
    // automatic back button on every single pushed page. Show a real
    // back arrow whenever there's somewhere to go back to, and fall
    // back to the hamburger menu only at the root (e.g. Home), where
    // there's nothing to pop.
    final canPop = Navigator.canPop(context);

    // PopScope blocks popping past the root regardless of WHAT triggers
    // the pop — our own back arrow, Android's predictive-back gesture,
    // or the hardware back button. Without this, a stray/racing pop at
    // the root (most likely the OS gesture firing near-simultaneously
    // with our button) has nowhere left to go, and Android's default
    // behavior for that is to finish the Activity — which shows up as
    // a sudden black screen, not a normal app exit.
    return PopScope(
      canPop: canPop,
      child: Scaffold(
        backgroundColor: AppColors.background,
        appBar: AppBar(
          backgroundColor: AppColors.primary,
          elevation: 0,
          leading: canPop
              ? IconButton(
                  icon: const Icon(Icons.arrow_back, color: Colors.white),
                  onPressed: () => Navigator.maybePop(context),
                )
              : IconButton(
                  icon: const Icon(Icons.menu, color: Colors.white),
                  onPressed: _toggleNavMenu,
                ),
          title: GestureDetector(
            onTap: _goHome,
            child: Row(
              children: [
                ColorFiltered(
                  colorFilter: const ColorFilter.mode(Colors.white, BlendMode.srcIn),
                  child: Image.asset('assets/images/logo.png', height: 42),
                ),
              ],
            ),
          ),
          actions: [
            GestureDetector(
              onTap: () {
                _closeMenus();
                Navigator.push(
                  context,
                  MaterialPageRoute(builder: (context) => const AiSearchPage()),
                );
              },
              child: const Icon(Icons.auto_awesome, color: Colors.white),
            ),
            const SizedBox(width: 16),
            GestureDetector(
              onTap: () {
                _closeMenus();
                Navigator.push(
                  context,
                  MaterialPageRoute(builder: (context) => const SearchPage()),
                );
              },
              child: const Icon(Icons.search, color: Colors.white),
            ),
            const SizedBox(width: 16),
            // Inside the actions of the AppBar
            GestureDetector(
              onTap: _toggleProfileMenu,
              child: Row(
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
                  const Icon(Icons.arrow_drop_down, color: Colors.white),
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
                color: AppColors.primary,
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
      ),
    );
  }
}