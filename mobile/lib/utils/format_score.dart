/// A perfect 10 drops its decimal ("10" not "10.0") since it's the
/// highest possible score — every other value keeps one decimal place.
String formatScore(double score) => score == 10 ? '10' : score.toStringAsFixed(1);
