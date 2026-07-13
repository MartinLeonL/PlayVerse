import 'package:flutter/material.dart';
import '../pages/all_media_page.dart';
import '../widgets/media_row.dart';

class NavDropdown extends StatelessWidget {
  final bool visible;
  final VoidCallback onClose;

  const NavDropdown({super.key, required this.visible, required this.onClose});

  static final Map<String, List<MediaItem>> _categoryData = {
    'Movies': [
      MediaItem(title: 'Toy Story 5', imageUrl: 'https://image.tmdb.org/t/p/w342/6IyE0LmGh3AByCXykRfxWJqOKuY.jpg'),
      MediaItem(title: 'Michael', imageUrl: 'https://image.tmdb.org/t/p/w342/2AY6EQ6H0zGxu2FTG0k4bqUlUHm.jpg'),
      MediaItem(title: 'Obsession', imageUrl: 'https://image.tmdb.org/t/p/w342/9fCApNoRkc9JLnDdKF2Z6EM7ZTV.jpg'),
      MediaItem(title: 'Superman', imageUrl: 'https://image.tmdb.org/t/p/w342/8VG8fDNiy50H4FedGwdSVUPoaJe.jpg'),
      MediaItem(title: 'Deadpool 3', imageUrl: 'https://image.tmdb.org/t/p/w342/kZ2nHVdcbGeMkgOMSbeCcwvpiV6.jpg'),
      MediaItem(title: 'Dune Part Three', imageUrl: 'https://image.tmdb.org/t/p/w342/d5NXSklXo0qyIYkgV94XAgMIckC.jpg'),
    ],
    'TV Series': [
      MediaItem(title: 'The Last Airbender', imageUrl: 'https://image.tmdb.org/t/p/w342/qYTsRQNu1MdxTQ0BE0F7YOAOROq.jpg'),
      MediaItem(title: 'The Boys', imageUrl: 'https://image.tmdb.org/t/p/w342/2zmTngn1tYC1AvfnrFLhxeD82hz.jpg'),
      MediaItem(title: 'Hunter x Hunter', imageUrl: 'https://image.tmdb.org/t/p/w342/sPCigirDtGGGWTz3vpiJ0kAsW4o.jpg'),
      MediaItem(title: 'Stranger Things', imageUrl: 'https://image.tmdb.org/t/p/w342/49WJfeN22Rf9YNKrCE8AtHAV0Rq.jpg'),
      MediaItem(title: 'The Bear', imageUrl: 'https://image.tmdb.org/t/p/w342/zPIeaLBqcOAgprQfw2CBOWyLh0G.jpg'),
      MediaItem(title: 'Severance', imageUrl: 'https://image.tmdb.org/t/p/w342/lFf6LLrQjYldcZItzOkGmMMigP7.jpg'),
    ],
    'Music': [
      MediaItem(title: 'Album One', imageUrl: 'https://image.tmdb.org/t/p/w342/6IyE0LmGh3AByCXykRfxWJqOKuY.jpg'),
      MediaItem(title: 'Album Two', imageUrl: 'https://image.tmdb.org/t/p/w342/2AY6EQ6H0zGxu2FTG0k4bqUlUHm.jpg'),
      MediaItem(title: 'Album Three', imageUrl: 'https://image.tmdb.org/t/p/w342/9fCApNoRkc9JLnDdKF2Z6EM7ZTV.jpg'),
      MediaItem(title: 'Album Four', imageUrl: 'https://image.tmdb.org/t/p/w342/8VG8fDNiy50H4FedGwdSVUPoaJe.jpg'),
      MediaItem(title: 'Album Five', imageUrl: 'https://image.tmdb.org/t/p/w342/kZ2nHVdcbGeMkgOMSbeCcwvpiV6.jpg'),
      MediaItem(title: 'Album Six', imageUrl: 'https://image.tmdb.org/t/p/w342/d5NXSklXo0qyIYkgV94XAgMIckC.jpg'),
    ],
    'Games': [
      MediaItem(title: 'Spider-Man 2', imageUrl: 'https://image.tmdb.org/t/p/w342/qYTsRQNu1MdxTQ0BE0F7YOAOROq.jpg'),
      MediaItem(title: 'Batman Arkham Knight', imageUrl: 'https://image.tmdb.org/t/p/w342/2zmTngn1tYC1AvfnrFLhxeD82hz.jpg'),
      MediaItem(title: 'Red Dead Redemption', imageUrl: 'https://image.tmdb.org/t/p/w342/sPCigirDtGGGWTz3vpiJ0kAsW4o.jpg'),
      MediaItem(title: 'God of War', imageUrl: 'https://image.tmdb.org/t/p/w342/49WJfeN22Rf9YNKrCE8AtHAV0Rq.jpg'),
      MediaItem(title: 'Elden Ring', imageUrl: 'https://image.tmdb.org/t/p/w342/zPIeaLBqcOAgprQfw2CBOWyLh0G.jpg'),
      MediaItem(title: 'Zelda: Echoes', imageUrl: 'https://image.tmdb.org/t/p/w342/lFf6LLrQjYldcZItzOkGmMMigP7.jpg'),
    ],
  };

  @override
  Widget build(BuildContext context) {
    final items = [
      {'label': 'Movies', 'icon': Icons.local_movies},
      {'label': 'TV Series', 'icon': Icons.tv},
      {'label': 'Music', 'icon': Icons.music_note},
      {'label': 'Games', 'icon': Icons.sports_esports},
    ];

    return Positioned(
      top: 0,
      left: 0,
      child: Material(
        color: const Color(0xFF7C6FD8),
        borderRadius: const BorderRadius.only(bottomRight: Radius.circular(24)),
        elevation: visible ? 8 : 0,
        child: ClipRect(
          child: AnimatedSize(
            duration: const Duration(milliseconds: 250),
            curve: Curves.easeInOut,
            alignment: Alignment.topCenter,
            child: visible
                ? Padding(
                    padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 12),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: items.map((item) {
                        return InkWell(
                          onTap: () {
                            onClose();
                            final label = item['label'] as String;
                            Navigator.push(
                              context,
                              MaterialPageRoute(
                                builder: (context) => AllMediaPage(
                                  title: label,
                                  items: _categoryData[label] ?? [],
                                ),
                              ),
                            );
                          },
                          child: Padding(
                            padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 12),
                            child: Row(
                              children: [
                                Icon(item['icon'] as IconData, color: Colors.white),
                                const SizedBox(width: 16),
                                Text(
                                  item['label'] as String,
                                  style: const TextStyle(color: Colors.white, fontSize: 16),
                                ),
                              ],
                            ),
                          ),
                        );
                      }).toList(),
                    ),
                  )
                : const SizedBox.shrink(),
          ),
        ),
      ),
    );
  }
}