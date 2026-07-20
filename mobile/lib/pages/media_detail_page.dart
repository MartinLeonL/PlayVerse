import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import '../services/api_service.dart';
import '../services/media_service.dart';
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
  String _userNote = '';
  bool _loadingEntry = true;


  late String _runtime = widget.item.runtime;
  late String _language = widget.item.language;
  late List<String> _platforms = widget.item.platforms;
  late String _releaseDate = widget.item.releaseDate;

  @override
  void initState() {
    super.initState();
    _loadExistingEntry();
    _loadMediaDetails();
  }

  Future<void> _loadExistingEntry() async {
    try {
      final userId = await ApiService().getCurrentUserId();
      if (userId != null) {
        final entry = await ApiService().getMediaUserEntry(
          userId: userId,
          mediaId: widget.item.mediaId,
        );
        if (mounted) {
          setState(() {
            _userScore = entry['rating'] != null ? (entry['rating'] as double).round() : null;
            _userNote = entry['note'] as String;
          });
        }
      }
    } catch (_) {
      // if the item isn't in the user's playlist yet, or the request
      // fails, just fall back to the blank/default state silently
    } finally {
      if (mounted) setState(() => _loadingEntry = false);
    }
  }

  Future<void> _loadMediaDetails() async {
    final details = await MediaService().getMediaDetails(
      mediaType: widget.item.mediaType,
      mediaId: widget.item.mediaId,
    );
    if (details != null && mounted) {
      setState(() {
        _runtime = details['runtime'] ?? _runtime;
        _language = details['language'] ?? _language;
        _platforms = List<String>.from(details['platforms'] ?? _platforms);
        _releaseDate = (details['releaseDate'] as String?)?.isNotEmpty == true ? details['releaseDate'] : _releaseDate;
      });
    }
  }

  Future<void> _openTrailer(BuildContext context) async {
    // Music doesn't need a trailer search — the track's own Deezer page
    // is right there from its mediaId, so just open that directly.
    if (widget.item.mediaType == 'music') {
      final trackId = widget.item.mediaId.replaceFirst('deezer-', '');
      final url = Uri.parse('https://www.deezer.com/track/$trackId');
      try {
        await launchUrl(url, mode: LaunchMode.externalApplication);
      } catch (e) {
        if (context.mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Could not open Deezer: $e')),
          );
        }
      }
      return;
    }

    final videoId = await ApiService().getTrailerVideoId(
      title: widget.item.title,
      mediaType: widget.item.mediaType,
    );

    if (videoId == null) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('No trailer found')),
        );
      }
      return;
    }

    final url = Uri.parse('https://www.youtube.com/watch?v=$videoId');
    try {
      // Deliberately not calling canLaunchUrl first — on Android 11+ it
      // can report false even when a browser IS available, unless the
      // app declares a <queries> entry in AndroidManifest.xml for the
      // https scheme. Attempting launchUrl directly avoids that.
      await launchUrl(url, mode: LaunchMode.externalApplication);
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Could not open trailer: $e')),
        );
      }
    }
  }

  Future<void> _editNote(BuildContext context) async {
    final controller = TextEditingController(text: _userNote);
    final result = await showDialog<String>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Personal Note'),
        content: TextField(
          controller: controller,
          maxLength: 500,
          maxLines: 5,
          decoration: const InputDecoration(
            hintText: 'Write a personal note about this...',
            border: OutlineInputBorder(),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, controller.text.trim()),
            child: const Text('Save'),
          ),
        ],
      ),
    );

    if (result == null) return; // cancelled

    try {
      final userId = await ApiService().getCurrentUserId();
      if (userId == null) return;
      await ApiService().updateNote(
        userId: userId,
        mediaId: widget.item.mediaId,
        title: widget.item.title,
        mediaType: widget.item.mediaType,
        note: result,
      );
      if (mounted) {
        setState(() => _userNote = result);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Note saved')),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to save note: $e')),
        );
      }
    }
  }

  Future<void> _addToPlaylist() async {
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
                        ...store.playlists.keys.map((playlistName) {
                          return ListTile(
                            leading: const Icon(Icons.playlist_play, color: AppColors.primary),
                            title: Text(playlistName),
                            onTap: () async {
                              final error = await PlaylistStore.instance.addItemToPlaylist(playlistName, widget.item);
                              if (context.mounted) {
                                Navigator.pop(context);
                                ScaffoldMessenger.of(context).showSnackBar(
                                  SnackBar(content: Text(error == null ? 'Added "${widget.item.title}" to $playlistName' : 'Failed to add: $error')),
                                );
                              }
                            },
                          );
                        }),
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
                      onPressed: () => _openTrailer(context),
                      icon: const Icon(Icons.play_arrow, color: Colors.white),
                      label: Text(item.mediaType == 'music' ? 'Play' : 'Trailer', style: const TextStyle(color: Colors.white)),
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
            if (item.mediaType != 'music') ...[
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 24),
                child: Text(
                  item.mediaType == 'game' ? 'Where to play' : 'Where to watch',
                  style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                ),
              ),
              const SizedBox(height: 10),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 24),
                child: _platforms.isEmpty
                    ? const Text(
                        'Not currently available on any tracked platform.',
                        style: TextStyle(color: AppColors.textSecondary, fontSize: 14),
                      )
                    : Wrap(
                        spacing: 10,
                        runSpacing: 10,
                        children: _platforms.map((platform) => _platformChip(platform)).toList(),
                      ),
              ),
              const SizedBox(height: 20),
            ],
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('Personal Note', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                  IconButton(
                    icon: const Icon(Icons.edit, size: 18),
                    onPressed: () => _editNote(context),
                  ),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24),
              child: Text(
                _userNote.isEmpty ? 'No note yet — tap the pencil to add one.' : _userNote,
                style: TextStyle(
                  fontSize: 14,
                  height: 1.4,
                  color: _userNote.isEmpty ? AppColors.textSecondary : Colors.black87,
                  fontStyle: _userNote.isEmpty ? FontStyle.italic : FontStyle.normal,
                ),
              ),
            ),
            const SizedBox(height: 20),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  _infoColumn('Runtime', _runtime),
                  if (item.mediaType != 'game' && item.mediaType != 'music')
                    _infoColumn('Language', _language),
                  _infoColumn('Release', _releaseDate),
                ],
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
                    mediaId: widget.item.mediaId,
                    title: widget.item.title,
                    mediaType: widget.item.mediaType,
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
}