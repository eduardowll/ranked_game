from google.cloud.firestore import Increment
from src.database import db
from src.models.tournament import TournamentTheme

class TournamentRepository:
    def __init__(self):
        # Aponta para a coleção 'tournaments' no Firestore
        self.collection = db.collection('tournaments')

    def create_tournament(self, theme: TournamentTheme):
        """Cria um novo torneio e deixa o Firebase gerar um ID único automaticamente"""
        data = theme.model_dump(exclude={'id'})
        
        doc_time, doc_ref = self.collection.add(data)
        
        theme.id = doc_ref.id
        return theme

    def get_tournament(self, tournament_id: str) -> TournamentTheme:
        """Busca os detalhes de um torneio específico pelo ID"""
        doc = self.collection.document(tournament_id).get()
        if doc.exists:
            data = doc.to_dict()
            data['id'] = doc.id 
            return TournamentTheme(**data)
        return None

    def get_all_tournaments(self):
        """Busca todos os torneios (Ideal para a tela inicial do site)"""
        docs = self.collection.stream()
        tournaments = []
        for doc in docs:
            data = doc.to_dict()
            data['id'] = doc.id
            tournaments.append(TournamentTheme(**data))
        return tournaments

    def increment_play_count(self, tournament_id: str):
        """Soma +1 na estatística de quantas vezes a galera já jogou esse torneio"""
        doc_ref = self.collection.document(tournament_id)
        doc_ref.update({
            'vezes_jogado': Increment(1)
        })