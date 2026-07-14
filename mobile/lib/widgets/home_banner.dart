import 'package:flutter/material.dart';
import '../pages/media_detail_page.dart';
import '../services/playlist_store.dart';
import '../theme/app_colors.dart';
import 'media_row.dart';

class BannerItem {
  final String title;
  final String imageUrl;
  final String tag;

  BannerItem({required this.title, required this.imageUrl, required this.tag});
}

class HomeBanner extends StatefulWidget {
  const HomeBanner({super.key});

  @override
  State<HomeBanner> createState() => _HomeBannerState();
}

class _HomeBannerState extends State<HomeBanner> {
  final PageController _pageController = PageController(viewportFraction: 1);
  int _currentPage = 0;

  final List<BannerItem> _banners = [
    BannerItem(
      title: 'Superman',
      tag: 'Movie',
      imageUrl: 'https://image.tmdb.org/t/p/w780/8VG8fDNiy50H4FedGwdSVUPoaJe.jpg',
    ),
    BannerItem(
      title: 'The Last Airbender',
      tag: 'Show',
      imageUrl: 'https://image.tmdb.org/t/p/w780/qYTsRQNu1MdxTQ0BE0F7YOAOROq.jpg',
    ),
    BannerItem(
      title: 'The Boys',
      tag: 'Show',
      imageUrl: 'https://image.tmdb.org/t/p/w780/2zmTngn1tYC1AvfnrFLhxeD82hz.jpg',
    ),
  ];

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final bannerHeight = MediaQuery.of(context).size.height * 0.4;

    return Column(
      children: [
        SizedBox(
          height: bannerHeight,
          child: PageView.builder(
            controller: _pageController,
            itemCount: _banners.length,
            onPageChanged: (index) {
              setState(() => _currentPage = index);
            },
            itemBuilder: (context, index) {
              final banner = _banners[index];
              final mediaItem = MediaItem(title: banner.title, imageUrl: banner.imageUrl);
              return Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(16),
                  child: Stack(
                    children: [
                      Positioned.fill(
                        child: Image.network(
                          banner.imageUrl,
                          fit: BoxFit.cover,
                          errorBuilder: (context, error, stackTrace) => Container(
                            color: Colors.grey[800],
                          ),
                        ),
                      ),
                      Positioned.fill(
                        child: Container(
                          decoration: BoxDecoration(
                            gradient: LinearGradient(
                              begin: Alignment.topCenter,
                              end: Alignment.bottomCenter,
                              colors: [
                                Colors.transparent,
                                Colors.black.withValues(alpha: 0.75),
                              ],
                            ),
                          ),
                        ),
                      ),
                      Positioned(
                        top: 12,
                        left: 12,
                        child: Row(
                          children: [
                            _tag('★ Trending'),
                            const SizedBox(width: 8),
                            _tag(banner.tag),
                          ],
                        ),
                      ),
                      Positioned(
                        left: 16,
                        bottom: 60,
                        child: Text(
                          banner.title,
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 26,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                      Positioned(
                        left: 16,
                        bottom: 16,
                        child: Row(
                          children: [
                            GestureDetector(
                              onTap: () {
                                Navigator.push(
                                  context,
                                  MaterialPageRoute(builder: (context) => MediaDetailPage(item: mediaItem)),
                                );
                              },
                              child: _pillButton('View', Icons.chevron_right),
                            ),
                            const SizedBox(width: 8),
                            GestureDetector(
                              onTap: () => _showPlaylistPicker(context, mediaItem),
                              child: _pillButton('Playlist', Icons.add),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              );
            },
          ),
        ),
        const SizedBox(height: 12),
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: List.generate(_banners.length, (index) {
            final isActive = index == _currentPage;
            return AnimatedContainer(
              duration: const Duration(milliseconds: 250),
              margin: const EdgeInsets.symmetric(horizontal: 4),
              height: 8,
              width: isActive ? 24 : 8,
              decoration: BoxDecoration(
                color: isActive ? AppColors.primary : AppColors.primaryLight,
                borderRadius: BorderRadius.circular(4),
              ),
            );
          }),
        ),
      ],
    );
  }

  void _showPlaylistPicker(BuildContext context, MediaItem item) {
    final store = PlaylistStore.instance;

    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (context) {
        return Container(
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.only(
              topLeft: Radius.circular(24),
              topRight: Radius.circular(24),
            ),
          ),
          padding: const EdgeInsets.symmetric(vertical: 16),
          child: SafeArea(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Padding(
                  padding: EdgeInsets.symmetric(horizontal: 20, vertical: 8),
                  child: Text('Add to Playlist', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                ),
                const Divider(height: 1),
                ...store.playlists.keys.map((playlistName) {
                  return _menuTile(
                    context,
                    icon: Icons.playlist_play,
                    label: playlistName,
                    onTap: () {
                      store.addItemToPlaylist(playlistName, item);
                      Navigator.pop(context);
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(content: Text('Added "${item.title}" to $playlistName')),
                      );
                    },
                  );
                }),
                _menuTile(
                  context,
                  icon: Icons.add_circle_outline,
                  label: 'New Playlist',
                  onTap: () {
                    Navigator.pop(context);
                    _showCreatePlaylistDialog(context, item);
                  },
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  void _showCreatePlaylistDialog(BuildContext context, MediaItem item) {
    final controller = TextEditingController();
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('New Playlist'),
        content: TextField(
          controller: controller,
          decoration: const InputDecoration(hintText: 'Playlist name'),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () {
              final name = controller.text.trim();
              if (name.isNotEmpty) {
                final store = PlaylistStore.instance;
                store.createPlaylist(name);
                store.addItemToPlaylist(name, item);
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(content: Text('Added "${item.title}" to $name')),
                );
              }
              Navigator.pop(context);
            },
            child: const Text('Create'),
          ),
        ],
      ),
    );
  }

  Widget _menuTile(BuildContext context, {required IconData icon, required String label, required VoidCallback onTap}) {
    return InkWell(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
        child: Row(
          children: [
            Icon(icon, color: AppColors.primary),
            const SizedBox(width: 16),
            Text(label, style: const TextStyle(fontSize: 16)),
          ],
        ),
      ),
    );
  }

  Widget _tag(String text) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: Colors.black.withValues(alpha: 0.5),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Text(text, style: const TextStyle(color: Colors.white, fontSize: 16)),
    );
  }

  Widget _pillButton(String label, IconData icon) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
      decoration: BoxDecoration(
        color: AppColors.primary.withValues(alpha: 0.85),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(label, style: const TextStyle(color: Colors.white, fontSize: 16)),
          Icon(icon, color: Colors.white, size: 16),
        ],
      ),
    );
  }
}