import 'package:flutter/material.dart';
import '../services/media_service.dart';
import '../theme/app_colors.dart';
import '../widgets/app_shell.dart';
import '../widgets/media_row.dart';

// the user describes what they're in the mood for and gets back suggestions.
class AiSearchPage extends StatefulWidget {
  const AiSearchPage({super.key});

  @override
  State<AiSearchPage> createState() => _AiSearchPageState();
}

class _AiSearchPageState extends State<AiSearchPage> {
  final TextEditingController _controller = TextEditingController();
  bool _isLoading = false;
  bool _hasSearched = false;
  String _summary = '';
  List<MediaItem> _recommendations = [];

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Future<void> _askAi() async {
    final prompt = _controller.text.trim();
    if (prompt.isEmpty) return;

    FocusScope.of(context).unfocus();
    setState(() {
      _isLoading = true;
      _hasSearched = true;
    });

    final result = await MediaService().getAiRecommendations(prompt);

    if (!mounted) return;

    if (result['error'] != null) {
      setState(() {
        _summary = 'Something went wrong. Please try again.';
        _recommendations = [];
        _isLoading = false;
      });
      return;
    }

    final String aiMessage = result['message'] as String;
    final List<MediaItem> items = result['recommendations'] as List<MediaItem>;

    setState(() {
      _recommendations = items;
      _summary = aiMessage.isNotEmpty ? aiMessage : 'Here\'s what I found for "$prompt":';
      _isLoading = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    final screenWidth = MediaQuery.of(context).size.width;
    final cardWidth = (screenWidth - 60) / 2;
    final cardHeight = cardWidth * 1.5;

    return AppShell(
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Row(
              children: [
                Icon(Icons.auto_awesome, color: AppColors.primary),
                SizedBox(width: 8),
                Text(
                  'Ask AI',
                  style: TextStyle(fontSize: 28, fontWeight: FontWeight.bold, color: AppColors.primaryDark),
                ),
              ],
            ),
            const SizedBox(height: 8),
            const Text(
              "Tell me what you're in the mood for and I'll suggest something to watch, listen to, or play.",
              style: TextStyle(color: AppColors.textSecondary),
            ),
            const SizedBox(height: 20),
            Container(
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(24),
              ),
              child: TextField(
                controller: _controller,
                minLines: 1,
                maxLines: 3,
                textInputAction: TextInputAction.send,
                onSubmitted: (_) => _askAi(),
                decoration: InputDecoration(
                  hintText: 'e.g. "something like a cozy fantasy show"',
                  border: InputBorder.none,
                  contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                  suffixIcon: IconButton(
                    icon: const Icon(Icons.send, color: AppColors.primary),
                    onPressed: _isLoading ? null : _askAi,
                  ),
                ),
              ),
            ),
            const SizedBox(height: 24),
            if (_isLoading)
              const Center(child: CircularProgressIndicator(color: AppColors.primary))
            else if (_hasSearched) ...[
              Text(_summary, style: const TextStyle(fontWeight: FontWeight.w600)),
              const SizedBox(height: 16),
              if (_recommendations.isNotEmpty)
                Wrap(
                  spacing: 20,
                  runSpacing: 20,
                  children: _recommendations.map((item) {
                    return MediaCard(
                      item: item,
                      width: cardWidth,
                      height: cardHeight,
                    );
                  }).toList(),
                ),
            ],
          ],
        ),
      ),
    );
  }
}
