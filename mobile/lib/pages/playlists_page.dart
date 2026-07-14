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

  void _confirmDeletePlaylist(BuildContext context, String name) {
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
              _store.deletePlaylist(name);
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
          return ListView(
            padding: const EdgeInsets.only(top: 16, bottom: 24),
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
              ..._store.playlists.entries.map((entry) {
                return MediaRow(
                  categoryTitle: entry.key,
                  items: entry.value,
                  loop: false,
                  titleOpensAll: true,
                  isPlaylist: true,
                  onDelete: () => _confirmDeletePlaylist(context, entry.key),
                );
              }),
            ],
          );
        },
      ),
    );
  }
}