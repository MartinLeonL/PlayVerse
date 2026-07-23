import 'package:flutter/material.dart';
import '../main.dart';
import '../models/media_item.dart';
import '../services/media_service.dart';
import '../services/playlist_store.dart';
import '../theme/app_colors.dart';
import '../widgets/app_shell.dart';
import '../widgets/genre_picker.dart';
import '../widgets/media_row.dart';
import '../widgets/sort_dropdown.dart';
import 'search_page.dart';

class AllMediaPage extends StatefulWidget {
  final String title;
  final List<MediaItem> items;
  final bool isPlaylist;
  final String? playlistId; // required when isPlaylist is true
  final String? mediaType; // when set (and not a playlist), this page fetches the full paginated catalog itself

  const AllMediaPage({
    super.key,
    required this.title,
    required this.items,
    this.isPlaylist = false,
    this.playlistId,
    this.mediaType,
  });

  @override
  State<AllMediaPage> createState() => _AllMediaPageState();
}

class _AllMediaPageState extends State<AllMediaPage> with RouteAware {
  SortOption _sortOption = SortOption.trending;

  List<Map<String, dynamic>> _genres = [];
  dynamic _selectedGenreId; // null = "All Genres"

  final List<MediaItem> _catalogItems = [];
  int _page = 1;
  bool _isLoadingMore = false;
  bool _hasMore = true;
  final ScrollController _scrollController = ScrollController();

  bool get _isBrowsingCatalog => !widget.isPlaylist && widget.mediaType != null;

  // The genre endpoint uses plural category names, while mediaType
  // elsewhere in the app is singular — small mapping between the two.
  String get _pluralMediaType {
    switch (widget.mediaType) {
      case 'movie':
        return 'movies';
      case 'show':
        return 'shows';
      case 'game':
        return 'games';
      case 'music':
        return 'music';
      default:
        return '';
    }
  }

  @override
  void initState() {
    super.initState();
    if (_isBrowsingCatalog) {
      _loadNextPage();
      _loadGenres();
      _scrollController.addListener(_onScroll);
    }
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final route = ModalRoute.of(context);
    if (route is PageRoute) {
      routeObserver.subscribe(this, route);
    }
  }

  @override
  void dispose() {
    routeObserver.unsubscribe(this);
    _scrollController.dispose();
    super.dispose();
  }

  @override
  void didPopNext() {
    setState(() {});
  }

  void _onScroll() {
    if (_scrollController.position.pixels >= _scrollController.position.maxScrollExtent - 300) {
      _loadNextPage();
    }
  }

  Future<void> _loadGenres() async {
    final genres = await MediaService().getGenres(_pluralMediaType);
    if (mounted) setState(() => _genres = genres);
  }

  void _resetAndReload() {
    setState(() {
      _catalogItems.clear();
      _page = 1;
      _hasMore = true;
    });
    _loadNextPage();
  }

  void _onSortChanged(SortOption option) {
    setState(() => _sortOption = option);
    if (_isBrowsingCatalog) _resetAndReload();
  }

  void _onGenreChanged(dynamic genreId) {
    setState(() => _selectedGenreId = genreId);
    _resetAndReload();
  }

  Future<void> _loadNextPage() async {
    if (_isLoadingMore || !_hasMore) return;
    setState(() => _isLoadingMore = true);

    final newItems = await MediaService().getByType(
      widget.mediaType!,
      page: _page,
      sort: sortOptionToQueryValue(_sortOption),
      genre: _selectedGenreId?.toString(),
    );

    if (mounted) {
      setState(() {
        if (newItems.isEmpty) {
          _hasMore = false;
        } else {
          _catalogItems.addAll(newItems);
          _page++;
        }
        _isLoadingMore = false;
      });
    }
  }

  // Catalog browsing: already sorted server-side, use as-is.
  // Playlists: small fixed list, sorted client-side using each item's
  // own userScore field.
  List<MediaItem> get _displayItems {
    if (_isBrowsingCatalog) return _catalogItems;

    final list = List<MediaItem>.from(widget.items);
    switch (_sortOption) {
      case SortOption.aToZ:
        list.sort((a, b) => a.title.compareTo(b.title));
        break;
      case SortOption.zToA:
        list.sort((a, b) => b.title.compareTo(a.title));
        break;
      case SortOption.highestRated:
        list.sort((a, b) => (b.score ?? -1).compareTo(a.score ?? -1));
        break;
      case SortOption.lowestRated:
        list.sort((a, b) => (a.score ?? double.infinity).compareTo(b.score ?? double.infinity));
        break;
      case SortOption.recent:
        list.sort((a, b) => b.date.compareTo(a.date));
        break;
      case SortOption.userScoreDesc:
        list.sort((a, b) => (b.userScore ?? -1).compareTo(a.userScore ?? -1));
        break;
      case SortOption.userScoreAsc:
        list.sort((a, b) => (a.userScore ?? double.infinity).compareTo(b.userScore ?? double.infinity));
        break;
      case SortOption.trending:
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
        controller: _isBrowsingCatalog ? _scrollController : null,
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
                        onTap: () {
                          Navigator.push(
                            context,
                            MaterialPageRoute(
                              builder: (context) => SearchPage(
                                targetPlaylistId: widget.playlistId,
                                targetPlaylistName: widget.title,
                              ),
                            ),
                          );
                        },
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
            Wrap(
              spacing: 10,
              runSpacing: 10,
              children: [
                SortDropdown(
                  selected: _sortOption,
                  onSelected: _onSortChanged,
                  mediaType: widget.mediaType,
                ),
                if (_isBrowsingCatalog)
                  GenrePicker(
                    genres: _genres,
                    selectedGenreId: _selectedGenreId,
                    onSelected: _onGenreChanged,
                  ),
              ],
            ),
            const SizedBox(height: 20),
            if (widget.isPlaylist)
              const Padding(
                padding: EdgeInsets.only(bottom: 12),
                child: Text(
                  'Hold an item for more options — add to another playlist or remove it from this one.',
                  style: TextStyle(color: AppColors.textSecondary, fontSize: 13),
                ),
              ),
            Wrap(
              spacing: 20,
              runSpacing: 20,
              children: _displayItems.map((item) {
                return MediaCard(
                  item: item,
                  width: cardWidth,
                  height: cardHeight,
                  isPlaylist: widget.isPlaylist,
                  playlistId: widget.isPlaylist ? widget.playlistId : null,
                );
              }).toList(),
            ),
            if (_isBrowsingCatalog && _isLoadingMore)
              const Padding(
                padding: EdgeInsets.symmetric(vertical: 24),
                child: Center(child: CircularProgressIndicator()),
              ),
          ],
        ),
      ),
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
              if (widget.playlistId != null) {
                PlaylistStore.instance.deletePlaylist(widget.playlistId!);
              }
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