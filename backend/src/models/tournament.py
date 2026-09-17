from pydantic import BaseModel
from typing import List, Optional

# ---------------------------------------------------------
# 1. MODELOS DE BANCO DE DADOS 
# ---------------------------------------------------------

class VideoItem(BaseModel):
    """Representa um vídeo único salvo no banco global"""
    video_id: str             
    url: str                  
    nome: str                 
    
    duelos_jogados: int = 0 
    duelos_vencidos: int = 0
    torneios_vencidos: int = 0 
    
class TournamentTheme(BaseModel):
    """Representa a categoria/tema do torneio"""
    id: Optional[str] = None
    titulo: str
    descricao: Optional[str] = None
    video_ids: List[str]      
    vezes_jogado: int = 0

# ---------------------------------------------------------
# 2. SCHEMAS DE REQUISIÇÃO
# ---------------------------------------------------------

class VideoCreate(BaseModel):
    """Quando o usuário cadastra um vídeo novo no banco"""
    url_youtube: str
    nome: str

class MatchupResult(BaseModel):
    """Quando um 1v1 acontece na tela, o Frontend avisa quem ganhou e quem perdeu"""
    vencedor_id: str
    perdedor_id: str

class TournamentResult(BaseModel):
    """Quando o torneio acaba, o Frontend avisa quem foi o grande campeão"""
    torneio_id: str
    campeao_id: str