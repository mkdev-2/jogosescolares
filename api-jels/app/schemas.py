"""
Modelos Pydantic para validação de dados de entrada e saída.
"""
from typing import Optional, Literal, Union
from pydantic import BaseModel, EmailStr, Field


# Roles válidas
VALID_ROLES = Literal["SUPER_ADMIN", "ADMIN", "DIRETOR", "MESARIO"]

# Categorias de modalidade
MODALIDADE_CATEGORIAS = Literal["COLETIVA", "INDIVIDUAL"]


# ========== AUTH / USERS ==========

class UserCreate(BaseModel):
    """Schema para criação de novo usuário."""
    cpf: str = Field(..., description="CPF do usuário (apenas números, 11 dígitos)")
    email: Optional[EmailStr] = None
    password: str = Field(..., min_length=6, description="Senha com no mínimo 6 caracteres")
    nome: str = Field(..., min_length=1, description="Nome completo do usuário")
    role: VALID_ROLES = Field(..., description="Perfil de acesso")
    ativo: bool = Field(default=True, description="Status do usuário (ativo/inativo)")


class UserLogin(BaseModel):
    """Schema para login de usuário."""
    cpf: str = Field(..., description="CPF do usuário (apenas números)")
    password: str


class Token(BaseModel):
    """Schema para resposta de token JWT."""
    access_token: str
    refresh_token: Optional[str] = None
    token_type: str = "bearer"


class RefreshTokenRequest(BaseModel):
    """Schema para requisição de refresh token."""
    refresh_token: str


class UserResponse(BaseModel):
    """Schema para resposta de usuário (sem senha)."""
    id: int
    cpf: Optional[str] = None
    email: Optional[str] = None
    nome: str
    role: str
    ativo: bool = True

    class Config:
        from_attributes = True


class UserMeResponse(BaseModel):
    """Schema para resposta de /auth/me com dados do usuário."""
    id: int
    cpf: Union[str, None] = None
    email: Union[str, None] = None
    nome: str
    role: str
    ativo: bool
    created_at: Union[str, None] = None
    foto_url: Union[str, None] = None

    class Config:
        from_attributes = True


class UserUpdateMe(BaseModel):
    """Schema para atualização do próprio perfil pelo usuário."""
    nome: Optional[str] = Field(None, min_length=1, description="Nome completo do usuário")
    email: Optional[EmailStr] = Field(None, description="Email do usuário")


class ChangePasswordRequest(BaseModel):
    """Schema para alteração de senha."""
    current_password: str = Field(..., description="Senha atual")
    new_password: str = Field(..., min_length=6, description="Nova senha com no mínimo 6 caracteres")

# ========== MODALIDADES ==========

class ModalidadeCreate(BaseModel):
    """Schema para criação de modalidade."""
    id: Optional[str] = Field(None, description="ID customizado (opcional)")
    nome: str = Field(..., min_length=1, description="Nome da modalidade")
    descricao: Optional[str] = Field("", description="Descrição da modalidade")
    categoria: str = Field(default="COLETIVA", description="Coletiva ou Individual")
    requisitos: Optional[str] = Field("", description="Requisitos para participação")
    ativa: bool = Field(default=True, description="Se a modalidade está ativa")


class ModalidadeUpdate(BaseModel):
    """Schema para atualização de modalidade."""
    nome: Optional[str] = Field(None, min_length=1)
    descricao: Optional[str] = None
    categoria: Optional[str] = None
    requisitos: Optional[str] = None
    ativa: Optional[bool] = None


class ModalidadeResponse(BaseModel):
    """Schema para resposta de modalidade."""
    id: str
    nome: str
    descricao: str
    categoria: str
    requisitos: str
    ativa: bool
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

    class Config:
        from_attributes = True
