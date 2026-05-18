import json

with open('esportes_prod.json', 'r', encoding='utf-8') as f:
    sports = json.load(f)

sql = 'INSERT INTO esportes (id, nome, descricao, icone, requisitos, limite_atletas, ativa, created_at, updated_at, minimo_atletas, edicao_id, isento_limite_modalidade) VALUES \n'
values = []
for s in sports:
    id_v = f"'{s['id']}'"
    nome_v = f"'{s['nome']}'"
    descricao_v = f"'{s['descricao']}'" if s['descricao'] else "''"
    icone_v = f"'{s['icone']}'"
    requisitos_v = f"'{s['requisitos']}'" if s['requisitos'] else "''"
    limite = s['limite_atletas'] or 'NULL'
    ativa = 'true' if s['ativa'] else 'false'
    created = f"'{s['created_at']}'"
    updated = f"'{s['updated_at']}'"
    minimo = s['minimo_atletas'] or 'NULL'
    edicao = s['edicao_id'] or 'NULL'
    isento = 'true' if s['isento_limite_modalidade'] else 'false'
    
    values.append(f"({id_v}, {nome_v}, {descricao_v}, {icone_v}, {requisitos_v}, {limite}, {ativa}, {created}, {updated}, {minimo}, {edicao}, {isento})")

sql += ',\n'.join(values)
sql += '\nON CONFLICT (id) DO UPDATE SET nome = EXCLUDED.nome, descricao = EXCLUDED.descricao, icone = EXCLUDED.icone, requisitos = EXCLUDED.requisitos, limite_atletas = EXCLUDED.limite_atletas, ativa = EXCLUDED.ativa, minimo_atletas = EXCLUDED.minimo_atletas, edicao_id = EXCLUDED.edicao_id, isento_limite_modalidade = EXCLUDED.isento_limite_modalidade;'

with open('esportes_upsert.sql', 'w', encoding='utf-8') as f:
    f.write(sql)
print('SQL gerado!')
