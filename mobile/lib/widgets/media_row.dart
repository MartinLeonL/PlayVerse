import 'package:flutter/material.dart';
import '../pages/all_media_page.dart';
import '../pages/media_detail_page.dart';
import '../services/api_service.dart';
import '../services/playlist_store.dart';
import '../theme/app_colors.dart';

class MediaItem {
  final String mediaId;
  final String mediaType; // 'movie' | 'show' | 'game' | 'music'
  final String title;
  final String imageUrl;
  final String bannerUrl;
  final List<String> genres;
  final String description;
  final String runtime;
  final String language;
  final String releaseDate;
  final List<String> platforms;
  final double? averageRating;
  final int ratingCount;

  MediaItem({
    String? mediaId,
    this.mediaType = 'movie',
    required this.title,
    required this.imageUrl,
    String? bannerUrl,
    this.genres = const [],
    this.description = 'No description available yet.',
    this.runtime = '--',
    this.language = '--',
    this.releaseDate = '--',
    this.platforms = const [],
    this.averageRating,
    this.ratingCount = 0,
  })  : mediaId = mediaId ?? title,   // falls back to title if not given
        bannerUrl = bannerUrl ?? imageUrl;
}

class MediaRow extends StatelessWidget {
  final String categoryTitle;
  final List<MediaItem> items;
  final bool loop;
  final bool titleOpensAll;
  final bool isPlaylist;
  final VoidCallback? onDelete;

  const MediaRow({
    super.key,
    required this.categoryTitle,
    required this.items,
    this.loop = true,
    this.titleOpensAll = false,
    this.isPlaylist = false,
    this.onDelete,
  });

  @override
  Widget build(BuildContext context) {
    final screenWidth = MediaQuery.of(context).size.width;
    final cardWidth = screenWidth * 0.35;
    final cardHeight = cardWidth * 1.5;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 20),
          child: Row(
            children: [
              Expanded(
                child: GestureDetector(
                  onTap: titleOpensAll
                      ? () {
                          Navigator.push(
                            context,
                            MaterialPageRoute(
                              builder: (context) => AllMediaPage(
                                title: categoryTitle,
                                items: items,
                                isPlaylist: isPlaylist,
                              ),
                            ),
                          );
                        }
                      : null,
                  child: Text(
                    categoryTitle,
                    style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                  ),
                ),
              ),
              if (onDelete != null)
                IconButton(
                  icon: const Icon(Icons.delete_outline, color: AppColors.destructive),
                  onPressed: onDelete,
                ),
            ],
          ),
        ),
        const SizedBox(height: 12),
        SizedBox(
          height: cardHeight + 45,
          child: items.isEmpty
              ? const Padding(
                  padding: EdgeInsets.symmetric(horizontal: 20),
                  child: Text('Nothing here yet.', style: TextStyle(color: AppColors.textSecondary)),
                )
              : ListView.builder(
                  scrollDirection: Axis.horizontal,
                  padding: const EdgeInsets.symmetric(horizontal: 20),
                  clipBehavior: Clip.none,
                  itemCount: loop ? 10000 : items.length,
                  itemBuilder: (context, index) {
                    final item = items[index % items.length];
                    return Padding(
                      padding: const EdgeInsets.only(right: 8, top: 8),
                      child: _MediaCard(item: item, width: cardWidth, height: cardHeight),
                    );
                  },
                ),
        ),
        const SizedBox(height: 8),
      ],
    );
  }
}

class _MediaCard extends StatefulWidget {
  final MediaItem item;
  final double width;
  final double height;

  const _MediaCard({required this.item, required this.width, required this.height});

  @override
  State<_MediaCard> createState() => _MediaCardState();
}

class _MediaCardState extends State<_MediaCard> {
  bool _isPressed = false;
  final LayerLink _layerLink = LayerLink();
  OverlayEntry? _overlayEntry;

