import 'package:flutter/material.dart';
import '../theme/app_colors.dart';

class GenrePicker extends StatefulWidget {
  final List<Map<String, dynamic>> genres;
  // Genre ids vary by source: TMDB/Deezer use numbers, RAWG uses string
  // slugs — kept as dynamic rather than forcing everything into one type.
  final dynamic selectedGenreId;
  final ValueChanged<dynamic> onSelected;

  const GenrePicker({
    super.key,
    required this.genres,
    required this.selectedGenreId,
    required this.onSelected,
  });

  @override
  State<GenrePicker> createState() => _GenrePickerState();
}

class _GenrePickerState extends State<GenrePicker> {
  bool _open = false;

  String get _selectedLabel {
    if (widget.selectedGenreId == null) return 'All Genres';
    final match = widget.genres.firstWhere(
      (g) => g['id'] == widget.selectedGenreId,
      orElse: () => {'name': 'All Genres'},
    );
    return match['name'] as String;
  }

  @override
  Widget build(BuildContext context) {
    if (widget.genres.isEmpty) return const SizedBox.shrink();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        GestureDetector(
          onTap: () => setState(() => _open = !_open),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
            decoration: BoxDecoration(
              color: AppColors.primary,
              borderRadius: BorderRadius.circular(20),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text('Genre: $_selectedLabel', style: const TextStyle(color: Colors.white, fontSize: 16)),
                const SizedBox(width: 6),
                Icon(_open ? Icons.keyboard_arrow_up : Icons.keyboard_arrow_down, color: Colors.white),
              ],
            ),
          ),
        ),
        ClipRect(
          child: AnimatedSize(
            duration: const Duration(milliseconds: 250),
            curve: Curves.easeInOut,
            alignment: Alignment.topCenter,
            child: _open
                ? Container(
                    constraints: const BoxConstraints(maxHeight: 280),
                    margin: const EdgeInsets.only(top: 6),
                    padding: const EdgeInsets.symmetric(vertical: 6),
                    decoration: BoxDecoration(
                      color: AppColors.primary,
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: SingleChildScrollView(
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          _tile('All Genres', null),
                          ...widget.genres.map((g) => _tile(g['name'] as String, g['id'])),
                        ],
                      ),
                    ),
                  )
                : const SizedBox.shrink(),
          ),
        ),
      ],
    );
  }

  Widget _tile(String label, dynamic value) {
    return InkWell(
      onTap: () {
        widget.onSelected(value);
        setState(() => _open = false);
      },
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
        child: Text(label, style: const TextStyle(color: Colors.white, fontSize: 16)),
      ),
    );
  }
}