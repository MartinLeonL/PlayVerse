import 'package:flutter/material.dart';
import '../theme/app_colors.dart';

enum SortOption {
  recent,
  aToZ,
  zToA,
  trending,
  highestRated,
  lowestRated,
  userScoreAsc,
  userScoreDesc,
}

/// Maps a SortOption to the string the backend's ?sort= query param
/// expects (or null for "trending" — the default, no sort param sent
/// at all).
String? sortOptionToQueryValue(SortOption option) {
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
    case SortOption.userScoreAsc:
      return 'userScoreAsc';
    case SortOption.userScoreDesc:
      return 'userScoreDesc';
    case SortOption.trending:
      return null;
  }
}

class SortDropdown extends StatefulWidget {
  final SortOption selected;
  final ValueChanged<SortOption> onSelected;
  // Music has no external rating at all (Deezer doesn't track one), so
  // Highest/Lowest Rated are hidden specifically for it — the user-score
  // options still apply everywhere, since that's PlayVerse's own data.
  final String? mediaType;

  const SortDropdown({
    super.key,
    required this.selected,
    required this.onSelected,
    this.mediaType,
  });

  @override
  State<SortDropdown> createState() => _SortDropdownState();
}

class _SortDropdownState extends State<SortDropdown> {
  bool _open = false;

  static const Map<SortOption, String> _allLabels = {
    SortOption.recent: 'Recent',
    SortOption.aToZ: 'A - Z',
    SortOption.zToA: 'Z - A',
    SortOption.trending: 'Trending',
    SortOption.highestRated: 'Highest Ratings',
    SortOption.lowestRated: 'Lowest Ratings',
    SortOption.userScoreDesc: 'Highest User Score',
    SortOption.userScoreAsc: 'Lowest User Score',
  };

  Map<SortOption, String> get _labels {
    if (widget.mediaType != 'music') return _allLabels;
    return Map.fromEntries(
      _allLabels.entries.where(
        (entry) => entry.key != SortOption.highestRated && entry.key != SortOption.lowestRated,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
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
                const Text('Sort By:', style: TextStyle(color: Colors.white, fontSize: 16)),
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
                    margin: const EdgeInsets.only(top: 6),
                    padding: const EdgeInsets.symmetric(vertical: 6),
                    decoration: BoxDecoration(
                      color: AppColors.primary,
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: _labels.entries.map((entry) {
                        return InkWell(
                          onTap: () {
                            widget.onSelected(entry.key);
                            setState(() => _open = false);
                          },
                          child: Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                            child: Text(
                              entry.value,
                              style: const TextStyle(color: Colors.white, fontSize: 16),
                            ),
                          ),
                        );
                      }).toList(),
                    ),
                  )
                : const SizedBox.shrink(),
          ),
        ),
      ],
    );
  }
}