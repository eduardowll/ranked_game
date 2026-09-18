from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from src.controllers import tournament_controller

# 1. Inicializa o servidor
app = FastAPI(title="THIS & THAT API", version="1.0")

# 2. Configuração de Segurança (CORS)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def inicio():
    return {"mensagem": "API funcionando"}

# 3. Registra os Controllers (Rotas)
app.include_router(tournament_controller.router)