  void _showOptionsMenu(BuildContext context) {
    final item = widget.item;
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
              children: [
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
                  child: Text(
                    item.title,
                    style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                  ),
                ),
                const Divider(height: 1),
                _menuTile(
                  context,
                  icon: Icons.playlist_add,
                  label: 'Add to Playlist',
                  onTap: () {
                    Navigator.pop(context);
                    _showPlaylistPicker(context);
                  },
                ),
                _menuTile(
                  context,
                  icon: Icons.info_outline,
                  label: 'View Details',
                  onTap: () {
                    Navigator.pop(context);
                    Navigator.push(
                      context,
                      MaterialPageRoute(builder: (context) => MediaDetailPage(item: item)),
                    );
                  },
                ),
              ],
            ),
          ),
        );
      },
    ).whenComplete(() {
      _removeOverlay();
    });
  }

  /// Adds this item to the user's playlist both locally (so the UI
  /// updates immediately) and on the backend (so it actually persists).
  /// Mirrors what MediaDetailPage._addToPlaylist already does correctly.
  Future<void> _persistAddToPlaylist(BuildContext context, String playlistName) async {
    final store = PlaylistStore.instance;

    try {
      final userId = await ApiService().getCurrentUserId();
      if (userId != null) {
        await ApiService().addMedia(
          userId: userId,
          mediaId: widget.item.mediaId,
          title: widget.item.title,
          mediaType: widget.item.mediaType,
        );
      }
      store.addItemToPlaylist(playlistName, widget.item);
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Added "${widget.item.title}" to $playlistName')),
        );
      }
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to add to playlist: $e')),
        );
      }
    }
  }

  void _showPlaylistPicker(BuildContext context) {
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
                      Navigator.pop(context);
                      _persistAddToPlaylist(context, playlistName);
                    },
                  );
                }),
                _menuTile(
                  context,
                  icon: Icons.add_circle_outline,
                  label: 'New Playlist',
                  onTap: () {
                    Navigator.pop(context);
                    _showCreatePlaylistDialog(context);
                  },
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  void _showCreatePlaylistDialog(BuildContext context) {
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
              final dialogContext = context;
              Navigator.pop(context);
              if (name.isNotEmpty) {
                final store = PlaylistStore.instance;
                store.createPlaylist(name);
                _persistAddToPlaylist(dialogContext, name);
              }
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

  Widget _buildPoster() {
    return Stack(
      children: [
        ClipRRect(
          borderRadius: BorderRadius.circular(10),
          child: Image.network(
            widget.item.imageUrl,
            height: widget.height,
            width: widget.width,
            fit: BoxFit.cover,
            errorBuilder: (context, error, stackTrace) => Container(
              height: widget.height,
              width: widget.width,
              color: Colors.grey[300],
              child: const Icon(Icons.image_not_supported, color: Colors.grey),
            ),
          ),
        ),
        if (widget.item.averageRating != null)
          Positioned(
            top: 6,
            right: 6,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
              decoration: BoxDecoration(
                color: Colors.black.withValues(alpha: 0.7),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(Icons.star, color: AppColors.accent, size: 12),
                  const SizedBox(width: 2),
                  Text(
                    widget.item.averageRating!.toStringAsFixed(1),
                    style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold),
                  ),
                ],
              ),
            ),
          ),
      ],
    );
  }

  void _showOverlay() {
    final renderBox = context.findRenderObject() as RenderBox;
    final size = renderBox.size;

    _overlayEntry = OverlayEntry(
      builder: (context) {
        return Positioned(
          width: size.width,
          height: size.height,
          child: CompositedTransformFollower(
            link: _layerLink,
            child: IgnorePointer(
              child: Center(
                child: _OverlayGrowingPoster(poster: _buildPoster()),
              ),
            ),
          ),
        );
      },
    );

    Overlay.of(context).insert(_overlayEntry!);
  }

  void _removeOverlay() {
    _overlayEntry?.remove();
    _overlayEntry = null;
    if (mounted) setState(() => _isPressed = false);
  }

  @override
  void dispose() {
    _overlayEntry?.remove();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: widget.width,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          CompositedTransformTarget(
            link: _layerLink,
            child: GestureDetector(
              onTap: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(builder: (context) => MediaDetailPage(item: widget.item)),
                );
              },
              onTapDown: (_) {
                setState(() => _isPressed = true);
                _showOverlay();
              },
              onTapCancel: () {
                _removeOverlay();
              },
              onTapUp: (_) {
                _removeOverlay();
              },
              onLongPress: () {
                _showOptionsMenu(context);
              },
              child: Opacity(
                opacity: _isPressed ? 0 : 1,
                child: _buildPoster(),
              ),
            ),
          ),
          const SizedBox(height: 6),
          Text(
            widget.item.title,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(fontSize: 16),
          ),
        ],
      ),
    );
  }
}

class _OverlayGrowingPoster extends StatefulWidget {
  final Widget poster;

  const _OverlayGrowingPoster({required this.poster});

  @override
  State<_OverlayGrowingPoster> createState() => _OverlayGrowingPosterState();
}

class _OverlayGrowingPosterState extends State<_OverlayGrowingPoster> {
  double _scale = 1.0;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) setState(() => _scale = 1.2);
    });
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedScale(
      scale: _scale,
      duration: const Duration(milliseconds: 150),
      curve: Curves.easeOut,
      child: widget.poster,
    );
  }
}