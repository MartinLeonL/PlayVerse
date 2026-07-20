import 'package:flutter/material.dart';
import '../pages/all_media_page.dart';
import '../pages/media_detail_page.dart';
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
                                mediaType: isPlaylist
                                    ? null
                                    : (categoryTitle == 'Music' ? 'music' : (items.isNotEmpty ? items.first.mediaType : null)),
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
                      child: MediaCard(
                        item: item,
                        width: cardWidth,
                        height: cardHeight,
                        isPlaylist: isPlaylist,
                        playlistName: isPlaylist ? categoryTitle : null,
                      ),
                    );
                  },
                ),
        ),
        const SizedBox(height: 8),
      ],
    );
  }
}

/// Shared poster card used by both MediaRow (horizontal rows) and
/// AllMediaPage (full grid) — kept in one place so rating badges, the
/// long-press menu, and add/remove-from-playlist logic don't drift
/// out of sync between the two views.
class MediaCard extends StatefulWidget {
  final MediaItem item;
  final double width;
  final double height;
  final bool isPlaylist;
  final String? playlistName;

  const MediaCard({
    super.key,
    required this.item,
    required this.width,
    required this.height,
    this.isPlaylist = false,
    this.playlistName,
  });

  @override
  State<MediaCard> createState() => _MediaCardState();
}

class _MediaCardState extends State<MediaCard> {
  bool _isPressed = false;
  final LayerLink _layerLink = LayerLink();
  OverlayEntry? _overlayEntry;

  void _showOptionsMenu(BuildContext context) {
    final item = widget.item;
    final store = PlaylistStore.instance;
    // When shown inside a playlist, don't offer to "add" it to the very
    // same playlist it's already in.
    final addablePlaylists = store.playlists.keys.where((name) => name != widget.playlistName).toList();

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
                    _showPlaylistPicker(context, addablePlaylists);
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
                if (widget.isPlaylist && widget.playlistName != null)
                  _menuTile(
                    context,
                    icon: Icons.playlist_remove,
                    label: 'Remove from Playlist',
                    iconColor: AppColors.destructive,
                    onTap: () {
                      Navigator.pop(context);
                      _confirmRemove(context);
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

  void _confirmRemove(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Remove from Playlist?'),
        content: Text('Remove "${widget.item.title}" from "${widget.playlistName}"?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () async {
              Navigator.pop(context);
              await PlaylistStore.instance.removeItemFromPlaylist(widget.playlistName!, widget.item);
              if (context.mounted) {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(content: Text('Removed "${widget.item.title}" from ${widget.playlistName}')),
                );
              }
            },
            child: const Text('Remove', style: TextStyle(color: AppColors.destructive)),
          ),
        ],
      ),
    );
  }

  /// Adds this item to the user's playlist — appears instantly, syncs
  /// to the backend in the background (see PlaylistStore.addItemToPlaylist).
  Future<void> _persistAddToPlaylist(BuildContext context, String playlistName) async {
    final error = await PlaylistStore.instance.addItemToPlaylist(playlistName, widget.item);
    if (context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(error == null ? 'Added "${widget.item.title}" to $playlistName' : 'Failed to add: $error')),
      );
    }
  }

  void _showPlaylistPicker(BuildContext context, List<String> addablePlaylists) {
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
                        if (addablePlaylists.isEmpty)
                          const Padding(
                            padding: EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                            child: Text('No other playlists yet.', style: TextStyle(color: AppColors.textSecondary)),
                          ),
                        ...addablePlaylists.map((playlistName) {
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
            onPressed: () async {
              final name = controller.text.trim();
              final dialogContext = context;
              Navigator.pop(context);
              if (name.isEmpty) return;

              final store = PlaylistStore.instance;
              await store.createPlaylist(name);
              await _persistAddToPlaylist(dialogContext, name);
            },
            child: const Text('Create'),
          ),
        ],
      ),
    );
  }

  Widget _menuTile(BuildContext context, {required IconData icon, required String label, required VoidCallback onTap, Color? iconColor}) {
    return InkWell(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
        child: Row(
          children: [
            Icon(icon, color: iconColor ?? AppColors.primary),
            const SizedBox(width: 16),
            Text(label, style: TextStyle(fontSize: 16, color: iconColor)),
          ],
        ),
      ),
    );
  }

  Widget _buildPoster() {
    final isMusic = widget.item.mediaType == 'music';
    final artistName = isMusic && widget.item.genres.isNotEmpty ? widget.item.genres.first : null;

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
        if (artistName != null)
          Positioned(
            top: 6,
            right: 6,
            child: ConstrainedBox(
              constraints: BoxConstraints(maxWidth: widget.width - 12),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
                decoration: BoxDecoration(
                  color: Colors.black.withValues(alpha: 0.7),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  artistName,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold),
                ),
              ),
            ),
          )
        else if (widget.item.averageRating != null)
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