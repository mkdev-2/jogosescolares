"""
Modelos Pydantic para validação de dados de entrada e saída.
"""
from typing import Optional, Literal, Union
from pydantic import BaseModel, EmailStr, Field, model_validator


# Roles válidas
VALID_ROLES = Literal["SUPER_ADMIN", "ADMIN", "DIRETOR", "COORDENADOR", "MESARIO"]

# Status do usuário
VALID_STATUS = Literal["ATIVO", "INATIVO", "PENDENTE"]

# ========== CATEGORIAS (faixa etária) ==========

class CategoriaCreate(BaseModel):
    """Schema para criação de categoria (faixa etária: 12-14, 15-17 anos)."""
    nome: str = Field(..., min_length=1, description="Nome da categoria")
    idade_min: int = Field(..., ge=0, le=30, description="Idade mínima (anos)")
    idade_max: int = Field(..., ge=0, le=30, description="Idade máxima (anos)")
    ativa: bool = Field(default=True, description="Se a categoria está ativa")


class CategoriaUpdate(BaseModel):
    """Schema para atualização de categoria."""
    nome: Optional[str] = Field(None, min_length=1)
    idade_min: Optional[int] = Field(None, ge=0, le=30)
    idade_max: Optional[int] = Field(None, ge=0, le=30)
    ativa: Optional[bool] = None


class CategoriaResponse(BaseModel):
    """Schema para resposta de categoria."""
    id: str
    nome: str
    idade_min: int
    idade_max: int
    ativa: bool
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

    class Config:
        from_attributes = True


# ========== NAIPES ==========

class NaipeResponse(BaseModel):
    """Schema para resposta de naipe (MASCULINO, FEMININO)."""
    id: str
    codigo: str
    nome: str


# ========== TIPOS DE MODALIDADE ==========

class TipoModalidadeResponse(BaseModel):
    """Schema para resposta de tipo de modalidade (INDIVIDUAIS, COLETIVAS, NOVAS)."""
    id: str
    codigo: str
    nome: str


# ========== ESPORTES ==========

class EsporteCreate(BaseModel):
    """Schema para criação de esporte."""
    nome: str = Field(..., min_length=1, description="Nome do esporte")
    descricao: Optional[str] = Field("", description="Descrição")
    icone: Optional[str] = Field("Zap", description="Nome do ícone (lucide-react)")
    requisitos: Optional[str] = Field("", description="Requisitos para participação")
    limite_atletas: Optional[int] = Field(3, description="Limite de atletas por equipe")
    ativa: bool = Field(default=True, description="Se o esporte está ativo")


class EsporteUpdate(BaseModel):
    """Schema para atualização de esporte."""
    nome: Optional[str] = Field(None, min_length=1)
    descricao: Optional[str] = None
    icone: Optional[str] = None
    requisitos: Optional[str] = None
    limite_atletas: Optional[int] = None
    ativa: Optional[bool] = None


class EsporteResponse(BaseModel):
    """Schema para resposta de esporte."""
    id: str
    nome: str
    descricao: str
    icone: str = "Zap"
    requisitos: str
    limite_atletas: int = 3
    ativa: bool
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

    class Config:
        from_attributes = True


# ========== ESPORTE VARIANTES ==========

class EsporteVarianteCreate(BaseModel):
    """Schema para criação de variante (esporte + categoria + naipe + tipo)."""
    esporte_id: str = Field(..., min_length=1)
    categoria_id: str = Field(..., min_length=1)
    naipe_id: str = Field(..., min_length=1)
    tipo_modalidade_id: str = Field(..., min_length=1)


class EsporteVarianteResponse(BaseModel):
    """Schema para resposta de variante."""
    id: str
    esporte_id: str
    esporte_nome: Optional[str] = None
    esporte_icone: Optional[str] = None
    esporte_limite_atletas: int = 3
    categoria_id: str
    categoria_nome: Optional[str] = None
    categoria_idade_min: Optional[int] = None
    categoria_idade_max: Optional[int] = None
    naipe_id: str
    naipe_codigo: Optional[str] = None
    naipe_nome: Optional[str] = None
    tipo_modalidade_id: str
    tipo_modalidade_codigo: Optional[str] = None
    tipo_modalidade_nome: Optional[str] = None
    created_at: Optional[str] = None


# ========== AUTH / USERS ==========

class UserCreate(BaseModel):
    """Schema para criação de novo usuário."""
    cpf: str = Field(..., description="CPF do usuário (apenas números, 11 dígitos)")
    email: Optional[EmailStr] = None
    password: str = Field(..., min_length=6, description="Senha com no mínimo 6 caracteres")
    nome: str = Field(..., min_length=1, description="Nome completo do usuário")
    role: VALID_ROLES = Field(..., description="Perfil de acesso")
    escola_id: Optional[int] = Field(None, description="ID da escola (obrigatório para DIRETOR e COORDENADOR)")
    status: VALID_STATUS = Field(default="ATIVO", description="Status do usuário (ATIVO, INATIVO, PENDENTE)")

    @model_validator(mode="after")
    def validate_escola_for_role(self):
        if self.role in ("DIRETOR", "COORDENADOR") and self.escola_id is None:
            raise ValueError("escola_id é obrigatório para usuários DIRETOR ou COORDENADOR")
        return self


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
    escola_id: Optional[int] = None
    status: VALID_STATUS
    created_at: Optional[str] = None

    class Config:
        from_attributes = True


