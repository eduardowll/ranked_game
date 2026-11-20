import unittest

from src.models.tournament import YouTubeSearchRequest
from src.services.youtube_search_service import rank_search_results


class YouTubeSearchServiceTests(unittest.TestCase):
    def test_ranks_matching_music_video_first_and_classifies_results(self):
        results = rank_search_results(
            [
                {
                    'id': {'videoId': 'abcdefghijk'},
                    'snippet': {
                        'title': 'Super Shy (Official Music Video)',
                        'channelTitle': 'NewJeans',
                        'thumbnails': {'high': {'url': 'https://img.example/mv.jpg'}},
                    },
                },
                {
                    'id': {'videoId': 'lmnopqrstuv'},
                    'snippet': {
                        'title': 'Super Shy Lyrics',
                        'channelTitle': 'NewJeans',
                        'thumbnails': {'medium': {'url': 'https://img.example/lyrics.jpg'}},
                    },
                },
                {'id': {'channelId': 'not-a-video'}, 'snippet': {'title': 'NewJeans'}},
            ],
            'Super Shy',
            'NewJeans',
        )

        self.assertEqual(len(results), 2)
        self.assertEqual(results[0]['video_id'], 'abcdefghijk')
        self.assertTrue(results[0]['recomendado'])
        self.assertEqual(results[0]['tipo'], 'MV')
        self.assertEqual(results[0]['thumbnail'], 'https://img.example/mv.jpg')
        self.assertEqual(results[1]['tipo'], 'Lyrics')
        self.assertFalse(results[1]['recomendado'])

    def test_search_terms_cannot_be_blank(self):
        with self.assertRaises(ValueError):
            YouTubeSearchRequest(musica='   ', artista='NewJeans')


if __name__ == '__main__':
    unittest.main()
