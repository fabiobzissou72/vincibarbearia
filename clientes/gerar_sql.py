import pandas as pd
import re
from datetime import datetime

# Ler planilhas
df1 = pd.read_excel('AppBarber  Informações (2).xlsx')
df2 = pd.read_excel('clientes_25092025014733.xlsx')

barbeiros_ficam = [
    'Hiago Lopes Marques',
    'Alexson bonnes Oliveira Coelho',
    'Felippe Malaquias De Oliveira'
]

map_barbeiro = {
    'Hiago Lopes Marques': 'Hiago',
    'Alexson bonnes Oliveira Coelho': 'Alex',
    'Felippe Malaquias De Oliveira': 'Filippe'
}

def limpar_telefone(tel):
    if pd.isna(tel):
        return None
    tel = re.sub(r'[^0-9]', '', str(tel))
    if tel.startswith('55') and len(tel) > 11:
        tel = tel[2:]
    if len(tel) == 10:
        tel = tel[:2] + '9' + tel[2:]
    return tel if len(tel) >= 10 else None

def escape_sql(val):
    if val is None or pd.isna(val):
        return 'NULL'
    val = str(val)
    val = val.replace("'", "''")
    val = val.replace('\x00', '')
    val = val.replace('´', '')
    val = val.replace('`', '')
    val = re.sub(r'[\x00-\x1f\x7f-\x9f]', '', val)
    val = val.strip()
    if not val:
        return 'NULL'
    return f"'{val}'"

# Filtrar planilha 1
df1_filtrado = df1[df1['Profissional'].isin(barbeiros_ficam)].copy()
df1_filtrado['telefone_limpo'] = df1_filtrado['Celular'].apply(limpar_telefone)
df1_filtrado = df1_filtrado[df1_filtrado['telefone_limpo'].notna()]

# Limpar planilha 2
df2['telefone_limpo'] = df2['Celular'].apply(limpar_telefone)
df2 = df2[df2['telefone_limpo'].notna()]

# Criar dicionário da planilha 2
dados_extras = {}
for _, row in df2.iterrows():
    tel = row['telefone_limpo']
    if tel:
        dados_extras[tel] = {
            'email': row['Email'] if pd.notna(row['Email']) else None,
            'obs': row['Obs'] if pd.notna(row['Obs']) else None,
            'como_soube': row['ComoSoube'] if pd.notna(row['ComoSoube']) else None,
            'nome_p2': row['Nome'] if pd.notna(row['Nome']) else None
        }

# Processar clientes finais
clientes_final = {}

for _, row in df1_filtrado.iterrows():
    tel = row['telefone_limpo']
    if tel and tel not in clientes_final:
        nome = str(row['Cliente']).strip() if pd.notna(row['Cliente']) else ''
        barbeiro = map_barbeiro.get(row['Profissional'], row['Profissional'])

        ultimo_servico = None
        for col in df1_filtrado.columns:
            if 'ltimo' in col or 'Ultimo' in col:
                if pd.notna(row[col]):
                    ultimo_servico = str(row[col])
                    break

        extras = dados_extras.get(tel, {})

        clientes_final[tel] = {
            'nome_completo': nome,
            'telefone': tel,
            'email': extras.get('email'),
            'profissional_preferido': barbeiro,
            'ultimo_servico': ultimo_servico,
            'observacoes': extras.get('obs'),
            'como_soube': extras.get('como_soube')
        }

for tel, extras in dados_extras.items():
    if tel not in clientes_final:
        nome = extras.get('nome_p2', '')
        if nome and nome != '.' and len(str(nome).strip()) > 1:
            clientes_final[tel] = {
                'nome_completo': str(nome).strip(),
                'telefone': tel,
                'email': extras.get('email'),
                'profissional_preferido': None,
                'ultimo_servico': None,
                'observacoes': extras.get('obs'),
                'como_soube': extras.get('como_soube')
            }

# Converter para lista
clientes_list = list(clientes_final.values())
total = len(clientes_list)
print(f'Total de clientes: {total}')

# Dividir em 4 partes
partes = 4
tamanho_parte = total // partes + 1

for i in range(partes):
    inicio = i * tamanho_parte
    fim = min((i + 1) * tamanho_parte, total)
    clientes_parte = clientes_list[inicio:fim]

    if not clientes_parte:
        continue

    sql_lines = []
    sql_lines.append(f'-- PARTE {i+1} de {partes}')
    sql_lines.append(f'-- Clientes {inicio+1} a {fim} de {total}')
    sql_lines.append('')
    sql_lines.append('INSERT INTO clientes (telefone, nome_completo, email, profissional_preferido, ultimo_servico, observacoes, como_soube, is_vip, data_cadastro)')
    sql_lines.append('VALUES')

    values = []
    for c in clientes_parte:
        nome = escape_sql(c['nome_completo'])
        telefone = escape_sql(c['telefone'])
        email = escape_sql(c['email'])
        prof = escape_sql(c['profissional_preferido'])
        ultimo = escape_sql(c['ultimo_servico'])
        obs = escape_sql(c['observacoes'])
        como = escape_sql(c['como_soube'])

        values.append(f'({telefone}, {nome}, {email}, {prof}, {ultimo}, {obs}, {como}, false, NOW())')

    sql_lines.append(',\n'.join(values))
    sql_lines.append('ON CONFLICT (telefone) DO UPDATE SET')
    sql_lines.append('  nome_completo = EXCLUDED.nome_completo,')
    sql_lines.append('  email = COALESCE(EXCLUDED.email, clientes.email),')
    sql_lines.append('  profissional_preferido = COALESCE(EXCLUDED.profissional_preferido, clientes.profissional_preferido),')
    sql_lines.append('  ultimo_servico = COALESCE(EXCLUDED.ultimo_servico, clientes.ultimo_servico),')
    sql_lines.append('  observacoes = COALESCE(EXCLUDED.observacoes, clientes.observacoes),')
    sql_lines.append('  como_soube = COALESCE(EXCLUDED.como_soube, clientes.como_soube);')
    sql_lines.append('')

    filename = f'IMPORTAR_PARTE_{i+1}.sql'
    with open(filename, 'w', encoding='utf-8') as f:
        f.write('\n'.join(sql_lines))

    print(f'Criado: {filename} ({len(clientes_parte)} clientes)')

print()
print('Pronto! Rode cada arquivo na ordem: PARTE_1, PARTE_2, PARTE_3, PARTE_4')
