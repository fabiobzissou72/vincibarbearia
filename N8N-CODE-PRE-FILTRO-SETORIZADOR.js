/**
 * N8N CODE NODE - PRÉ-FILTRO DE SETORIZAÇÃO
 *
 * IMPORTANTE: Colocar este node ANTES do AI Agent Setorizador
 *
 * FLUXO:
 * Webhook → Code (este arquivo) → IF → AI Agent Setorizador
 *                                  ↓
 *                            SECRETARIA (direto)
 *
 * Este código detecta mensagens que devem ir direto para SECRETARIA
 * sem passar pelo AI Agent, evitando erros de interpretação.
 */

// Pegar a mensagem do cliente
const mensagem = $input.item.json.mensagem || $input.item.json.Body || '';
const mensagemLower = mensagem.toLowerCase();

// LISTA DE PALAVRAS-CHAVE QUE SEMPRE VÃO PARA SECRETARIA
const palavrasChaveHorarios = [
  'horário', 'horarios', 'horario',
  'horas', 'hora',
  'disponível', 'disponivel', 'disponíveis', 'disponiveis',
  'vaga', 'vagas',
  'livre', 'livres',
  'quando', 'que horas',
  'atende', 'atendem',
  'agenda', 'agendar'
];

const palavrasChavePrecos = [
  'preço', 'preco', 'preços', 'precos',
  'valor', 'valores',
  'quanto custa', 'quanto é', 'quanto fica',
  'tabela',
  'serviço', 'servico', 'serviços', 'servicos'
];

const palavrasChaveInfo = [
  'endereço', 'endereco',
  'telefone', 'contato',
  'onde fica', 'localização', 'localizacao',
  'abre', 'fecha', 'funcionamento',
  'aceita', 'pagamento', 'cartão', 'cartao', 'pix'
];

// COMBINAR TODAS AS PALAVRAS-CHAVE
const todasPalavrasChave = [
  ...palavrasChaveHorarios,
  ...palavrasChavePrecos,
  ...palavrasChaveInfo
];

// VERIFICAR SE A MENSAGEM CONTÉM ALGUMA PALAVRA-CHAVE
let encontrouPalavraChave = false;
let palavraEncontrada = '';

for (const palavra of todasPalavrasChave) {
  if (mensagemLower.includes(palavra)) {
    encontrouPalavraChave = true;
    palavraEncontrada = palavra;
    break;
  }
}

// VERIFICAR SE MENCIONA NOME DE BARBEIRO + PALAVRA-CHAVE
// Exemplo: "horários do Alex" → SECRETARIA (não vai para Alex)
const barbeiros = ['alex', 'hiago', 'filippe'];
let mencionaBarbeiro = false;

for (const barbeiro of barbeiros) {
  if (mensagemLower.includes(barbeiro)) {
    mencionaBarbeiro = true;
    break;
  }
}

// DECISÃO
if (encontrouPalavraChave) {
  // ROTA DIRETA PARA SECRETARIA
  return {
    json: {
      setor: 'SECRETARIA',
      motivo: `Palavra-chave detectada: "${palavraEncontrada}"`,
      mensagem_original: mensagem,
      precisa_ai_agent: false, // Não precisa do AI Agent
      rota: 'pre_filtro_automatico'
    }
  };
} else {
  // PRECISA DO AI AGENT PARA DECIDIR
  return {
    json: {
      setor: null,
      motivo: 'Necessário análise do AI Agent',
      mensagem_original: mensagem,
      precisa_ai_agent: true,
      rota: 'ai_agent'
    }
  };
}
