import json

with open('esporte_variantes_prod.json', 'r', encoding='utf-8') as f:
    vars = json.load(f)

sql = 'INSERT INTO esporte_variantes (id, esporte_id, tipo_modalidade_id, categoria_id, naipe_id, created_at, edicao_id) VALUES \n'
values = []
for v in vars:
    id_v = f"'{v['id']}'"
    esporte = f"'{v['esporte_id']}'"
    tipo = f"'{v['tipo_modalidade_id']}'"
    cat = f"'{v['categoria_id']}'"
    naipe = f"'{v['naipe_id']}'"
    created = f"'{v['created_at']}'"
    edicao = v['edicao_id']
    
    values.append(f"({id_v}, {esporte}, {tipo}, {cat}, {naipe}, {created}, {edicao})")

sql += ',\n'.join(values)
sql += '\nON CONFLICT (id) DO UPDATE SET esporte_id = EXCLUDED.esporte_id, tipo_modalidade_id = EXCLUDED.tipo_modalidade_id, categoria_id = EXCLUDED.categoria_id, naipe_id = EXCLUDED.naipe_id, edicao_id = EXCLUDED.edicao_id;'

with open('esporte_variantes_upsert.sql', 'w', encoding='utf-8') as f:
    f.write(sql)
print('SQL gerado!')
