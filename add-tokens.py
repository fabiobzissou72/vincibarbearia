#!/usr/bin/env python3
import re

with open('API_DOCUMENTATION.md', 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = []
i = 0
while i < len(lines):
    line = lines[i]

    # Pular linhas de comentário do token
    if '# 🔐 REQUER TOKEN' in line:
        i += 1
        continue

    # Se é linha curl e NÃO tem Authorization, adiciona
    if line.strip().startswith('curl'):
        # Verifica se as próximas 3 linhas têm Authorization
        has_auth = False
        for j in range(i, min(i+5, len(lines))):
            if 'Authorization' in lines[j]:
                has_auth = True
                break

        if not has_auth:
            # Adiciona o curl
            new_lines.append(line.rstrip())
            # Se termina com \, adiciona quebra
            if line.rstrip().endswith('\\'):
                new_lines.append(' \\\n')
            else:
                new_lines.append(' \\\n')
            # Adiciona Authorization
            new_lines.append('  -H "Authorization: Bearer SEU_TOKEN_AQUI"\n')
            i += 1

            # Pular linhas vazias depois
            while i < len(lines) and lines[i].strip() in ['', '\\']:
                i += 1
            continue

    new_lines.append(line)
    i += 1

with open('API_DOCUMENTATION.md', 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print('Tokens adicionados em todos os cURLs!')
