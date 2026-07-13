import 'package:flutter/material.dart';

enum SortOption { recent, aToZ, zToA, trending, highestRated, lowestRated }

class SortDropdown extends StatefulWidget {
  final SortOption selected;
  final ValueChanged<SortOption> onSelected;

  const SortDropdown({super.key, required this.selected, required this.onSelected});

  @override
  State<SortDropdown> createState() => _SortDropdownState();
}

class _SortDropdownState extends State<SortDropdown> {
  bool _open = false;

  final Map<SortOption, String> _labels = {
    SortOption.recent: 'Recent',
    SortOption.aToZ: 'A - Z',
    SortOption.zToA: 'Z - A',
    SortOption.trending: 'Trending',
    SortOption.highestRated: 'Highest Ratings',
    SortOption.lowestRated: 'Lowest Ratings',
  };

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
              color: const Color(0xFF7C6FD8),
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
                      color: const Color(0xFF7C6FD8),
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