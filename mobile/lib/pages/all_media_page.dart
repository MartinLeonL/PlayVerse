import 'package:flutter/material.dart';
import '../main.dart';
import '../services/media_service.dart';
import '../services/playlist_store.dart';
import '../theme/app_colors.dart';
import '../widgets/app_shell.dart';
import '../widgets/media_row.dart';
import '../widgets/sort_dropdown.dart';
import 'search_page.dart';

class AllMediaPage extends StatefulWidget {
  final String title;
  final List<MediaItem> items;
  final bool isPlaylist;
  final String? mediaType; // when set (and not a playlist), this page fetches the full paginated catalog itself

  const AllMediaPage({
    super.key,
    required this.title,
    required this.items,
    this.isPlaylist = false,
    this.mediaType,
  });

  @override
  State<AllMediaPage> createState() => _AllMediaPageState();
}

class _AllMediaPageState extends State<AllMediaPage> with RouteAware {
  SortOption _sortOption = SortOption.trending;

  final List<MediaItem> _catalogItems = [];
  int _page = 1;
  bool _isLoadingMore = false;
  bool _hasMore = true;
  final ScrollController _scrollController = ScrollController();

  bool get _isBrowsingCatalog => !widget.isPlaylist && widget.mediaType != null;

  @override
  void initState() {
    super.initState();
    if (_isBrowsingCatalog) {
      _loadNextPage();
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

  String _sortParam(SortOption option) {
    switch (option) {
      case SortOption.aToZ:
        return 'az';
      case SortOption.zToA:
        return 'za';
      case SortOption.recent:
        return 'recent';
      case SortOption.highestRated:
        return 'highest';
      case SortOption.lowestRated:
        return 'lowest';
      case SortOption.trending:
        return 'trending';
    }
  }

  void _onSortChanged(SortOption option) {
    setState(() => _sortOption = option);
    if (_isBrowsingCatalog) {
      // Sort is applied server-side across the whole catalog, so a sort
      // change means starting over from page 1
      setState(() {
        _catalogItems.clear();
        _page = 1;
        _hasMore = true;
      });
      _loadNextPage();
    }
  }

  Future<void> _loadNextPage() async {
    if (_isLoadingMore || !_hasMore) return;
    setState(() => _isLoadingMore = true);

    final newItems = await MediaService().getAllByType(
      widget.mediaType!,
      page: _page,
      sort: _sortParam(_sortOption),
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
        list.sort((a, b) => (b.averageRating ?? -1).compareTo(a.averageRating ?? -1));
        break;
      case SortOption.lowestRated:
        list.sort((a, b) => (a.averageRating ?? double.infinity).compareTo(b.averageRating ?? double.infinity));
        break;
      case SortOption.recent:
        list.sort((a, b) => b.releaseDate.compareTo(a.releaseDate));
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
                              builder: (context) => SearchPage(targetPlaylistName: widget.title),
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
            SortDropdown(
              selected: _sortOption,
              onSelected: _onSortChanged,
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
                  playlistName: widget.isPlaylist ? widget.title : null,
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