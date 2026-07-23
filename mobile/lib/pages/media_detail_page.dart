import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:audioplayers/audioplayers.dart';
import '../models/media_item.dart';
import '../models/review.dart';
import '../services/api_service.dart';
import '../services/media_service.dart';
import '../services/playlist_store.dart';
import '../theme/app_colors.dart';
import '../utils/format_score.dart';
import '../widgets/app_shell.dart';

class MediaDetailPage extends StatefulWidget {
  final MediaItem item;

  const MediaDetailPage({super.key, required this.item});

  @override
  State<MediaDetailPage> createState() => _MediaDetailPageState();
}

class _MediaDetailPageState extends State<MediaDetailPage> {
  // The item passed in (from a list/search/hero card) is the SPARSE
  // list-view shape — providers/trailerKey aren't populated there, only
  // on the single-item detail response. This holds that fuller version
  // once it loads; until then, the original item is used for anything
  // that's already present either way (title, poster, description).
  MediaItem? _detailedItem;

  int? _myScore; // 1-10
  final _noteController = TextEditingController();
  bool _isSavingReview = false;
  bool _isLoadingMyReview = true;

  List<Review> _reviews = [];
  bool _isLoadingReviews = true;

  MediaItem get _item => _detailedItem ?? widget.item;

  @override
  void initState() {
    super.initState();
    _loadFullDetails();
    _loadMyReview();
    _loadReviews();
  }

  @override
  void dispose() {
    _noteController.dispose();
    super.dispose();
  }

  Future<void> _loadFullDetails() async {
    final full = await MediaService().getMediaItem(type: widget.item.type, id: widget.item.id);
    if (full != null && mounted) {
      setState(() => _detailedItem = full);
    }
  }

  Future<void> _loadMyReview() async {
    try {
      final rating = await ApiService().getRating(mediaId: widget.item.id, mediaType: widget.item.type);
      if (mounted && rating != null) {
        setState(() {
          _myScore = (rating['score'] as num?)?.toInt();
          _noteController.text = rating['note'] as String? ?? '';
        });
      }
    } catch (_) {
      // not logged in, or no rating yet — leave the form blank
    } finally {
      if (mounted) setState(() => _isLoadingMyReview = false);
    }
  }

  Future<void> _loadReviews() async {
    final reviews = await MediaService().getReviews(mediaId: widget.item.id, mediaType: widget.item.type);
    if (mounted) {
      setState(() {
        _reviews = reviews;
        _isLoadingReviews = false;
      });
    }
  }

  Future<void> _saveReview() async {
    if (_myScore == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Pick a rating before saving.')),
      );
      return;
    }

