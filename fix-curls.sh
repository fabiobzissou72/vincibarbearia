#!/bin/bash
# Substituir localhost pela URL correta
sed -i 's|http://localhost:3000|https://vincebarbearia.vercel.app|g' API_DOCUMENTATION.md

# Agora adicionar Authorization em todos os curls que não têm
python3 << 'PYTHON'
import re

with open('API_DOCUMENTATION.md', 'r', encoding='utf-8') as f:
    content = f.read()

# Remover linhas de comentário do token
content = re.sub(r'# 🔐 REQUER TOKEN[^\n]*\n', '', content)

# Para cada bloco de curl sem Authorization, adicionar o header
def add_auth(match):
    curl_line = match.group(0)
    # Se já tem Authorization, retorna original
    if 'Authorization' in curl_line:
        return curl_line
    # Adiciona Authorization
    if curl_line.rstrip().endswith('\'):
        return curl_line.replace(' \', ' \\\n  -H "Authorization: Bearer SEU_TOKEN_AQUI" \\n')
    else:
        return curl_line + ' \\\n  -H "Authorization: Bearer SEU_TOKEN_AQUI"\n'

# CURLs que precisam de auth
curls = [
    (r'curl -X GET [^\n]+', add_auth)
]

# Adiciona auth nos curls simples
for pattern, replacement in curls:
    content = re.sub(pattern, replacement, content)

with open('API_DOCUMENTATION.md', 'w', encoding='utf-8') as f:
    f.write(content)

print('Done!')
PYTHON