class UserMeResponse(BaseModel):
    """Schema para resposta de /auth/me com dados do usuário."""
    id: int
    cpf: Union[str, None] = None
    email: Union[str, None] = None
    nome: str
    role: str
    escola_id: Union[int, None] = None
    escola_inep: Union[str, None] = None
    status: VALID_STATUS
    created_at: Union[str, None] = None
    foto_url: Union[str, None] = None
    can_create_users: bool = False
    allowed_roles_for_create: list[str] = Field(default_factory=list)
    max_users_per_escola: int = 3

    class Config:
        from_attributes = True


class UserUpdateMe(BaseModel):
    """Schema para atualização do próprio perfil pelo usuário."""
    nome: Optional[str] = Field(None, min_length=1, description="Nome completo do usuário")
    email: Optional[EmailStr] = Field(None, description="Email do usuário")


class UserUpdate(BaseModel):
    """Schema para atualização de usuário (admin)."""
    nome: Optional[str] = Field(None, min_length=1)
    email: Optional[EmailStr] = None
    role: Optional[VALID_ROLES] = None
    escola_id: Optional[int] = None
    status: Optional[VALID_STATUS] = None
    password: Optional[str] = Field(None, min_length=6, description="Nova senha (opcional)")

    @model_validator(mode="after")
    def validate_escola_for_role(self):
        if self.role in ("DIRETOR", "COORDENADOR") and self.escola_id is None:
            raise ValueError("escola_id é obrigatório para usuários DIRETOR ou COORDENADOR")
        return self


class ChangePasswordRequest(BaseModel):
    """Schema para alteração de senha."""
    current_password: str = Field(..., description="Senha atual")
    new_password: str = Field(..., min_length=6, description="Nova senha com no mínimo 6 caracteres")


# ========== ESCOLAS / ADESÃO ==========

class EscolaCreate(BaseModel):
    """Schema para criação de escola."""
    nome_escola: str = Field(..., min_length=1, description="Nome da escola")
    inep: str = Field(..., min_length=8, max_length=8, description="INEP (8 dígitos)")
    cnpj: str = Field(..., min_length=14, max_length=14, description="CNPJ (14 dígitos)")
    endereco: str = Field(..., min_length=1, description="Endereço")
    cidade: str = Field(..., min_length=1, description="Cidade")
    uf: str = Field(..., min_length=2, max_length=2, description="UF")
    email: str = Field(..., description="E-mail")
    telefone: str = Field(..., min_length=8, description="Telefone")


class AdesaoDiretor(BaseModel):
    """Dados do diretor no termo de adesão (senha enviada em texto; backend grava apenas hash)."""
    nome: str = Field(..., min_length=1)
    cpf: str = Field(..., min_length=11, max_length=14)
    rg: str = Field(..., min_length=1)
    senha: str = Field(..., min_length=6, description="Senha definida no formulário (será hasheada no backend)")


class AdesaoCoordenador(BaseModel):
    """Dados do coordenador de esportes no termo de adesão."""
    nome: str = Field(..., min_length=1)
    cpf: str = Field(..., min_length=11, max_length=14)
    rg: str = Field(..., min_length=1)
    endereco: str = Field(..., min_length=1)
    email: str = Field(..., description="E-mail do coordenador")
    telefone: str = Field(..., min_length=8)


class AdesaoCreate(BaseModel):
    """Payload completo do formulário público de adesão (cadastro de escola)."""
    # Instituição
    nome_escola: str = Field(..., min_length=1)
    inep: str = Field(..., min_length=8, max_length=8)
    cnpj: str = Field(..., min_length=14, max_length=14)
    endereco: str = Field(..., min_length=1)
    cidade: str = Field(..., min_length=1)
    uf: str = Field(..., min_length=2, max_length=2)
    email: str = Field(..., description="E-mail da instituição")
    telefone: str = Field(..., min_length=8)
    # Diretor (CPF será credencial de login; senha armazenada como hash)
    diretor: AdesaoDiretor
    # Coordenador de esportes
    coordenador: AdesaoCoordenador
    # Matriz categoria x naipe x tipo (ex.: {"12-14": {"M": {"individuais": true, ...}}, ...})
    modalidades: dict = Field(..., description="Matriz de modalidades selecionadas (categoria/naipe/tipo)")


