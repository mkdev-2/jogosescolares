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
    categoria_ids: Optional[list[str]] = Field(default_factory=list, description="IDs das categorias para variantes")
    naipe_ids: Optional[list[str]] = Field(default_factory=list, description="IDs dos naipes para variantes")
    tipo_modalidade_ids: Optional[list[str]] = Field(default_factory=list, description="IDs dos tipos de modalidade para variantes")


class EsporteUpdate(BaseModel):
    """Schema para atualização de esporte."""
    nome: Optional[str] = Field(None, min_length=1)
    descricao: Optional[str] = None
    icone: Optional[str] = None
    requisitos: Optional[str] = None
    limite_atletas: Optional[int] = None
    ativa: Optional[bool] = None
    categoria_ids: Optional[list[str]] = None
    naipe_ids: Optional[list[str]] = None
    tipo_modalidade_ids: Optional[list[str]] = None


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
    esporte_requisitos: Optional[str] = None
    esporte_ativa: bool = True
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
    escola_nome: Union[str, None] = None
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
    foto_url: Optional[str] = Field(None, description="URL ou path da foto de perfil")


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
    rg: str = Field(..., min_length=1, max_length=15)
    senha: str = Field(..., min_length=6, description="Senha definida no formulário (será hasheada no backend)")


class AdesaoCoordenador(BaseModel):
    """Dados do coordenador de esportes no termo de adesão."""
    nome: str = Field(..., min_length=1)
    cpf: str = Field(..., min_length=11, max_length=14)
    rg: str = Field(..., min_length=1, max_length=15)
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
    # IDs das variantes de esportes selecionadas (escola competirá nestas modalidades)
    variante_ids: list[str] = Field(..., min_length=1, description="IDs das variantes de esportes (esporte+categoria+naipe+tipo) em que a escola pretende competir")


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


class EscolaModalidadesUpdate(BaseModel):
    """Atualização das modalidades (variantes) em que a escola está vinculada."""
    variante_ids: list[str] = Field(..., min_length=1, description="IDs das variantes de esportes em que a escola pretende competir")


class EscolaAdesaoResponse(BaseModel):
    """Resposta de escola/solicitação com dados de adesão (para listagem de pendentes pelo admin)."""
    id: int
    nome_escola: str
    inep: str
    cnpj: str
    endereco: str
    cidade: str
    uf: str
    email: str
    telefone: str
    status_adesao: Optional[str] = None  # PENDENTE|APROVADA|REJEITADA (compat) ou status da solicitação
    dados_diretor: Optional[dict] = None
    dados_coordenador: Optional[dict] = None
    modalidades_adesao: Optional[dict] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

    class Config:
        from_attributes = True


class SolicitacaoResponse(BaseModel):
    """Resposta de solicitação de adesão (tabela solicitacoes)."""
    id: int
    status: str  # ACEITO, NEGADO, PENDENTE
    nome_escola: str
    inep: str
    cnpj: str
    endereco: str
    cidade: str
    uf: str
    email: str
    telefone: str
    dados_diretor: Optional[dict] = None
    dados_coordenador: Optional[dict] = None
    modalidades_adesao: Optional[dict] = None
    escola_id: Optional[int] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

    class Config:
        from_attributes = True

# ========== CONFIGURAÇÕES ==========

class ConfiguracoesUpdate(BaseModel):
    """Schema para atualização de configurações (datas e prazos)."""
    cadastro_data_limite: Optional[str] = Field(None, description="Data limite para envio do formulário de cadastro (YYYY-MM-DD) ou null para sem limite")
    diretor_cadastro_alunos_data_limite: Optional[str] = Field(None, description="Data limite para diretor/coordenador cadastrar alunos (YYYY-MM-DD) ou null para sem limite")
    diretor_editar_modalidades_data_limite: Optional[str] = Field(None, description="Data limite para diretor editar modalidades da escola (YYYY-MM-DD) ou null para sem limite")


class ConfiguracoesLogosUpdate(BaseModel):
    """Schema para atualização apenas das logos (mídias)."""
    logo_secretaria: Optional[str] = Field(None, description="Path do storage da logo da secretaria")
    logo_jels: Optional[str] = Field(None, description="Path do storage da logo principal JELS")
    bg_credencial: Optional[str] = Field(None, description="Path do storage da arte de fundo da credencial / papel timbrado")


# ========== ESTUDANTES ATLETAS ==========

