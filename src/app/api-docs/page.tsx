'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Book, ExternalLink } from 'lucide-react'

export default function APIDocsPage() {
  const [swaggerContent, setSwaggerContent] = useState<string>('')

  useEffect(() => {
    // Carregar o conteúdo do swagger.yaml
    fetch('/swagger.yaml')
      .then(res => res.text())
      .then(content => setSwaggerContent(content))
      .catch(err => console.error('Erro ao carregar swagger:', err))
  }, [])

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Book className="h-8 w-8" />
            Documentação da API
          </h1>
          <p className="text-gray-600 mt-2">
            Documentação completa de todas as APIs do sistema Vinci Barbearia
          </p>
        </div>
        <a
          href="https://editor.swagger.io"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <ExternalLink className="h-4 w-4" />
          Abrir no Swagger Editor
        </a>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Como Usar</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-bold mb-2">1. Visualizar no Swagger Editor</h3>
            <p className="text-sm text-gray-600">
              Clique no botão "Abrir no Swagger Editor" acima e cole o conteúdo YAML abaixo
              para uma visualização interativa completa com teste de APIs.
            </p>
          </div>

          <div>
            <h3 className="font-bold mb-2">2. Autenticação</h3>
            <p className="text-sm text-gray-600">
              A maioria dos endpoints requer autenticação via Bearer Token:
            </p>
            <code className="block mt-2 p-2 bg-gray-100 rounded text-sm">
              Authorization: Bearer SEU_TOKEN_AQUI
            </code>
          </div>

          <div>
            <h3 className="font-bold mb-2">3. Correções Implementadas</h3>
            <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
              <li>✅ Validação de preço corrigida (aceita string e number)</li>
              <li>✅ APIs de barbeiros aceitam telefone, nome ou ID</li>
              <li>✅ Webhooks personalizados por barbeiro implementados</li>
              <li>✅ Documentação Swagger completa criada</li>
            </ul>
          </div>

          <div>
            <h3 className="font-bold mb-2">4. Principais Endpoints</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
              <div className="p-3 bg-gray-50 rounded">
                <h4 className="font-semibold text-sm">Agendamentos</h4>
                <ul className="text-xs text-gray-600 mt-1 space-y-1">
                  <li>• DELETE /api/agendamentos/cancelar</li>
                </ul>
              </div>
              <div className="p-3 bg-gray-50 rounded">
                <h4 className="font-semibold text-sm">Barbeiros</h4>
                <ul className="text-xs text-gray-600 mt-1 space-y-1">
                  <li>• GET /api/barbeiros/agendamentos-semana</li>
                  <li>• GET /api/barbeiros/faturamento-mes</li>
                </ul>
              </div>
              <div className="p-3 bg-gray-50 rounded">
                <h4 className="font-semibold text-sm">Produtos</h4>
                <ul className="text-xs text-gray-600 mt-1 space-y-1">
                  <li>• POST /api/produtos/criar</li>
                  <li>• POST /api/produtos/atualizar</li>
                </ul>
              </div>
              <div className="p-3 bg-gray-50 rounded">
                <h4 className="font-semibold text-sm">Planos</h4>
                <ul className="text-xs text-gray-600 mt-1 space-y-1">
                  <li>• POST /api/planos/criar</li>
                  <li>• POST /api/planos/atualizar</li>
                </ul>
              </div>
              <div className="p-3 bg-gray-50 rounded">
                <h4 className="font-semibold text-sm">Webhooks</h4>
                <ul className="text-xs text-gray-600 mt-1 space-y-1">
                  <li>• POST /api/barbeiros/configurar-webhook</li>
                </ul>
              </div>
              <div className="p-3 bg-gray-50 rounded">
                <h4 className="font-semibold text-sm">Cron</h4>
                <ul className="text-xs text-gray-600 mt-1 space-y-1">
                  <li>• GET /api/cron/lembretes</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>swagger.yaml</span>
            <button
              onClick={() => {
                navigator.clipboard.writeText(swaggerContent)
                alert('Conteúdo copiado para a área de transferência!')
              }}
              className="text-sm px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
            >
              Copiar
            </button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto text-xs max-h-[600px] overflow-y-auto">
            {swaggerContent || 'Carregando...'}
          </pre>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Download</CardTitle>
        </CardHeader>
        <CardContent>
          <a
            href="/swagger.yaml"
            download="vinci-barbearia-api.yaml"
            className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            📥 Baixar swagger.yaml
          </a>
        </CardContent>
      </Card>
    </div>
  )
}
