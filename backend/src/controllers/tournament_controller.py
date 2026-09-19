from fastapi import APIRouter, HTTPException
from src.auth import get_current_user
from fastapi import Depends
from src.services.tournament_service import TournamentService
from src.models.tournament import VideoCreate, TournamentCreate, MatchupResult

# Cria o roteador para este módulo
router = APIRouter(tags=["Torneios"])

# Inicializa o Service
service = TournamentService()

@router.post("/torneios", status_code=201)
def criar_torneio(dados: TournamentCreate, usuario: dict = Depends(get_current_user)):
    try:
        novo_torneio = service.create_new_tournament(
            titulo=dados.titulo,
            owner_uid=usuario['uid'],
        )
        return {"mensagem": "Torneio criado com sucesso!", "id": novo_torneio.id}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/videos", status_code=201)
def cadastrar_video(dados: VideoCreate, usuario: dict = Depends(get_current_user)):
    try:
        video = service.add_video_to_catalog(dados.url_youtube)
        return video
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/videos")
def listar_videos():
    return service.video_repo.get_all_videos()

@router.delete("/videos/{video_id}", status_code=204)
def excluir_video(video_id: str, usuario: dict = Depends(get_current_user)):
    try:
        service.delete_video_from_catalog(video_id)
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e))

@router.get("/torneios")
def listar_torneios():
    return service.get_all_tournaments()

@router.delete("/torneios/{torneio_id}", status_code=204)
def excluir_torneio(torneio_id: str, usuario: dict = Depends(get_current_user)):
    try:
        service.delete_tournament(torneio_id, usuario['uid'])
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

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
        return service.start_tournament(torneio_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.post("/duelos/resultado")
def registrar_duelo(resultado: MatchupResult):
    try:
        resposta = service.register_match_winner(
            tournament_id=resultado.torneio_id,
            vencedor_id=resultado.vencedor_id, 
            perdedor_id=resultado.perdedor_id
        )
        return resposta
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
