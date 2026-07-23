import 'package:flutter/material.dart';
import '../models/chat_message.dart';
import '../models/media_item.dart';
import '../services/media_service.dart';
import '../theme/app_colors.dart';
import '../utils/format_score.dart';
import '../widgets/app_shell.dart';
import 'media_detail_page.dart';

class AiSearchPage extends StatefulWidget {
  const AiSearchPage({super.key});

  @override
  State<AiSearchPage> createState() => _AiSearchPageState();
}

class _AiSearchPageState extends State<AiSearchPage> {
  final TextEditingController _controller = TextEditingController();
  final ScrollController _scrollController = ScrollController();
  List<ChatMessage> _messages = [];
  bool _isLoadingHistory = true;
  bool _isSending = false;

  @override
  void initState() {
    super.initState();
    _loadHistory();
  }

  @override
  void dispose() {
    _controller.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  Future<void> _loadHistory() async {
    final history = await MediaService().getChatHistory();
    if (mounted) {
      setState(() {
        _messages = history;
        _isLoadingHistory = false;
      });
      _scrollToBottom();
    }
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 250),
          curve: Curves.easeOut,
        );
      }
    });
  }

  Future<void> _send() async {
    final text = _controller.text.trim();
    if (text.isEmpty || _isSending) return;

    setState(() {
      _messages = [..._messages, ChatMessage(role: 'user', text: text)];
      _isSending = true;
    });
    _controller.clear();
    _scrollToBottom();

    try {
      final reply = await MediaService().sendChatMessage(text);
      if (mounted) {
        setState(() => _messages = [..._messages, reply]);
        _scrollToBottom();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(e.toString().replaceFirst('Exception: ', ''))),
        );
      }
    } finally {
      if (mounted) setState(() => _isSending = false);
    }
  }

  Future<void> _confirmClear() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Start a New Conversation?'),
        content: const Text('This clears your current chat history with the AI.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Clear', style: TextStyle(color: AppColors.destructive)),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      await MediaService().clearChat();
      if (mounted) setState(() => _messages = []);
    }
  }

  void _openRecommendation(ChatRecommendation rec) {
    if (rec.id == null || rec.id!.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text("Couldn't find this in our catalog.")),
      );
      return;
    }

    // A lightweight MediaItem built straight from the chat recommendation
    // — enough to show something immediately. MediaDetailPage already
    // silently fetches the full detail (genres, providers, trailer) in
    // the background once it opens, so this doesn't need to be complete.
    final item = MediaItem(
      id: rec.id!,
      type: rec.type,
      title: rec.title,
      posterImage: rec.poster ?? '',
      description: (rec.overview?.isNotEmpty ?? false) ? rec.overview! : rec.reason,
      score: rec.score,
      userScore: rec.userScore,
      userScoreCount: rec.userScoreCount,
      date: rec.releaseDate ?? 'Unknown',
    );

    Navigator.push(context, MaterialPageRoute(builder: (_) => MediaDetailPage(item: item)));
  }

  @override
  Widget build(BuildContext context) {
    return AppShell(
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 16, 20, 8),
            child: Row(
              children: [
                const Icon(Icons.auto_awesome, color: AppColors.primary),
                const SizedBox(width: 8),
                const Expanded(
                  child: Text('Ask AI', style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: AppColors.primaryDark)),
                ),
                if (_messages.isNotEmpty)
                  IconButton(
                    icon: const Icon(Icons.refresh, color: AppColors.textSecondary),
                    tooltip: 'New conversation',
                    onPressed: _confirmClear,
                  ),
              ],
            ),
          ),
          Expanded(
            child: _isLoadingHistory
                ? const Center(child: CircularProgressIndicator())
                : _messages.isEmpty
                    ? const Center(
                        child: Padding(
                          padding: EdgeInsets.symmetric(horizontal: 40),
                          child: Text(
                            "Tell me what you're in the mood for and I'll suggest something to watch, listen to, or play.",
                            textAlign: TextAlign.center,
                            style: TextStyle(color: AppColors.textSecondary),
                          ),
                        ),
                      )
                    : ListView.builder(
                        controller: _scrollController,
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                        itemCount: _messages.length,
                        itemBuilder: (context, index) => _buildMessage(_messages[index]),
                      ),
          ),
          if (_isSending)
            const Padding(
              padding: EdgeInsets.only(bottom: 8),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  SizedBox(height: 14, width: 14, child: CircularProgressIndicator(strokeWidth: 2)),
                  SizedBox(width: 8),
                  Text('Thinking...', style: TextStyle(color: AppColors.textSecondary, fontSize: 13)),
                ],
              ),
            ),
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
            child: Container(
              decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(24)),
              child: TextField(
                controller: _controller,
                minLines: 1,
                maxLines: 3,
                textInputAction: TextInputAction.send,
                onSubmitted: (_) => _send(),
                decoration: InputDecoration(
                  hintText: 'e.g. "something like a cozy fantasy show"',
                  border: InputBorder.none,
                  contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                  suffixIcon: IconButton(
                    icon: const Icon(Icons.send, color: AppColors.primary),
                    onPressed: _isSending ? null : _send,
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMessage(ChatMessage message) {
    final isUser = message.role == 'user';

    return Column(
      crossAxisAlignment: isUser ? CrossAxisAlignment.end : CrossAxisAlignment.start,
      children: [
        if (message.text.isNotEmpty)
          Align(
            alignment: isUser ? Alignment.centerRight : Alignment.centerLeft,
            child: Container(
              constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.8),
              margin: const EdgeInsets.only(bottom: 12),
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
              decoration: BoxDecoration(
                color: isUser ? AppColors.primary : Colors.white,
                borderRadius: BorderRadius.circular(16),
              ),
              child: Text(
                message.text,
                style: TextStyle(color: isUser ? Colors.white : Colors.black87, fontSize: 15),
              ),
            ),
          ),
        if (message.recommendations.isNotEmpty)
          // Deliberately NOT constrained to the text bubble's 80% width —
          // that constraint was accidentally clipping the last card even
          // though there was clearly more screen width available. This
          // gets the full row's own space, boxed as one cohesive panel
          // rather than cards floating loosely against the background.
          Container(
            width: double.infinity,
            margin: const EdgeInsets.only(bottom: 12),
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.6),
              borderRadius: BorderRadius.circular(18),
            ),
            child: SizedBox(
              height: 205,
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                itemCount: message.recommendations.length,
                separatorBuilder: (context, index) => const SizedBox(width: 10),
                itemBuilder: (context, index) => _recommendationCard(message.recommendations[index]),
              ),
            ),
          ),
      ],
    );
  }

  // A perfect 10 drops its decimal ("10" not "10.0") since it's the
  // highest possible score — every other value keeps one decimal place,
  // matching the convention used everywhere else in the app.

  Widget _recommendationCard(ChatRecommendation rec) {
    return GestureDetector(
      onTap: () => _openRecommendation(rec),
      child: Container(
        width: 120,
        decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12)),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            ClipRRect(
              borderRadius: const BorderRadius.vertical(top: Radius.circular(12)),
              child: rec.poster != null
                  ? Image.network(
                      rec.poster!,
                      height: 130,
                      width: 120,
                      fit: BoxFit.cover,
                      errorBuilder: (context, error, stackTrace) => Container(
                        height: 130,
                        width: 120,
                        color: Colors.grey[300],
                        child: const Icon(Icons.image_not_supported, color: Colors.grey),
                      ),
                    )
                  : Container(
                      height: 130,
                      width: 120,
                      color: Colors.grey[300],
                      child: const Icon(Icons.image_not_supported, color: Colors.grey),
                    ),
            ),
            Padding(
              padding: const EdgeInsets.all(6),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    rec.title,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
                  ),
                  if (rec.score != null)
                    Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(Icons.star, color: AppColors.accent, size: 11),
                        const SizedBox(width: 2),
                        Text('${formatScore(rec.score!)}/10', style: const TextStyle(fontSize: 10)),
                      ],
                    ),
                  if (rec.userScore != null)
                    Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(Icons.star, color: Colors.blueAccent, size: 11),
                        const SizedBox(width: 2),
                        Text('${formatScore(rec.userScore!)}/10', style: const TextStyle(fontSize: 10)),
                      ],
                    ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}