    setState(() => _isSavingReview = true);
    try {
      await ApiService().setRating(
        mediaId: widget.item.id,
        mediaType: widget.item.type,
        score: _myScore!,
        note: _noteController.text.trim(),
      );
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Review saved')),
        );
      }
      // Refresh the public list so a note just saved shows up immediately.
      _loadReviews();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to save review: $e')),
        );
      }
    } finally {
      if (mounted) setState(() => _isSavingReview = false);
    }
  }

  // Mirrors web's exact logic: music prioritizes an in-app preview or
  // YouTube fallback; only counts as "can play" if one of those exists.
  bool get _canPlayCurrentMedia {
    final item = _item;
    if (item.type == 'music') {
      return (item.previewUrl?.isNotEmpty ?? false) || (item.youtubeVideoKey?.isNotEmpty ?? false);
    }
    return item.trailerKey != null && item.trailerKey!.isNotEmpty;
  }

  String get _playButtonLabel {
    final item = _item;
    if (item.type != 'music') {
      return item.trailerKey != null && item.trailerKey!.isNotEmpty ? 'Trailer' : 'Trailer unavailable';
    }
    if (_canPlayCurrentMedia) {
      return (item.previewUrl?.isNotEmpty ?? false) ? 'Play Preview' : 'Listen on YouTube';
    }
    if (item.externalUrl?.isNotEmpty ?? false) return 'Open in Deezer';
    return 'Music unavailable';
  }

  // Three distinct states for music, matching web exactly: play in-app
  // when possible; if not, open Deezer directly (not the in-app
  // player) when that's the only option; otherwise genuinely disabled.
  VoidCallback? _primaryButtonOnPressed(BuildContext context) {
    final item = _item;
    if (item.type != 'music') {
      return _canPlayCurrentMedia ? () => _openTrailerOrPlay(context) : null;
    }
    if (_canPlayCurrentMedia) return () => _openTrailerOrPlay(context);
    if (item.externalUrl?.isNotEmpty ?? false) return () => _openInDeezer(context);
    return null;
  }

  Future<void> _openInDeezer(BuildContext context) async {
    final url = Uri.tryParse(_item.externalUrl ?? '');
    if (url == null) return;
    try {
      await launchUrl(url, mode: LaunchMode.externalApplication);
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Could not open link: $e')),
        );
      }
    }
  }

  Future<void> _openTrailerOrPlay(BuildContext context) async {
    final item = _item;

    // Music prioritizes the real Deezer preview, played in-app —
    // matching web exactly, which only falls back to a YouTube link
    // when there's no preview audio at all for that track.
    if (item.type == 'music' && item.previewUrl != null && item.previewUrl!.isNotEmpty) {
      _showAudioPreview(item.previewUrl!, item.title);
      return;
    }

    String? videoIdToOpen;
    String? urlToOpen;

    if (item.type == 'music') {
      if (item.youtubeVideoKey != null && item.youtubeVideoKey!.isNotEmpty) {
        videoIdToOpen = item.youtubeVideoKey;
      } else if (item.externalUrl != null) {
        urlToOpen = item.externalUrl;
      }
    } else {
      videoIdToOpen = item.trailerKey;
    }

    Uri? url;
    if (videoIdToOpen != null && videoIdToOpen.isNotEmpty) {
      url = Uri.parse('https://www.youtube.com/watch?v=$videoIdToOpen');
    } else if (urlToOpen != null) {
      url = Uri.tryParse(urlToOpen);
    }

    if (url == null) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(item.type == 'music' ? 'No preview available' : 'No trailer found')),
        );
      }
      return;
    }

    try {
      await launchUrl(url, mode: LaunchMode.externalApplication);
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Could not open link: $e')),
        );
      }
    }
  }

  // Plays the 30-second Deezer preview in-app with real play/pause and
  // seek controls, instead of just linking out externally — matching
  // web's own inline <audio> player experience.
  void _showAudioPreview(String url, String title) {
    final player = AudioPlayer();
    bool isPlaying = false;
    Duration position = Duration.zero;
    Duration duration = Duration.zero;

    player.play(UrlSource(url));
    isPlaying = true;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setModalState) {
            player.onPlayerStateChanged.listen((state) {
              setModalState(() => isPlaying = state == PlayerState.playing);
            });
            player.onPositionChanged.listen((p) {
              setModalState(() => position = p);
            });
            player.onDurationChanged.listen((d) {
              setModalState(() => duration = d);
            });

            final maxMs = duration.inMilliseconds > 0 ? duration.inMilliseconds.toDouble() : 1.0;
            final positionMs = position.inMilliseconds.clamp(0, maxMs.toInt()).toDouble();

            return Container(
              padding: const EdgeInsets.fromLTRB(24, 24, 24, 32),
              decoration: const BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.only(topLeft: Radius.circular(24), topRight: Radius.circular(24)),
              ),
              child: SafeArea(
                top: false,
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      title,
                      textAlign: TextAlign.center,
                      style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 4),
                    const Text('Deezer preview', style: TextStyle(color: AppColors.textSecondary, fontSize: 13)),
                    const SizedBox(height: 12),
                    Slider(
                      value: positionMs,
                      max: maxMs,
                      activeColor: AppColors.primary,
                      onChanged: (value) => player.seek(Duration(milliseconds: value.toInt())),
                    ),
                    IconButton(
                      iconSize: 52,
                      color: AppColors.primary,
                      icon: Icon(isPlaying ? Icons.pause_circle_filled : Icons.play_circle_filled),
                      onPressed: () async {
                        if (isPlaying) {
                          await player.pause();
                        } else {
                          await player.resume();
                        }
                      },
                    ),
                  ],
                ),
              ),
            );
          },
        );
      },
    ).whenComplete(() => player.dispose());
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
                        ...store.playlists.map((playlist) {
                          return ListTile(
                            leading: const Icon(Icons.playlist_play, color: AppColors.primary),
                            title: Text(playlist.name),
                            onTap: () async {
                              final error = await PlaylistStore.instance.addItemToPlaylist(playlist.id, widget.item);
                              if (context.mounted) {
                                Navigator.pop(context);
                                ScaffoldMessenger.of(context).showSnackBar(
                                  SnackBar(content: Text(error == null ? 'Added "${widget.item.title}" to ${playlist.name}' : 'Failed to add: $error')),
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

              final playlist = await PlaylistStore.instance.createPlaylist(name);
              if (playlist == null) {
                if (dialogContext.mounted) {
                  ScaffoldMessenger.of(dialogContext).showSnackBar(
                    const SnackBar(content: Text('Failed to create playlist.')),
                  );
                }
                return;
              }

              final error = await PlaylistStore.instance.addItemToPlaylist(playlist.id, widget.item);
              if (dialogContext.mounted) {
                ScaffoldMessenger.of(dialogContext).showSnackBar(
                  SnackBar(content: Text(error == null ? 'Added "${widget.item.title}" to ${playlist.name}' : 'Failed to add: $error')),
                );
              }
            },
            child: const Text('Create'),
          ),
        ],
      ),
    );
  }

  String get _providersLabel {
    switch (_item.type) {
      case 'game':
        return 'Where to Play';
      case 'music':
        return 'Where to Listen';
      default:
        return 'Where to Watch';
    }
  }

  Color _colorFromHex(String hex) {
    final cleaned = hex.replaceAll('#', '');
    try {
      return Color(int.parse('FF$cleaned', radix: 16));
    } catch (_) {
      return Colors.grey;
    }
  }

  @override
  Widget build(BuildContext context) {
    final item = _item;

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
                    item.backdropImage ?? item.posterImage,
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
                        item.posterImage,
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
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    item.title,
                    style: const TextStyle(fontSize: 26, fontWeight: FontWeight.bold),
                  ),
                  if (item.artist != null && item.artist!.isNotEmpty)
                    Padding(
                      padding: const EdgeInsets.only(top: 4),
                      child: Text(
                        item.artist!,
                        style: const TextStyle(color: AppColors.textSecondary, fontSize: 15),
                      ),
                    ),
                  const SizedBox(height: 4),
                  if (item.genre.isNotEmpty)
                    Text(
                      item.genre,
                      style: const TextStyle(color: AppColors.textSecondary, fontSize: 14),
                    ),
                  if (item.type == 'game' && item.platforms.isNotEmpty)
                    Padding(
                      padding: const EdgeInsets.only(top: 4),
                      child: Text(
                        item.platforms.join(' • '),
                        style: const TextStyle(color: AppColors.textSecondary, fontSize: 13),
                      ),
                    ),
                ],
              ),
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
              child: Column(
                children: [
                  Row(
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
                          onPressed: _primaryButtonOnPressed(context),
                          icon: const Icon(Icons.play_arrow, color: Colors.white),
                          label: Text(_playButtonLabel, style: const TextStyle(color: Colors.white)),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppColors.primary,
                            padding: const EdgeInsets.symmetric(vertical: 14),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(30)),
                          ),
                        ),
                      ),
                    ],
                  ),
                  // Only shown when there's both something to play in-app
                  // (preview or YouTube) AND a separate Deezer link — if
                  // Deezer is the ONLY option, that already IS the play
                  // button above, so a second identical button here
                  // would be redundant.
                  if (item.type == 'music' && _canPlayCurrentMedia && (item.externalUrl?.isNotEmpty ?? false)) ...[
                    const SizedBox(height: 12),
                    SizedBox(
                      width: double.infinity,
                      child: OutlinedButton.icon(
                        onPressed: () => _openInDeezer(context),
                        icon: const Icon(Icons.play_arrow, color: AppColors.primary),
                        label: const Text('Open in Deezer', style: TextStyle(color: AppColors.primary)),
                        style: OutlinedButton.styleFrom(
                          side: const BorderSide(color: AppColors.primary),
                          padding: const EdgeInsets.symmetric(vertical: 14),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(30)),
                        ),
                      ),
                    ),
                  ],
                ],
              ),
            ),
            const SizedBox(height: 24),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24),
              child: Column(
                children: [
                  // Music has no external rating at all (Deezer tracks
                  // don't have one) — showing "N/A" here would just be
                  // permanent dead space, so this line is skipped
                  // entirely for that type rather than showing nothing.
                  if (item.type != 'music')
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(Icons.star, color: AppColors.accent, size: 20),
                        const SizedBox(width: 4),
                        Text(
                          item.score != null ? '${formatScore(item.score!)}/10' : 'N/A',
                          style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                        ),
                      ],
                    ),
                  if (item.type != 'music') const SizedBox(height: 4),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(Icons.star, color: Colors.blueAccent, size: 18),
                      const SizedBox(width: 4),
                      Text(
                        item.userScore != null ? '${formatScore(item.userScore!)}/10' : 'N/A',
                        style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Colors.blueAccent),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24),
              child: Text(_providersLabel, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            ),
            const SizedBox(height: 10),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24),
              child: item.providers.isEmpty
                  ? const Text(
                      'No providers found',
                      style: TextStyle(fontSize: 13, color: AppColors.textSecondary),
                    )
                  : Wrap(
                      spacing: 10,
                      runSpacing: 10,
                      children: item.providers.map((provider) {
                        return Container(
                          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                          decoration: BoxDecoration(
                            color: _colorFromHex(provider.bg),
                            borderRadius: BorderRadius.circular(20),
                          ),
                          child: Text(
                            provider.label,
                            style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: _colorFromHex(provider.fg)),
                          ),
                        );
                      }).toList(),
                    ),
            ),
            const SizedBox(height: 24),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  _infoColumn(item.durationLabel, item.duration),
                  if (item.language.isNotEmpty && item.language != 'N/A')
                    _infoColumn('Language', item.language),
                  _infoColumn('Release', item.date),
                ],
              ),
            ),
            const Divider(height: 32),
            _buildYourReviewSection(),
            const Divider(height: 32),
            _buildReviewsSection(),
            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }

  Widget _buildYourReviewSection() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Your Rating & Review', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
          const SizedBox(height: 12),
          if (_isLoadingMyReview)
            const Center(child: CircularProgressIndicator())
          else ...[
            // Two fixed rows of 5, rather than letting layout decide how
            // many fit per row.
            Column(
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: List.generate(5, (index) => _buildStarButton(index + 1)),
                ),
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: List.generate(5, (index) => _buildStarButton(index + 6)),
                ),
              ],
            ),
            if (_myScore != null)
              Center(
                child: Text('$_myScore/10', style: const TextStyle(fontWeight: FontWeight.bold)),
              ),
            const SizedBox(height: 12),
            TextField(
              controller: _noteController,
              maxLength: 500,
              maxLines: 4,
              decoration: const InputDecoration(
                hintText: 'Write a review — what did you think?',
                border: OutlineInputBorder(),
              ),
            ),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: _isSavingReview ? null : _saveReview,
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  padding: const EdgeInsets.symmetric(vertical: 12),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
                ),
                child: _isSavingReview
                    ? const SizedBox(height: 18, width: 18, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                    : const Text('Save Review', style: TextStyle(color: Colors.white)),
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildReviewsSection() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Reviews${_reviews.isNotEmpty ? ' (${_reviews.length})' : ''}', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
          const SizedBox(height: 12),
          if (_isLoadingReviews)
            const Center(child: CircularProgressIndicator())
          else if (_reviews.isEmpty)
            const Text(
              'No reviews yet — be the first to leave one.',
              style: TextStyle(color: AppColors.textSecondary, fontStyle: FontStyle.italic),
            )
          else
            ..._reviews.map((review) => _reviewCard(review)),
        ],
      ),
    );
  }

  Widget _reviewCard(Review review) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.06), blurRadius: 6, offset: const Offset(0, 2))],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(review.displayName, style: const TextStyle(fontWeight: FontWeight.bold)),
              Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(Icons.star, color: AppColors.accent, size: 16),
                  const SizedBox(width: 2),
                  Text('${review.score}/10', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                ],
              ),
            ],
          ),
          if (review.note.isNotEmpty) ...[
            const SizedBox(height: 6),
            Text(review.note, style: const TextStyle(fontSize: 14, height: 1.4)),
          ],
        ],
      ),
    );
  }

  Widget _buildStarButton(int starValue) {
    final filled = (_myScore ?? 0) >= starValue;
    return IconButton(
      icon: Icon(filled ? Icons.star : Icons.star_border, color: AppColors.accent),
      onPressed: () => setState(() => _myScore = starValue),
      visualDensity: VisualDensity.compact,
      padding: EdgeInsets.zero,
      constraints: const BoxConstraints(),
    );
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