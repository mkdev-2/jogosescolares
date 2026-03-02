# Projeto Jogos Escolares (JELS)

> Sistema para gestão dos Jogos Escolares Luminenses — adesão de escolas, cadastro de atletas, formação de equipes, credenciamento e competição.

---

## ÉPICO 1: Adesão Institucional (Fase 1)

**Descrição:** Permite que as escolas do município manifestem interesse em participar dos Jogos Escolares (JELS), forneçam seus dados institucionais, indiquem os responsáveis e pré-selecionem as modalidades.

### US 1.1: Formulário Público de Adesão da Escola

**Como** Diretor Escolar, **quero** preencher um formulário online de adesão para inscrever minha instituição nos Jogos Escolares Luminenses.

**Critérios de Aceite:**

- [ ] O formulário deve conter os campos da **Instituição:** Nome/Razão Social, INEP, CNPJ, Endereço, Cidade, UF, E-mail e Telefone.
- [ ] Deve conter os campos do **Diretor:** Nome, CPF, RG.
- [ ] Deve conter os campos do **Coordenador de Esportes:** Nome, CPF, RG, Endereço, E-mail, Telefone.
- [ ] Deve apresentar uma matriz de checkboxes cruzando **Categoria** (12 a 14 anos; 15 a 17 anos), **Naipe** (Masculino; Feminino) e **Modalidades** (Individuais, Coletivas, Novas).
- [ ] O sistema deve bloquear o envio do formulário após a data limite configurada (ex: 18 de abril de 2025).

---

### US 1.2: Avaliação de Adesão e Geração de Acesso

**Como** Administrador da SEMCEJ, **quero** avaliar os termos de adesão recebidos para liberar o acesso ao sistema para os coordenadores das escolas.

**Critérios de Aceite:**

- [ ] O painel deve listar todas as escolas que enviaram o termo.
- [ ] Ao aprovar uma escola, o sistema deve gerar automaticamente um usuário e senha provisória.
- [ ] O sistema deve disparar um e-mail automático para o Coordenador de Esportes com as credenciais de acesso.

---

## ÉPICO 2: Cadastro Único de Atletas e Profissionais (Fase 2)

**Descrição:** Permite que os coordenadores logados no sistema cadastrem a base de alunos e a comissão técnica de sua respectiva escola.

### US 2.1: Cadastro do Estudante-Atleta

**Como** Coordenador de Esportes, **quero** cadastrar os alunos da minha escola informando seus dados pessoais e filiação para que eles possam ser alocados nas modalidades.

**Critérios de Aceite:**

- [ ] O formulário deve conter os campos: Nome, CPF, RG, Data de Nascimento, Sexo, E-mail, Endereço, CEP, e Nº Registro Confederação (opcional).
- [ ] Deve conter os campos da **Mãe/Responsável:** Nome, CPF, RG, Celular, E-mail e NIS.
- [ ] O INEP da instituição deve ser vinculado automaticamente com base no login do Coordenador.
- [ ] O sistema deve alertar se a data de matrícula do aluno na instituição for posterior à data de corte do regulamento (ex: 25 de abril de 2025).

---

### US 2.2: Cadastro do Professor-Técnico

**Como** Coordenador de Esportes, **quero** cadastrar os professores e auxiliares técnicos para vinculá-los às equipes posteriormente.

**Critérios de Aceite:**

- [ ] O formulário deve exigir Nome Completo, CPF e número do CREF.

---

## ÉPICO 3: Formação de Equipes e Inscrições (Fase 3)

**Descrição:** Módulo para agrupar os atletas já cadastrados em suas respectivas modalidades e equipes.

### US 3.1: Montagem da Equipe Escolar

**Como** Coordenador de Esportes, **quero** selecionar uma modalidade/categoria e adicionar os alunos e o técnico para formar a equipe que vai competir.

**Critérios de Aceite:**

- [ ] A interface deve listar apenas as modalidades pré-selecionadas no Termo de Adesão.
- [ ] Deve permitir selecionar o "Professor-Técnico" responsável na lista de profissionais cadastrados.
- [ ] Deve permitir buscar e adicionar alunos à equipe através do CPF ou Nome.
- [ ] O sistema deve respeitar o limite máximo de atletas por modalidade (ex: 12 vagas no Futsal).

---

### US 3.2: Regra Antifraude e Duplicidade de Atletas

**Como** Sistema, **preciso** validar as inscrições em tempo real para garantir que as regras do regulamento não sejam burladas.

**Critérios de Aceite:**

- [ ] Bloquear a inclusão de um aluno caso o CPF dele já esteja inscrito na mesma modalidade/categoria por outra escola.
- [ ] Avisar caso haja conflito de idade entre a data de nascimento do atleta e a categoria da equipe (12-14 anos ou 15-17 anos).

---

## ÉPICO 4: Emissão de Documentos e Credenciamento (Fase 4)

**Descrição:** Módulo voltado à geração dos PDFs obrigatórios, controle de assinaturas e emissão dos crachás físicos.

### US 4.1: Geração Automática das Fichas e Termos

**Como** Coordenador de Esportes, **quero** gerar os documentos em PDF com os dados já preenchidos para coletar as assinaturas físicas.

**Critérios de Aceite:**

- [ ] Opção de gerar e baixar a **"Ficha Coletiva"** constando a lista de atletas, professor/CREF e dados da escola.
- [ ] Opção de gerar e baixar o **"Termo de Responsabilidade, Cessão de Direitos e LGPD"** individual de cada aluno da equipe.
- [ ] Os documentos gerados devem possuir os campos em branco para assinaturas e carimbos (Atleta, Responsável, Gestão da Escola e Médico com CRM).

