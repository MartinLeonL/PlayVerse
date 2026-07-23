import 'package:flutter/material.dart';
import '../data/media_catalog.dart';
import '../models/media_item.dart';
import '../pages/media_detail_page.dart';
import '../services/playlist_store.dart';
import '../theme/app_colors.dart';

class HomeBanner extends StatefulWidget {
  const HomeBanner({super.key});

  @override
  State<HomeBanner> createState() => _HomeBannerState();
}

class _HomeBannerState extends State<HomeBanner> {
  final PageController _pageController = PageController(viewportFraction: 1);
  int _currentPage = 0;

  // Pulled from real trending data instead of a hardcoded list —
  // a mix of movies and shows so the banner isn't all one type.
  List<MediaItem> get _banners => [
        ...MediaCatalog.movies.take(2),
        ...MediaCatalog.shows.take(2),
      ];

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final banners = _banners;
    if (banners.isEmpty) return const SizedBox.shrink();

    final bannerHeight = MediaQuery.of(context).size.height * 0.4;

    return Column(
      children: [
        SizedBox(
          height: bannerHeight,
          child: PageView.builder(
            controller: _pageController,
            itemCount: banners.length,
            onPageChanged: (index) => setState(() => _currentPage = index),
            itemBuilder: (context, index) {
              final item = banners[index];
              final tagLabel = item.type == 'show' ? 'Show' : 'Movie';
              // backdropImage can be null (music never has one, and
              // some movies/shows lack a backdrop) — fall back to the
              // poster rather than showing nothing.
              final bannerImage = item.backdropImage ?? item.posterImage;

              return Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(16),
                  child: Stack(
                    children: [
                      Positioned.fill(
                        child: Image.network(
                          bannerImage,
                          fit: BoxFit.cover,
                          errorBuilder: (context, error, stackTrace) => Container(color: Colors.grey[800]),
                        ),
                      ),
                      Positioned.fill(
                        child: Container(
                          decoration: BoxDecoration(
                            gradient: LinearGradient(
                              begin: Alignment.topCenter,
                              end: Alignment.bottomCenter,
                              colors: [Colors.transparent, Colors.black.withValues(alpha: 0.75)],
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
                            _tag(tagLabel),
                          ],
                        ),
                      ),
                      Positioned(
                        left: 16,
                        bottom: 60,
                        child: Text(
                          item.title,
                          style: const TextStyle(color: Colors.white, fontSize: 26, fontWeight: FontWeight.bold),
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
                                  MaterialPageRoute(builder: (_) => MediaDetailPage(item: item)),
                                );
                              },
                              child: _pillButton('View', Icons.chevron_right),
                            ),
                            const SizedBox(width: 8),
                            GestureDetector(
                              onTap: () => _showPlaylistPicker(context, item),
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
          children: List.generate(banners.length, (index) {
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
      isScrollControlled: true,
      builder: (context) {
        return Container(
          constraints: BoxConstraints(maxHeight: MediaQuery.of(context).size.height * 0.7),
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.only(
              topLeft: Radius.circular(24),
              topRight: Radius.circular(24),
            ),
          ),
          child: SafeArea(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Padding(
                  padding: EdgeInsets.symmetric(horizontal: 20, vertical: 16),
                  child: Text('Add to Playlist', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                ),
                const Divider(height: 1),
                Flexible(
                  child: SingleChildScrollView(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        ...store.playlists.map((playlist) {
                          return ListTile(
                            leading: const Icon(Icons.playlist_play, color: AppColors.primary),
                            title: Text(playlist.name),
                            onTap: () async {
                              final error = await PlaylistStore.instance.addItemToPlaylist(playlist.id, item);
                              if (context.mounted) {
                                Navigator.pop(context);
                                ScaffoldMessenger.of(context).showSnackBar(
                                  SnackBar(content: Text(error == null ? 'Added "${item.title}" to ${playlist.name}' : 'Failed to add: $error')),
                                );
                              }
                            },
                          );
                        }),
                        ListTile(
                          leading: const Icon(Icons.add_circle_outline, color: AppColors.primary),
                          title: const Text('New Playlist'),
                          onTap: () {
                            Navigator.pop(context);
                            _showCreatePlaylistDialog(context, item);
                          },
                        ),
                        const SizedBox(height: 8),
                      ],
                    ),
                  ),
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
            onPressed: () async {
              final name = controller.text.trim();
              final dialogContext = context;
              Navigator.pop(context);
              if (name.isEmpty) return;

              final playlist = await PlaylistStore.instance.createPlaylist(name);
              if (playlist == null) {
                if (dialogContext.mounted) {
                  ScaffoldMessenger.of(dialogContext).showSnackBar(
                    const SnackBar(content: Text('Failed to create playlist.')),
                  );
                }
                return;
              }

              final error = await PlaylistStore.instance.addItemToPlaylist(playlist.id, item);
              if (dialogContext.mounted) {
                ScaffoldMessenger.of(dialogContext).showSnackBar(
                  SnackBar(content: Text(error == null ? 'Added "${item.title}" to ${playlist.name}' : 'Failed to add: $error')),
                );
              }
            },
            child: const Text('Create'),
          ),
        ],
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