class EscolaResponse(BaseModel):
    """Schema para resposta de escola."""
    id: int
    nome_escola: str
    inep: str
    cnpj: str
    endereco: str
    cidade: str
    uf: str
    email: str
    telefone: str
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

    class Config:
        from_attributes = True


class EscolaAdesaoResponse(BaseModel):
    """Resposta de escola com dados de adesão (para listagem de pendentes pelo admin)."""
    id: int
    nome_escola: str
    inep: str
    cnpj: str
    endereco: str
    cidade: str
    uf: str
    email: str
    telefone: str
    status_adesao: Optional[str] = None
    dados_diretor: Optional[dict] = None
    dados_coordenador: Optional[dict] = None
    modalidades_adesao: Optional[dict] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

    class Config:
        from_attributes = True

# ========== CONFIGURAÇÕES ==========

class ConfiguracoesUpdate(BaseModel):
    """Schema para atualização de configurações (datas e prazos)."""
    cadastro_data_limite: Optional[str] = Field(None, description="Data limite para envio do formulário de cadastro (YYYY-MM-DD) ou null para sem limite")


# ========== ESTUDANTES ATLETAS ==========

class EstudanteAtletaCreate(BaseModel):
    """Schema para criação de estudante-atleta (escola_id vem do usuário logado)."""
    nome: str = Field(..., min_length=1)
    cpf: str = Field(..., min_length=11, max_length=14)
    rg: str = Field(..., min_length=1, max_length=11)
    data_nascimento: str = Field(..., description="YYYY-MM-DD")
    sexo: str = Field(..., pattern="^[MF]$")
    email: str = Field(..., min_length=1)
    endereco: str = Field(..., min_length=1)
    cep: str = Field(..., min_length=8, max_length=9)
    numero_registro_confederacao: Optional[str] = Field(None, max_length=20)
    foto_url: Optional[str] = None
    responsavel_nome: str = Field(..., min_length=1)
    responsavel_cpf: str = Field(..., min_length=11, max_length=14)
    responsavel_rg: str = Field(..., min_length=1, max_length=11)
    responsavel_celular: str = Field(..., min_length=1)
    responsavel_email: str = Field(..., min_length=1)
    responsavel_nis: str = Field(..., min_length=1)
    inep_instituicao: Optional[str] = None  # ignorado; escola vem do token


class EstudanteAtletaResponse(BaseModel):
    """Schema para resposta de estudante-atleta."""
    id: int
    escola_id: int
    escola_nome: Optional[str] = None
    nome: str
    cpf: str
    rg: Optional[str] = None
    data_nascimento: Optional[str] = None
    sexo: Optional[str] = None
    email: Optional[str] = None
    endereco: Optional[str] = None
    cep: Optional[str] = None
    numero_registro_confederacao: Optional[str] = None
    foto_url: Optional[str] = None
    responsavel_nome: str
    responsavel_cpf: str
    responsavel_rg: Optional[str] = None
    responsavel_celular: Optional[str] = None
    responsavel_email: str
    responsavel_nis: str
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

    class Config:
        from_attributes = True


# ========== PROFESSORES TÉCNICOS ==========

class ProfessorTecnicoCreate(BaseModel):
    """Schema para criação de professor-técnico (escola_id vem do usuário logado)."""
    nome: str = Field(..., min_length=1)
    cpf: str = Field(..., min_length=11, max_length=14)
    cref: str = Field(..., min_length=1)


class ProfessorTecnicoResponse(BaseModel):
    """Schema para resposta de professor-técnico."""
    id: int
    escola_id: int
    escola_nome: Optional[str] = None
    nome: str
    cpf: str
    cref: str
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

    class Config:
        from_attributes = True


# ========== EQUIPES ==========

class EquipeCreate(BaseModel):
    """Schema para criação de equipe (escola_id vem do usuário logado)."""
    esporte_variante_id: str = Field(..., min_length=1, description="ID da variante (esporte+categoria+naipe+tipo)")
    estudante_ids: list[int] = Field(..., min_length=1, description="IDs dos estudantes da equipe")
    professor_tecnico_id: int = Field(..., description="ID do professor-técnico")


class EquipeEstudanteItem(BaseModel):
    """Item estudante na resposta da equipe."""
    id: int
    nome: str
    cpf: Optional[str] = None


class EquipeResponse(BaseModel):
    """Schema para resposta de equipe (com variante, técnico e estudantes)."""
    id: int
    escola_id: int
    escola_nome: Optional[str] = None
    esporte_variante_id: str
    esporte_nome: Optional[str] = None
    esporte_icone: Optional[str] = None
    categoria_nome: Optional[str] = None
    naipe_nome: Optional[str] = None
    tipo_modalidade_nome: Optional[str] = None
    professor_tecnico_id: int
    professor_tecnico_nome: Optional[str] = None
    estudantes: list[EquipeEstudanteItem] = Field(default_factory=list)
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

    class Config:
        from_attributes = True
