-- Criação da tabela de configurações da barbearia
create table if not exists public.configuracoes (
  id uuid not null default gen_random_uuid(),
  nome_barbearia character varying(255) not null default 'Vince Barbearia',
  endereco text null,
  telefone character varying(50) null,
  email character varying(255) null,
  horario_abertura character varying(5) not null default '09:00',
  horario_fechamento character varying(5) not null default '19:00',
  dias_funcionamento text[] null default ARRAY['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'],
  horarios_por_dia jsonb null default '{
    "Segunda": {"abertura": "09:00", "fechamento": "19:00", "ativo": true},
    "Terça": {"abertura": "09:00", "fechamento": "19:00", "ativo": true},
    "Quarta": {"abertura": "09:00", "fechamento": "19:00", "ativo": true},
    "Quinta": {"abertura": "09:00", "fechamento": "19:00", "ativo": true},
    "Sexta": {"abertura": "09:00", "fechamento": "19:00", "ativo": true},
    "Sábado": {"abertura": "09:00", "fechamento": "18:00", "ativo": true},
    "Domingo": {"abertura": "09:00", "fechamento": "18:00", "ativo": false}
  }'::jsonb,
  tempo_padrao_servico integer not null default 30,
  valor_minimo_agendamento numeric(10, 2) not null default 0,
  notificacoes_whatsapp boolean not null default true,
  notificacoes_email boolean not null default false,
  aceita_agendamento_online boolean not null default true,
  comissao_barbeiro_percentual integer not null default 50,
  webhook_url text null,
  created_at timestamp without time zone null default now(),
  updated_at timestamp without time zone null default now(),
  constraint configuracoes_pkey primary key (id)
) tablespace pg_default;

-- Criar índice para busca rápida
create index if not exists idx_configuracoes_id on public.configuracoes(id);

-- Inserir configuração padrão (apenas se não existir nenhuma)
insert into public.configuracoes (
  nome_barbearia,
  horario_abertura,
  horario_fechamento,
  dias_funcionamento,
  horarios_por_dia,
  tempo_padrao_servico,
  valor_minimo_agendamento,
  notificacoes_whatsapp,
  notificacoes_email,
  aceita_agendamento_online,
  comissao_barbeiro_percentual
)
select
  'Vince Barbearia',
  '09:00',
  '19:00',
  ARRAY['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'],
  '{
    "Segunda": {"abertura": "09:00", "fechamento": "19:00", "ativo": true},
    "Terça": {"abertura": "09:00", "fechamento": "19:00", "ativo": true},
    "Quarta": {"abertura": "09:00", "fechamento": "19:00", "ativo": true},
    "Quinta": {"abertura": "09:00", "fechamento": "19:00", "ativo": true},
    "Sexta": {"abertura": "09:00", "fechamento": "19:00", "ativo": true},
    "Sábado": {"abertura": "09:00", "fechamento": "18:00", "ativo": true},
    "Domingo": {"abertura": "09:00", "fechamento": "18:00", "ativo": false}
  }'::jsonb,
  30,
  0,
  true,
  false,
  true,
  50
where not exists (select 1 from public.configuracoes limit 1);

-- Comentários das colunas
comment on table public.configuracoes is 'Armazena as configurações gerais da barbearia';
comment on column public.configuracoes.horarios_por_dia is 'Horários específicos por dia da semana em formato JSON';
comment on column public.configuracoes.webhook_url is 'URL do webhook N8N para envio de notificações WhatsApp';
