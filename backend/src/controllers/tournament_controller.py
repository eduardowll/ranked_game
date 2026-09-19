from fastapi import APIRouter, HTTPException
from src.services.tournament_service import TournamentService
from src.models.tournament import VideoCreate, TournamentCreate, MatchupResult, TournamentResult

# Cria o roteador para este módulo
router = APIRouter(tags=["Torneios"])

# Inicializa o Service
service = TournamentService()

@router.post("/torneios", status_code=201)
def criar_torneio(dados: TournamentCreate):
    try:
        novo_torneio = service.create_new_tournament(
            titulo=dados.titulo,
        )
        return {"mensagem": "Torneio criado com sucesso!", "id": novo_torneio.id}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/videos", status_code=201)
def cadastrar_video(dados: VideoCreate):
    try:
        video = service.add_video_to_catalog(dados.url_youtube)
        return video
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/videos")
def listar_videos():
    return service.video_repo.get_all_videos()

@router.get("/torneios")
def listar_torneios():
    return service.get_all_tournaments()

@router.get("/torneios/{torneio_id}")
def detalhes_torneio(torneio_id: str):
    try:
        torneio = service.tournament_repo.get_tournament(torneio_id)
        if not torneio:
            raise ValueError("Torneio não encontrado.")
        return {
            "torneio": torneio,
            "ranking": service.get_tournament_ranking(torneio_id),
        }
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

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
            tournament_id=resultado.torneio_id,
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