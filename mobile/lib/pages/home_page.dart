import 'package:flutter/material.dart';
import '../widgets/app_shell.dart';
import '../widgets/home_banner.dart';
import '../widgets/media_row.dart';

class HomePage extends StatelessWidget {
  const HomePage({super.key});

  @override
  Widget build(BuildContext context) {
    final movies = [
      MediaItem(title: 'Toy Story 5', imageUrl: 'https://image.tmdb.org/t/p/w342/6IyE0LmGh3AByCXykRfxWJqOKuY.jpg'),
      MediaItem(title: 'Michael', imageUrl: 'https://image.tmdb.org/t/p/w342/2AY6EQ6H0zGxu2FTG0k4bqUlUHm.jpg'),
      MediaItem(title: 'Obsession', imageUrl: 'https://image.tmdb.org/t/p/w342/9fCApNoRkc9JLnDdKF2Z6EM7ZTV.jpg'),
      MediaItem(title: 'Superman', imageUrl: 'https://image.tmdb.org/t/p/w342/8VG8fDNiy50H4FedGwdSVUPoaJe.jpg'),
      MediaItem(title: 'Deadpool 3', imageUrl: 'https://image.tmdb.org/t/p/w342/kZ2nHVdcbGeMkgOMSbeCcwvpiV6.jpg'),
      MediaItem(title: 'Dune Part Three', imageUrl: 'https://image.tmdb.org/t/p/w342/d5NXSklXo0qyIYkgV94XAgMIckC.jpg'),
    ];
    final shows = [
      MediaItem(title: 'The Last Airbender', imageUrl: 'https://image.tmdb.org/t/p/w342/qYTsRQNu1MdxTQ0BE0F7YOAOROq.jpg'),
      MediaItem(title: 'The Boys', imageUrl: 'https://image.tmdb.org/t/p/w342/2zmTngn1tYC1AvfnrFLhxeD82hz.jpg'),
      MediaItem(title: 'Hunter x Hunter', imageUrl: 'https://image.tmdb.org/t/p/w342/sPCigirDtGGGWTz3vpiJ0kAsW4o.jpg'),
      MediaItem(title: 'Stranger Things', imageUrl: 'https://image.tmdb.org/t/p/w342/49WJfeN22Rf9YNKrCE8AtHAV0Rq.jpg'),
      MediaItem(title: 'The Bear', imageUrl: 'https://image.tmdb.org/t/p/w342/zPIeaLBqcOAgprQfw2CBOWyLh0G.jpg'),
      MediaItem(title: 'Severance', imageUrl: 'https://image.tmdb.org/t/p/w342/lFf6LLrQjYldcZItzOkGmMMigP7.jpg'),
    ];
    final music = [
      MediaItem(title: 'Album One', imageUrl: 'https://image.tmdb.org/t/p/w342/6IyE0LmGh3AByCXykRfxWJqOKuY.jpg'),
      MediaItem(title: 'Album Two', imageUrl: 'https://image.tmdb.org/t/p/w342/2AY6EQ6H0zGxu2FTG0k4bqUlUHm.jpg'),
      MediaItem(title: 'Album Three', imageUrl: 'https://image.tmdb.org/t/p/w342/9fCApNoRkc9JLnDdKF2Z6EM7ZTV.jpg'),
      MediaItem(title: 'Album Four', imageUrl: 'https://image.tmdb.org/t/p/w342/8VG8fDNiy50H4FedGwdSVUPoaJe.jpg'),
      MediaItem(title: 'Album Five', imageUrl: 'https://image.tmdb.org/t/p/w342/kZ2nHVdcbGeMkgOMSbeCcwvpiV6.jpg'),
      MediaItem(title: 'Album Six', imageUrl: 'https://image.tmdb.org/t/p/w342/d5NXSklXo0qyIYkgV94XAgMIckC.jpg'),
    ];
    final games = [
      MediaItem(title: 'Spider-Man 2', imageUrl: 'https://image.tmdb.org/t/p/w342/qYTsRQNu1MdxTQ0BE0F7YOAOROq.jpg'),
      MediaItem(title: 'Batman Arkham Knight', imageUrl: 'https://image.tmdb.org/t/p/w342/2zmTngn1tYC1AvfnrFLhxeD82hz.jpg'),
      MediaItem(title: 'Red Dead Redemption', imageUrl: 'https://image.tmdb.org/t/p/w342/sPCigirDtGGGWTz3vpiJ0kAsW4o.jpg'),
      MediaItem(title: 'God of War', imageUrl: 'https://image.tmdb.org/t/p/w342/49WJfeN22Rf9YNKrCE8AtHAV0Rq.jpg'),
      MediaItem(title: 'Elden Ring', imageUrl: 'https://image.tmdb.org/t/p/w342/zPIeaLBqcOAgprQfw2CBOWyLh0G.jpg'),
      MediaItem(title: 'Zelda: Echoes', imageUrl: 'https://image.tmdb.org/t/p/w342/lFf6LLrQjYldcZItzOkGmMMigP7.jpg'),
    ];

    return AppShell(
      body: ListView(
        padding: const EdgeInsets.only(top: 16, bottom: 24),
        children: [
          const HomeBanner(),
          const SizedBox(height: 24),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            child: Text(
              'Trending',
              style: TextStyle(fontSize: 28, fontWeight: FontWeight.bold, color: Colors.deepPurple[700]),
            ),
          ),
          const SizedBox(height: 12),
          MediaRow(categoryTitle: 'Movies', items: movies),
          MediaRow(categoryTitle: 'Shows', items: shows),
          MediaRow(categoryTitle: 'Music', items: music),
          MediaRow(categoryTitle: 'Games', items: games),
        ],
      ),
    );
  }
}