class EstudanteAtletaCreate(BaseModel):
    """Schema para criação de estudante-atleta (escola_id vem do usuário logado)."""
    nome: str = Field(..., min_length=1)
    cpf: str = Field(..., min_length=11, max_length=14)
    rg: str = Field(..., min_length=1, max_length=15)
    data_nascimento: str = Field(..., description="YYYY-MM-DD")
    sexo: str = Field(..., pattern="^[MF]$")
    email: str = Field(..., min_length=1)
    endereco: str = Field(..., min_length=1)
    cep: str = Field(..., min_length=8, max_length=9)
    numero_registro_confederacao: Optional[str] = Field(None, max_length=20)
    foto_url: Optional[str] = None
    responsavel_nome: str = Field(..., min_length=1)
    responsavel_cpf: str = Field(..., min_length=11, max_length=14)
    responsavel_rg: str = Field(..., min_length=1, max_length=15)
    responsavel_celular: str = Field(..., min_length=1)
    responsavel_email: str = Field(..., min_length=1)
    responsavel_nis: str = Field(..., min_length=1)
    inep_instituicao: Optional[str] = None  # ignorado; escola vem do token
    # Confirmação de assinaturas e anexo da documentação assinada
    ficha_assinada: bool = Field(default=False, description="Assinaturas de Médico, Aluno, Responsável e Escola coletadas")
    documentacao_assinada_url: Optional[str] = Field(None, max_length=500, description="URL do anexo da documentação assinada")


class EstudanteAtletaUpdate(BaseModel):
    """Schema para atualização parcial de estudante-atleta."""
    nome: Optional[str] = Field(None, min_length=1)
    cpf: Optional[str] = Field(None, min_length=11, max_length=14)
    rg: Optional[str] = Field(None, min_length=1, max_length=15)
    data_nascimento: Optional[str] = None
    sexo: Optional[str] = Field(None, pattern="^[MF]$")
    email: Optional[str] = Field(None, min_length=1)
    endereco: Optional[str] = Field(None, min_length=1)
    cep: Optional[str] = Field(None, min_length=8, max_length=9)
    numero_registro_confederacao: Optional[str] = Field(None, max_length=20)
    foto_url: Optional[str] = None
    responsavel_nome: Optional[str] = Field(None, min_length=1)
    responsavel_cpf: Optional[str] = Field(None, min_length=11, max_length=14)
    responsavel_rg: Optional[str] = Field(None, min_length=1, max_length=15)
    responsavel_celular: Optional[str] = None
    responsavel_email: Optional[str] = Field(None, min_length=1)
    responsavel_nis: Optional[str] = Field(None, min_length=1)
    ficha_assinada: Optional[bool] = None
    documentacao_assinada_url: Optional[str] = Field(None, max_length=500)


class EstudanteAtletaResponse(BaseModel):
    """Schema para resposta de estudante-atleta."""
    id: int
    escola_id: int
    escola_nome: Optional[str] = None
    escola_inep: Optional[str] = None
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
    ficha_assinada: bool = False
    documentacao_assinada_url: Optional[str] = None
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


class ProfessorTecnicoUpdate(BaseModel):
    """Schema para atualização parcial de professor-técnico."""
    nome: Optional[str] = Field(None, min_length=1)
    cpf: Optional[str] = Field(None, min_length=11, max_length=14)
    cref: Optional[str] = Field(None, min_length=1)


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


class EquipeUpdate(BaseModel):
    """Schema para atualização parcial de equipe."""
    esporte_variante_id: Optional[str] = Field(None, min_length=1)
    estudante_ids: Optional[list[int]] = Field(None, min_length=1)
    professor_tecnico_id: Optional[int] = None


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
    tipo_modalidade_codigo: Optional[str] = None
    tipo_modalidade_nome: Optional[str] = None
    professor_tecnico_id: int
    professor_tecnico_nome: Optional[str] = None
    estudantes: list[EquipeEstudanteItem] = Field(default_factory=list)
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

    class Config:
        from_attributes = True


# ---------- Ficha Coletiva JELS (impressão) ----------


class FichaColetivaEstudanteItem(BaseModel):
    """Estudante na ficha coletiva (nome e data de nascimento)."""
    nome: str
    data_nascimento: Optional[str] = None


class FichaColetivaProfessorItem(BaseModel):
    """Professor-técnico na ficha coletiva (nome e CREF)."""
    nome: str
    cref: Optional[str] = None


class FichaColetivaResponse(BaseModel):
    """Dados para impressão da Ficha Coletiva JELS (modalidades coletivas)."""
    instituicao: Optional[str] = None
    coordenador_nome: Optional[str] = None
    coordenador_contato: Optional[str] = None
    coordenador_email: Optional[str] = None
    modalidade: Optional[str] = None
    categoria: Optional[str] = None
    naipe: Optional[str] = None
    estudantes: list[FichaColetivaEstudanteItem] = Field(default_factory=list)
    professores_tecnicos: list[FichaColetivaProfessorItem] = Field(default_factory=list)


# ========== CREDENCIAIS (optimized) ==========

class ModalidadeSimples(BaseModel):
    """Schema simplificado de modalidade para o crachá."""

    esporte_nome: str
    esporte_icone: Optional[str] = "Zap"
    categoria_nome: str
    naipe_nome: str


class EstudanteCredencialResponse(BaseModel):
    """Schema otimizado para geração de credenciais em lote."""

    id: int
    nome: str
    cpf: str
    data_nascimento: Optional[str] = None
    escola_nome: Optional[str] = None
    foto_url: Optional[str] = None
    modalidades: list[ModalidadeSimples] = []
