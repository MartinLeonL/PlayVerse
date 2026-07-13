import 'package:flutter/material.dart';
import '../widgets/app_shell.dart';
import '../widgets/media_row.dart';
import '../widgets/sort_dropdown.dart';

class AllMediaPage extends StatefulWidget {
  final String title;
  final List<MediaItem> items;

  const AllMediaPage({super.key, required this.title, required this.items});

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
        list.sort((a, b) => b.title.compareTo(a.title));
        break;
      case SortOption.recent:
      case SortOption.trending:
      case SortOption.highestRated:
      case SortOption.lowestRated:
        // TODO: hook up real recency/trending/rating data once the backend exists
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
            Text(
              'All ${widget.title}',
              style: TextStyle(fontSize: 28, fontWeight: FontWeight.bold, color: Colors.deepPurple[700]),
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
                return SizedBox(
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
                );
              }).toList(),
            ),
          ],
        ),
      ),
    );
  }
}