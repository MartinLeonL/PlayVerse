import 'package:flutter/material.dart';
import '../pages/media_detail_page.dart';

class MediaItem {
  final String title;
  final String imageUrl;
  final String bannerUrl;
  final List<String> genres;
  final String description;
  final String runtime;
  final String language;
  final String releaseDate;
  final List<String> platforms;

  MediaItem({
    required this.title,
    required this.imageUrl,
    String? bannerUrl,
    this.genres = const [],
    this.description = 'No description available yet.',
    this.runtime = '--',
    this.language = '--',
    this.releaseDate = '--',
    this.platforms = const [],
  }) : bannerUrl = bannerUrl ?? imageUrl;
}

class MediaRow extends StatelessWidget {
  final String categoryTitle;
  final List<MediaItem> items;

  const MediaRow({
    super.key,
    required this.categoryTitle,
    required this.items,
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
          child: Text(
            categoryTitle,
            style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
          ),
        ),
        const SizedBox(height: 12),
        SizedBox(
          height: cardHeight + 45,
          child: ListView.builder(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 20),
            clipBehavior: Clip.none,
            itemCount: items.isEmpty ? 0 : 10000,
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

  void _addToPlaylist(BuildContext context, String playlistName) {
    // TODO: wire up real playlist storage once a backend exists
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('Added "${widget.item.title}" to $playlistName')),
    );
  }

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
                  icon: Icons.watch_later_outlined,
                  label: 'Add to Watch Later',
                  onTap: () {
                    Navigator.pop(context);
                    _addToPlaylist(context, 'Watch Later');
                  },
                ),
                _menuTile(
                  context,
                  icon: Icons.favorite_border,
                  label: 'Add to Favorites',
                  onTap: () {
                    Navigator.pop(context);
                    _addToPlaylist(context, 'Favorites');
                  },
                ),
                _menuTile(
                  context,
                  icon: Icons.playlist_add,
                  label: 'Add to New Playlist',
                  onTap: () {
                    Navigator.pop(context);
                    _addToPlaylist(context, 'a new playlist');
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

  Widget _menuTile(BuildContext context, {required IconData icon, required String label, required VoidCallback onTap}) {
    return InkWell(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
        child: Row(
          children: [
            Icon(icon, color: const Color(0xFF6C63C4)),
            const SizedBox(width: 16),
            Text(label, style: const TextStyle(fontSize: 16)),
          ],
        ),
      ),
    );
  }

  Widget _buildPoster() {
    return ClipRRect(
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