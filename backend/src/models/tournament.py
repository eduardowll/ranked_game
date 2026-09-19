from pydantic import BaseModel, Field
from typing import List, Literal, Optional

# ---------------------------------------------------------
# 1. MODELOS DE BANCO DE DADOS 
# ---------------------------------------------------------

class VideoItem(BaseModel):
    """Representa um vídeo único salvo no banco global"""
    video_id: str             
    url: str                  
    nome: str                 
    
class TournamentTheme(BaseModel):
    """Representa a categoria/tema do torneio"""
    id: Optional[str] = None
    titulo: str
    descricao: Optional[str] = None
    video_ids: List[str]      
    estatisticas_videos: dict = Field(default_factory=dict)
    estado: Literal['aberto', 'em_andamento'] = 'aberto'
    partida: Optional[dict] = None
    owner_uid: Optional[str] = None

# ---------------------------------------------------------
# 2. SCHEMAS DE REQUISIÇÃO
# ---------------------------------------------------------

class VideoCreate(BaseModel):
    """Quando o usuário cadastra um vídeo novo no banco"""
    url_youtube: str

class VideoUpdate(BaseModel):
    """Nova URL para uma música já cadastrada."""
    url_youtube: str

class TournamentCreate(BaseModel):
    """Dados necessários para criar um torneio com todo o catálogo atual"""
    titulo: str

class MatchupResult(BaseModel):
    """Quando um 1v1 acontece na tela, o Frontend avisa quem ganhou e quem perdeu"""
    torneio_id: str
    vencedor_id: str
    perdedor_id: str
