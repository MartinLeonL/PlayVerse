import 'package:flutter/material.dart';
import '../services/playlist_store.dart';
import '../theme/app_colors.dart';
import '../widgets/app_shell.dart';
import '../widgets/media_row.dart';

class PlaylistsPage extends StatefulWidget {
  const PlaylistsPage({super.key});

  @override
  State<PlaylistsPage> createState() => _PlaylistsPageState();
}

class _PlaylistsPageState extends State<PlaylistsPage> {
  final _store = PlaylistStore.instance;
  // Tracked separately from the store's own ChangeNotifier rebuilds, so
  // toggling collapse doesn't get reset by an unrelated playlist update
  // (like someone adding an item from elsewhere in the app).
  final Set<String> _collapsedIds = {};

  void _toggleCollapsed(String playlistId) {
    setState(() {
      if (_collapsedIds.contains(playlistId)) {
        _collapsedIds.remove(playlistId);
      } else {
        _collapsedIds.add(playlistId);
      }
    });
  }

  void _createNewPlaylist() {
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
            onPressed: () {
              _store.createPlaylist(controller.text);
              Navigator.pop(context);
            },
            child: const Text('Create'),
          ),
        ],
      ),
    );
  }

  void _renamePlaylist(BuildContext context, String playlistId, String currentName) {
    final controller = TextEditingController(text: currentName);
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Rename Playlist'),
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
            onPressed: () {
              _store.renamePlaylist(playlistId, controller.text);
              Navigator.pop(context);
            },
            child: const Text('Save'),
          ),
        ],
      ),
    );
  }

  void _confirmDeletePlaylist(BuildContext context, String playlistId, String name) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete Playlist?'),
        content: Text('This will permanently delete "$name".'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () {
              _store.deletePlaylist(playlistId);
              Navigator.pop(context);
            },
            child: const Text('Delete', style: TextStyle(color: AppColors.destructive)),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return AppShell(
      body: ListenableBuilder(
        listenable: _store,
        builder: (context, _) {
          return ReorderableListView(
            padding: const EdgeInsets.only(top: 16, bottom: 24),
            // Each playlist gets its own explicit drag handle instead —
            // the row itself has scrollable/tappable content inside it,
            // so making the whole thing draggable would conflict with that.
            buildDefaultDragHandles: false,
            onReorder: (oldIndex, newIndex) {
              _store.reorderPlaylists(oldIndex, newIndex);
            },
            header: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 20),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'PLAYLISTS',
                        style: TextStyle(fontSize: 28, fontWeight: FontWeight.bold, color: AppColors.primaryDark),
                      ),
                      GestureDetector(
                        onTap: _createNewPlaylist,
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
                              Text('New Playlist', style: TextStyle(color: Colors.white, fontSize: 14)),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),
              ],
            ),
            children: [
              for (int index = 0; index < _store.playlists.length; index++)
                Column(
                  key: ValueKey(_store.playlists[index].id),
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    MediaRow(
                      categoryTitle: _store.playlists[index].name,
                      items: _store.playlists[index].items,
                      loop: false,
                      titleOpensAll: true,
                      isPlaylist: true,
                      playlistId: _store.playlists[index].id,
                      onDelete: () => _confirmDeletePlaylist(context, _store.playlists[index].id, _store.playlists[index].name),
                      collapsed: _collapsedIds.contains(_store.playlists[index].id),
                      onToggleCollapse: () => _toggleCollapsed(_store.playlists[index].id),
                      onRename: () => _renamePlaylist(context, _store.playlists[index].id, _store.playlists[index].name),
                      dragHandle: ReorderableDragStartListener(
                        index: index,
                        child: const Icon(Icons.drag_handle, color: AppColors.textSecondary, size: 20),
                      ),
                    ),
                  ],
                ),
            ],
          );
        },
      ),
    );
  }
}