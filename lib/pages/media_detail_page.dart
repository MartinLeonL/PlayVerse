import 'package:flutter/material.dart';
import '../services/api_service.dart';
import '../services/playlist_store.dart';
import '../theme/app_colors.dart';
import '../widgets/app_shell.dart';
import '../widgets/media_row.dart';

class MediaDetailPage extends StatefulWidget {
  final MediaItem item;

  const MediaDetailPage({super.key, required this.item});

  @override
  State<MediaDetailPage> createState() => _MediaDetailPageState();
}

class _MediaDetailPageState extends State<MediaDetailPage> {
  int? _userScore;

  Future<void> _addToPlaylist() async {
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
                  return ListTile(
                    leading: const Icon(Icons.playlist_play, color: AppColors.primary),
                    title: Text(playlistName),
                    onTap: () async {
                      final userId = await ApiService().getCurrentUserId();
                      if (userId != null) {
                        await ApiService().addMedia(
                          userId: userId,
                          mediaId: widget.item.title,
                          title: widget.item.title,
                          mediaType: 'movie',
                        );
                        store.addItemToPlaylist(playlistName, widget.item);
                      }
                      Navigator.pop(context);
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(content: Text('Added "${widget.item.title}" to $playlistName')),
                      );
                    },
                  );
                }),
              ],
            ),
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final item = widget.item;

    return AppShell(
      body: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Stack(
              clipBehavior: Clip.none,
              children: [
                ClipRRect(
                  child: Image.network(
                    item.bannerUrl,
                    height: 200,
                    width: double.infinity,
                    fit: BoxFit.cover,
                    errorBuilder: (context, error, stackTrace) => Container(
                      height: 200,
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
                          const Color(0xFFE1D9F0).withValues(alpha: 0.9),
                        ],
                      ),
                    ),
                  ),
                ),
                Positioned(
                  left: 0,
                  right: 0,
                  bottom: -70,
                  child: Center(
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(12),
                      child: Image.network(
                        item.imageUrl,
                        height: 180,
                        width: 130,
                        fit: BoxFit.cover,
                        errorBuilder: (context, error, stackTrace) => Container(
                          height: 180,
                          width: 130,
                          color: Colors.grey[300],
                        ),
                      ),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 80),
            Text(
              item.title,
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 26, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 4),
            if (item.genres.isNotEmpty)
              Text(
                item.genres.join('   '),
                textAlign: TextAlign.center,
                style: const TextStyle(color: AppColors.textSecondary, fontSize: 14),
              ),
            Padding(
              padding: const EdgeInsets.fromLTRB(24, 16, 24, 0),
              child: Text(
                item.description,
                textAlign: TextAlign.center,
                style: const TextStyle(fontSize: 15, height: 1.4),
              ),
            ),
            const SizedBox(height: 20),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24),
              child: Row(
                children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: _addToPlaylist,
                      icon: const Icon(Icons.add, color: AppColors.primary),
                      label: const Text('Playlist', style: TextStyle(color: AppColors.primary)),
                      style: OutlinedButton.styleFrom(
                        side: const BorderSide(color: AppColors.primary),
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(30)),
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: ElevatedButton.icon(
                      onPressed: () {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(content: Text('Trailer playback coming soon')),
                        );
                      },
                      icon: const Icon(Icons.play_arrow, color: Colors.white),
                      label: const Text('Trailer', style: TextStyle(color: Colors.white)),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.primary,
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(30)),
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: [
                      const Icon(Icons.star, color: AppColors.accent, size: 20),
                      const SizedBox(width: 4),
                      Text(
                        item.averageRating != null
                            ? '${item.averageRating!.toStringAsFixed(1)} (${item.ratingCount})'
                            : 'No ratings yet',
                        style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                      ),
                    ],
                  ),
                  Row(
                    children: [
                      Text(
                        _userScore != null ? '★ $_userScore/5' : '☆ --/5',
                        style: const TextStyle(fontSize: 16),
                      ),
                      IconButton(
                        icon: const Icon(Icons.edit, size: 18),
                        onPressed: () => _showScorePicker(context),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const Padding(
              padding: EdgeInsets.symmetric(horizontal: 24),
              child: Text('Where to watch', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            ),
            const SizedBox(height: 10),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24),
              child: item.platforms.isEmpty
                  ? const Text(
                      'Not currently available on any tracked platform.',
                      style: TextStyle(color: AppColors.textSecondary, fontSize: 14),
                    )
                  : Wrap(
                      spacing: 10,
                      runSpacing: 10,
                      children: item.platforms.map((platform) => _platformChip(platform)).toList(),
                    ),
            ),
            const SizedBox(height: 20),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  _infoColumn('Avg Runtime', item.runtime),
                  _infoColumn('Language', item.language),
                  _infoColumn('Release', item.releaseDate),
                ],
              ),
            ),
            const Divider(height: 32),
            const Padding(
              padding: EdgeInsets.symmetric(horizontal: 24),
              child: Text('Reviews', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            ),
            const SizedBox(height: 12),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24),
              child: Column(
                children: List.generate(3, (index) => _reviewCard()),
              ),
            ),
            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }

  void _showScorePicker(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Rate this'),
        content: Row(
          mainAxisSize: MainAxisSize.min,
          children: List.generate(5, (index) {
            final score = index + 1;
            return IconButton(
              icon: Icon(
                (_userScore ?? 0) >= score ? Icons.star : Icons.star_border,
                color: AppColors.accent,
              ),
              onPressed: () async {
                final userId = await ApiService().getCurrentUserId();
                if (userId != null) {
                  await ApiService().updateRating(
                    userId: userId,
                    mediaId: widget.item.title,
                    newUserRating: score.toDouble(),
                  );
                  setState(() => _userScore = score);
                }
                Navigator.pop(context);
              },
            );
          }),
        ),
      ),
    );
  }

  Widget _platformChip(String platform) {
    // your existing _platformChip code
    final iconData = _platformIcon(platform);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.1), blurRadius: 4)],
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(iconData.icon, color: iconData.color, size: 18),
          const SizedBox(width: 6),
          Text(platform, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
        ],
      ),
    );
  }

  ({IconData icon, Color color}) _platformIcon(String platform) {
    // your existing _platformIcon code
    switch (platform.toLowerCase()) {
      case 'netflix':
        return (icon: Icons.movie, color: Colors.red);
      case 'prime video':
      case 'amazon prime':
        return (icon: Icons.local_movies, color: Colors.blue);
      case 'youtube':
        return (icon: Icons.play_arrow, color: Colors.red);
      case 'hulu':
        return (icon: Icons.tv, color: Colors.green);
      case 'disney+':
      case 'disney plus':
        return (icon: Icons.stars, color: Colors.indigo);
      case 'hbo max':
      case 'max':
        return (icon: Icons.movie_filter, color: Colors.deepPurple);
      case 'spotify':
        return (icon: Icons.music_note, color: Colors.green);
      case 'apple tv+':
      case 'apple tv':
        return (icon: Icons.tv, color: Colors.black);
      default:
        return (icon: Icons.ondemand_video, color: Colors.grey);
    }
  }

  Widget _infoColumn(String label, String value) {
    return Column(
      children: [
        Text(label, style: const TextStyle(fontSize: 13, color: AppColors.textSecondary)),
        const SizedBox(height: 4),
        Text(value, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold)),
      ],
    );
  }

  Widget _reviewCard() {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: const [
          Text('John Doe', style: TextStyle(fontWeight: FontWeight.bold)),
          SizedBox(height: 4),
          Text(
            'This is a placeholder review. Real reviews will be pulled in once the backend is connected.',
            style: TextStyle(fontSize: 14, height: 1.4),
          ),
        ],
      ),
    );
  }
}