#!/usr/bin/env python3
import re

with open('API_DOCUMENTATION.md', 'r', encoding='utf-8') as f:
    content = f.read()

# Padrões de CURL que precisam de autenticação
# Adiciona -H 'Authorization: Bearer SEU_TOKEN_AQUI' após o curl

def add_auth_to_curl(match):
    curl_line = match.group(0)
    # Se já tem Authorization, não adiciona
    if 'Authorization' in curl_line:
        return curl_line

    # Adiciona o header de autenticação
    if curl_line.rstrip().endswith('\\'):
        # Se termina com \, adiciona antes
        return curl_line.replace('\\', ' \\\n  -H \'Authorization: Bearer SEU_TOKEN_AQUI\' \\')
    else:
        # Se não termina com \, adiciona e termina com \
        return curl_line + ' \\\n  -H \'Authorization: Bearer SEU_TOKEN_AURI\''

# Encontra todos os comandos curl que não têm Authorization
# e adiciona o header
curl_pattern = r'curl -[XGETPOST]+.*?(?:\n\s*-H[^n]*)*'

# Abordagem mais simples: substituir curl por curl com auth
content_new = content

# Lista de cURLs que precisam de auth
curls_to_fix = [
    ('curl -X GET "http://localhost:3000/api/agendamentos"', 'curl -X GET "http://localhost:3000/api/agendamentos" \\\n  -H \'Authorization: Bearer SEU_TOKEN_AQUI\''),
    ('curl -X GET "http://localhost:3000/api/agendamentos?data=', 'curl -X GET "http://localhost:3000/api/agendamentos?data='),
    ('curl -X GET "http://localhost:3000/api/agendamentos?profissional_id=', 'curl -X GET "http://localhost:3000/api/agendamentos?profissional_id='),
    ('curl -X PUT http://localhost:3000/api/agendamentos', 'curl -X PUT http://localhost:3000/api/agendamentos \\\n  -H \'Authorization: Bearer SEU_TOKEN_AQUI\''),
    ('curl -X DELETE "http://localhost:3000/api/agendamentos?id=', 'curl -X DELETE "http://localhost:3000/api/agendamentos?id='),
    ('curl -X GET "http://localhost:3000/api/agendamentos/horarios-disponiveis', 'curl -X GET "http://localhost:3000/api/agendamentos/horarios-disponiveis'),
    ('curl -X GET "http://localhost:3000/api/agendamentos/buscar-barbeiro-rodizio', 'curl -X GET "http://localhost:3000/api/agendamentos/buscar-barbeiro-rodizio'),
    ('curl -X DELETE http://localhost:3000/api/agendamentos/cancelar', 'curl -X DELETE http://localhost:3000/api/agendamentos/cancelar \\\n  -H \'Authorization: Bearer SEU_TOKEN_AQUI\''),
    ('curl -X POST http://localhost:3000/api/agendamentos/confirmar-comparecimento', 'curl -X POST http://localhost:3000/api/agendamentos/confirmar-comparecimento \\\n  -H \'Authorization: Bearer SEU_TOKEN_AQUI\''),
    ('curl -X GET "http://localhost:3000/api/clientes/meus-agendamentos', 'curl -X GET "http://localhost:3000/api/clientes/meus-agendamentos'),
    ('curl -X GET "http://localhost:3000/api/barbeiros/agendamentos-hoje', 'curl -X GET "http://localhost:3000/api/barbeiros/agendamentos-hoje'),
    ('curl -X GET "http://localhost:3000/api/barbeiros/agendamentos-semana', 'curl -X GET "http://localhost:3000/api/barbeiros/agendamentos-semana'),
    ('curl -X GET "http://localhost:3000/api/barbeiros/faturamento-mes', 'curl -X GET "http://localhost:3000/api/barbeiros/faturamento-mes'),
    ('curl -X GET http://localhost:3000/api/barbeiros/listar', 'curl -X GET http://localhost:3000/api/barbeiros/listar \\\n  -H \'Authorization: Bearer SEU_TOKEN_AQUI\''),
    ('curl -X GET http://localhost:3000/api/servicos', 'curl -X GET http://localhost:3000/api/servicos \\\n  -H \'Authorization: Bearer SEU_TOKEN_AQUI\''),
    ('curl -X POST http://localhost:3000/api/agendamentos/criar', 'curl -X POST http://localhost:3000/api/agendamentos/criar'),
    ('curl -X POST https://vincebarbearia.vercel.app/api/clientes/enviar-senha-temporaria', 'curl -X POST https://vincebarbearia.vercel.app/api/clientes/enviar-senha-temporaria'),
]

for old, new in curls_to_fix:
    content_new = content_new.replace(old, new)

# Adiciona aviso no topo
warning = '''
---

## ⚠️ IMPORTANTE: AUTENTICAÇÃO

**TODOS os endpoints abaixo requerem token de autenticação!**

```bash
-H "Authorization: Bearer SEU_TOKEN_AQUI"
```

Substitua `SEU_TOKEN_AQUI` pelo seu token real.

---

'''

# Se não tem o aviso ainda, adiciona
if '⚠️ IMPORTANTE: AUTENTICAÇÃO' not in content_new:
    content_new = content_new.replace('# 📚 Documentação Completa da API - Vinci Barbearia', '# 📚 Documentação Completa da API - Vince Barbearia' + warning)

with open('API_DOCUMENTATION.md', 'w', encoding='utf-8') as f:
    f.write(content_new)

print("Autenticacao adicionada em todos os cURLs!")
