'use client'

import dynamic from 'next/dynamic'
import { useState, useEffect } from 'react'
import 'swagger-ui-react/swagger-ui.css'

const SwaggerUI = dynamic(() => import('swagger-ui-react'), {
  ssr: false,
  loading: () => <div style={{ padding: '20px', textAlign: 'center' }}>Carregando Swagger UI...</div>
})

export default function APIDocsPage() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', fontSize: '18px' }}>
        Carregando documentação da API...
      </div>
    )
  }

  return (
    <div className="w-full min-h-screen bg-white">
      <style jsx global>{`
        /* Force light theme - remove dark mode */
        body {
          background: #fafafa !important;
        }

        .swagger-ui {
          background: #fafafa !important;
        }

        .swagger-ui .info {
          background: white !important;
        }

        .swagger-ui .scheme-container {
          background: white !important;
        }

        .swagger-ui .opblock-tag {
          background: white !important;
          border-bottom: 1px solid rgba(59,65,81,.3) !important;
        }

        .swagger-ui .opblock {
          background: white !important;
          border: 1px solid #d3d3d3 !important;
        }

        .swagger-ui .opblock .opblock-summary {
          background: white !important;
        }

        .swagger-ui .opblock.opblock-get .opblock-summary {
          background: rgba(97, 175, 254, 0.1) !important;
        }

        .swagger-ui .opblock.opblock-post .opblock-summary {
          background: rgba(73, 204, 144, 0.1) !important;
        }

        .swagger-ui .opblock.opblock-put .opblock-summary {
          background: rgba(252, 161, 48, 0.1) !important;
        }

        .swagger-ui .opblock.opblock-delete .opblock-summary {
          background: rgba(249, 62, 62, 0.1) !important;
        }

        .swagger-ui .opblock-section-header {
          background: rgba(0,0,0,.03) !important;
        }

        .swagger-ui .tab li {
          background: white !important;
        }

        .swagger-ui .model-box {
          background: rgba(0,0,0,.05) !important;
        }

        .swagger-ui .model {
          background: white !important;
        }

        .swagger-ui table thead tr td,
        .swagger-ui table thead tr th {
          background: rgba(0,0,0,.05) !important;
        }

        .swagger-ui .parameter__name,
        .swagger-ui .parameter__type,
        .swagger-ui .response-col_status {
          color: #3b4151 !important;
        }

        .swagger-ui .btn {
          background: white !important;
          border: 2px solid #3b4151 !important;
          color: #3b4151 !important;
        }

        .swagger-ui .btn.authorize {
          background: #49cc90 !important;
          border-color: #49cc90 !important;
          color: white !important;
        }

        .swagger-ui .btn.execute {
          background: #4990e2 !important;
          border-color: #4990e2 !important;
          color: white !important;
        }

        .swagger-ui input[type=text],
        .swagger-ui input[type=email],
        .swagger-ui input[type=password],
        .swagger-ui textarea,
        .swagger-ui select {
          background: white !important;
          border: 1px solid #d3d3d3 !important;
          color: #3b4151 !important;
        }

        /* Topbar styling */
        .swagger-ui .topbar {
          background-color: #89bf04 !important;
          padding: 10px 0;
        }

        .swagger-ui .topbar .download-url-wrapper {
          background: white !important;
        }

        .swagger-ui .topbar .download-url-wrapper input[type=text] {
          border: 2px solid #89bf04 !important;
        }

        /* Information section */
        .swagger-ui .info .title {
          color: #3b4151 !important;
        }

        .swagger-ui .info p,
        .swagger-ui .info li {
          color: #3b4151 !important;
        }

        /* Response/Request body */
        .swagger-ui .responses-inner > div > .highlight-code > .microlight,
        .swagger-ui .request-body > .highlight-code > .microlight {
          background: #41444e !important;
          color: white !important;
        }

        /* Code blocks */
        .swagger-ui pre {
          background: #41444e !important;
          color: white !important;
        }

        /* Markdown */
        .swagger-ui .markdown p,
        .swagger-ui .markdown h1,
        .swagger-ui .markdown h2,
        .swagger-ui .markdown h3,
        .swagger-ui .markdown h4,
        .swagger-ui .markdown h5 {
          color: #3b4151 !important;
        }

        .swagger-ui .markdown code {
          background: rgba(0,0,0,.05) !important;
          color: #3b4151 !important;
        }
      `}</style>
      <SwaggerUI url="/swagger.yaml" />
    </div>
  )
}