---

### US 4.2: Upload e Validação de Documentos Físicos

**Como** Administrador da SEMCEJ, **quero** registrar no sistema que a escola entregou a documentação física devidamente assinada.

**Critérios de Aceite:**

- [ ] O sistema deve possuir um checkbox de validação: "Termo Físico Entregue e Assinado".
- [ ] Deve permitir o upload de um arquivo PDF contendo os documentos escaneados vinculados àquela equipe/aluno.
- [ ] Apenas equipes/alunos com o status validado poderão prosseguir para o credenciamento.

---

### US 4.3: Emissão de Credenciais de Jogo (Crachás)

**Como** Administrador da SEMCEJ, **quero** gerar crachás de identificação com foto para os atletas validados.

**Critérios de Aceite:**

- [ ] Opção de anexar uma foto (upload de imagem) no perfil do aluno validado.
- [ ] Geração de arquivo em lote (PDF para impressão) das credenciais, contendo: Foto, Nome do Atleta, Nome da Escola e Modalidade.

---

## ÉPICO 5: Gestão da Competição e Chaveamento (Engine dos Jogos)

**Descrição:** Módulo de backoffice para a organização do evento. Permite a realização de sorteios, montagem de chaves, criação da tabela de jogos e o registro das súmulas para atualização automática da classificação.

### US 5.1: Sorteio e Montagem de Grupos/Chaves

**Como** Administrador (Organização dos Jogos), **quero** realizar o sorteio das equipes validadas para distribuí-las em chaves, grupos ou confrontos diretos (mata-mata), dependendo do regulamento da modalidade.

**Critérios de Aceite:**

- [ ] O sistema deve listar todas as equipes/escolas com status "Validado" em uma modalidade/categoria específica.
- [ ] Deve permitir a distribuição manual ou aleatória (sorteio) das equipes em Grupos (Ex: Grupo A, Grupo B) ou em formato de Eliminatórias (Chaveamento).
- [ ] O sistema deve gerar uma visualização gráfica da chave estruturada.

---

### US 5.2: Tabela de Jogos e Cronograma

**Como** Administrador, **quero** definir as datas, horários e locais (ginásios/quadras) dos confrontos gerados no chaveamento.

**Critérios de Aceite:**

- [ ] O sistema deve permitir a criação de uma "Rodada" vinculando: Confronto (Equipe A x Equipe B), Data, Horário e Local.
- [ ] Deve alertar caso haja choque de horários e locais (duas partidas agendadas para a mesma quadra no mesmo horário).
- [ ] Deve permitir a emissão de um relatório diário de jogos ("Relatório do Mesário") contendo a relação nominal dos atletas aptos a jogar naquela partida.

---

### US 5.3: Registro de Súmula e Resultados

**Como** Mesário/Administrador, **quero** inserir o placar e os eventos principais da partida para que o sistema registre o resultado oficial.

**Critérios de Aceite:**

- [ ] A interface de súmula digital deve permitir inserir o placar final do confronto.
- [ ] Deve permitir o registro de pontuações específicas por atleta (ex: artilheiros no futsal, cestinhas no basquete) e cartões/punições.
- [ ] O status da partida deve mudar para "Encerrada" após a confirmação do resultado.

---

### US 5.4: Motor de Classificação Automática

**Como** Sistema, **preciso** calcular automaticamente a pontuação das equipes com base nos resultados inseridos na súmula para atualizar o ranking.

**Critérios de Aceite:**

- [ ] O sistema deve aplicar as regras de pontuação (ex: 3 pontos vitória, 1 empate, 0 derrota) conforme configurado para a modalidade.
- [ ] Deve atualizar a tabela de classificação do grupo em tempo real, aplicando os critérios de desempate (saldo de gols, confronto direto, etc.).
- [ ] Deve avançar automaticamente os classificados para a próxima fase no caso de chaveamento eliminatório.

---

## ÉPICO 6: Aplicativo de Acompanhamento (Portal do Aluno/Torcedor)

**Descrição:** Interface front-end (Web App ou aplicativo móvel) voltada para o público geral (alunos, pais, professores e comunidade) para acompanhar o andamento dos Jogos Escolares de Paço do Lumiar em tempo real.

### US 6.1: Painel de Tabelas e Próximos Jogos

**Como** Torcedor/Aluno, **quero** visualizar a tabela de jogos da minha escola e das demais para saber quando e onde serão as partidas.

**Critérios de Aceite:**

- [ ] O app deve exibir um calendário ou lista de "Próximos Jogos" com filtros por Escola, Modalidade, Naipe e Categoria.
- [ ] Deve exibir os detalhes do jogo: Data, Horário, Local e as equipes envolvidas.

---

### US 6.2: Resultados e Classificação em Tempo Real

**Como** Torcedor/Aluno, **quero** acessar o aplicativo para ver os placares dos jogos já encerrados e a classificação atualizada.

**Critérios de Aceite:**

- [ ] O app deve exibir os resultados das partidas assim que a súmula for encerrada no módulo administrativo.
- [ ] Deve exibir a Tabela de Classificação atualizada por grupos e a visualização gráfica do chaveamento (mata-mata).

---

### US 6.3: Estatísticas Individuais (Destaques)

**Como** Torcedor/Aluno, **quero** ver o ranking de atletas destaque da competição, como artilheiros e maiores pontuadores.

**Critérios de Aceite:**

- [ ] O app deve consumir os dados do engine da competição para listar os atletas com mais gols/pontos dentro de cada modalidade específica.
