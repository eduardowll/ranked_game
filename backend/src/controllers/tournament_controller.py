from fastapi import APIRouter, HTTPException
from src.services.tournament_service import TournamentService
from src.models.tournament import TournamentCreate, MatchupResult, TournamentResult

# Cria o roteador para este módulo
router = APIRouter(tags=["Torneios"])

# Inicializa o Service
service = TournamentService()

@router.post("/torneios", status_code=201)
def criar_torneio(dados: TournamentCreate):
    try:
        novo_torneio = service.create_new_tournament(
            titulo=dados.titulo, 
            video_ids=dados.urls_youtube
        )
        return {"mensagem": "Torneio criado com sucesso!", "id": novo_torneio.id}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/torneios/{torneio_id}/jogar")
def iniciar_partida(torneio_id: str):
    try:
        videos = service.get_shuffled_videos_for_tournament(torneio_id)
        return {"torneio_id": torneio_id, "videos": videos}
    except Exception as e:
        raise HTTPException(status_code=404, detail="Torneio não encontrado.")

@router.post("/duelos/resultado")
def registrar_duelo(resultado: MatchupResult):
    try:
        service.register_match_winner(
            vencedor_id=resultado.vencedor_id, 
            perdedor_id=resultado.perdedor_id
        )
        return {"mensagem": "Resultado computado"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/torneios/finalizar")
def finalizar_torneio(resultado: TournamentResult):
    try:
        service.finish_tournament(
            tournament_id=resultado.torneio_id, 
            campeao_id=resultado.campeao_id
        )
        return {"mensagem": "Estatísticas do torneio atualizadas!"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))