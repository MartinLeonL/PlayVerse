import 'package:flutter/material.dart';
import '../services/playlist_store.dart';
import '../theme/app_colors.dart';
import '../widgets/app_shell.dart';
import '../widgets/media_row.dart';
import 'media_detail_page.dart';
import '../widgets/sort_dropdown.dart';

class AllMediaPage extends StatefulWidget {
  final String title;
  final List<MediaItem> items;
  final bool isPlaylist;

  const AllMediaPage({
    super.key,
    required this.title,
    required this.items,
    this.isPlaylist = false,
  });

  @override
  State<AllMediaPage> createState() => _AllMediaPageState();
}

class _AllMediaPageState extends State<AllMediaPage> {
  SortOption _sortOption = SortOption.recent;

  List<MediaItem> get _sortedItems {
    final list = List<MediaItem>.from(widget.items);
    switch (_sortOption) {
      case SortOption.aToZ:
        list.sort((a, b) => a.title.compareTo(b.title));
        break;
      case SortOption.zToA:
        list.sort((a, b) => b.title.compareTo(b.title));
        break;
      case SortOption.recent:
      case SortOption.trending:
      case SortOption.highestRated:
      case SortOption.lowestRated:
        // TODO: will use real backend sorting later
        break;
    }
    return list;
  }

  @override
  Widget build(BuildContext context) {
    final screenWidth = MediaQuery.of(context).size.width;
    final cardWidth = (screenWidth - 60) / 2;
    final cardHeight = cardWidth * 1.5;

    return AppShell(
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (widget.isPlaylist)
              Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: GestureDetector(
                  onTap: () => Navigator.pop(context),
                  child: const Row(
                    children: [
                      Icon(Icons.arrow_back, size: 20, color: Colors.black87),
                      SizedBox(width: 4),
                      Text('All Playlists', style: TextStyle(fontSize: 14, color: Colors.black87)),
                    ],
                  ),
                ),
              ),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Text(
                    widget.isPlaylist ? widget.title : 'All ${widget.title}',
                    style: const TextStyle(fontSize: 28, fontWeight: FontWeight.bold, color: AppColors.primaryDark),
                  ),
                ),
                if (widget.isPlaylist)
                  Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      GestureDetector(
                        onTap: () => _addToPlaylist(context),
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                          decoration: BoxDecoration(
                            color: AppColors.primary,
                            borderRadius: BorderRadius.circular(20),
                          ),
                          child: const Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(Icons.add, color: Colors.white, size: 16),
                              SizedBox(width: 4),
                              Text('Add to Playlist', style: TextStyle(color: Colors.white, fontSize: 13)),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      GestureDetector(
                        onTap: () => _confirmDeletePlaylist(context),
                        child: Container(
                          padding: const EdgeInsets.all(8),
                          decoration: BoxDecoration(
                            color: AppColors.destructive,
                            borderRadius: BorderRadius.circular(20),
                          ),
                          child: const Icon(Icons.delete_outline, color: Colors.white, size: 18),
                        ),
                      ),
                    ],
                  ),
              ],
            ),
            const SizedBox(height: 12),
            SortDropdown(
              selected: _sortOption,
              onSelected: (option) => setState(() => _sortOption = option),
            ),
            const SizedBox(height: 20),
            Wrap(
              spacing: 20,
              runSpacing: 20,
              children: _sortedItems.map((item) {
                return GestureDetector(
                  onTap: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(builder: (context) => MediaDetailPage(item: item)),
                    );
                  },
                  child: SizedBox(
                    width: cardWidth,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        ClipRRect(
                          borderRadius: BorderRadius.circular(10),
                          child: Image.network(
                            item.imageUrl,
                            height: cardHeight,
                            width: cardWidth,
                            fit: BoxFit.cover,
                            errorBuilder: (context, error, stackTrace) => Container(
                              height: cardHeight,
                              width: cardWidth,
                              color: Colors.grey[300],
                              child: const Icon(Icons.image_not_supported, color: Colors.grey),
                            ),
                          ),
                        ),
                        const SizedBox(height: 6),
                        Text(
                          item.title,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(fontSize: 16),
                        ),
                      ],
                    ),
                  ),
                );
              }).toList(),
            ),
          ],
        ),
      ),
    );
  }

  void _addToPlaylist(BuildContext context) {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Pick an item, then long-press it to add to a playlist.')),
    );
  }

  void _confirmDeletePlaylist(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete Playlist?'),
        content: Text('This will permanently delete "${widget.title}".'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () {
              PlaylistStore.instance.deletePlaylist(widget.title);
              Navigator.pop(context);
              Navigator.pop(context);
            },
            child: const Text('Delete', style: TextStyle(color: AppColors.destructive)),
          ),
        ],
      ),
    );
  }
}