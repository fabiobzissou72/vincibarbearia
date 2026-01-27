-- Criação das tabelas de produtos
create table public.produtos (
  id uuid not null default gen_random_uuid (),
  nome character varying(255) not null,
  funcao text null,
  descricao text null,
  preco numeric(10, 2) not null,
  beneficios text null,
  contra_indicacoes text null,
  categoria character varying(100) null,
  ativo boolean null default true,
  estoque integer null default 0,
  data_cadastro timestamp without time zone null default now(),
  constraint produtos_pkey primary key (id)
) tablespace pg_default;

-- Criação das tabelas de planos
create table public.planos (
  id uuid not null default gen_random_uuid (),
  nome character varying(255) not null,
  itens_inclusos text not null,
  valor_total numeric(10, 2) not null,
  valor_original numeric(10, 2) not null,
  economia numeric(10, 2) not null,
  validade_dias integer not null default 30,
  ativo boolean null default true,
  data_cadastro timestamp without time zone null default now(),
  constraint planos_pkey primary key (id)
) tablespace pg_default;

-- Atualizar tabela de serviços (se necessário)
alter table public.servicos add column if not exists executor character varying(100) null;

-- Inserir dados dos serviços do PDF
insert into public.servicos (nome, descricao, preco, duracao_minutos, categoria, executor) values
('Barba Completa', 'Afinação completa da barba com máquina, acabamento refinado com navalha e ozonioterapia para limpeza profunda e hidratação.', 55.00, 30, 'Barba', 'Barbeiro'),
('Barboterapia', 'Ritual completo de cuidado facial para barba, com aplicação de toalha quente, massagens e produtos, promovendo relaxamento e revitalização.', 45.00, 30, 'Barba', 'Auxiliar'),
('Coloração Barba', 'Aplicação personalizada de tinta para cobertura de fios brancos ou renovação da cor da barba, com fase de pausa para fixação.', 50.00, 15, 'Coloração', 'Barbeiro'),
('Coloração Cabelo', 'Tonalização ou cobertura de raízes com tinta profissional, incluindo tempo de ação para melhor fixação.', 50.00, 15, 'Coloração', 'Barbeiro'),
('Corte', 'Corte de cabelo personalizado com máquina, tesoura e finalização com navalha para contornos limpos e definidos.', 70.00, 30, 'Cabelo', 'Barbeiro'),
('Depilação de orelha Cera', 'Remoção dos pelos com cera quente e palitos, garantindo conforto e limpeza.', 40.00, 30, 'Depilação', 'Auxiliar'),
('Depilação Nariz Cera', 'Depilação nasal com cera, feita com precisão por palitos, remoção de pelos internos.', 40.00, 30, 'Depilação', 'Auxiliar'),
('Hidratação com Massagem', 'Máscara profunda + massagem capilar usando ozonioterapia para nutrição intensiva e relaxamento.', 60.00, 30, 'Tratamento', 'Auxiliar'),
('Lavagem com massagem', 'Lavagem capilar com shampoo e condicionador seguida de massagem manual estimulante do couro cabeludo.', 10.00, 30, 'Tratamento', 'Auxiliar'),
('Manicure mão', 'Corte, lixamento e higiene das unhas com alicates, finalização com creme nutricional.', 40.00, 30, 'Estética', 'Auxiliar'),
('Manicure pé', 'Cuidados com os pés: corte de unhas, lixamento e aplicação de cremes hidratantes.', 40.00, 30, 'Estética', 'Auxiliar'),
('Maquiagem (noivos)', 'Aplicação profissional com prime, base, corretivo e acabamento, incluindo preparação de pele e fixação.', 80.00, 30, 'Estética', 'Auxiliar'),
('Massagem capilar', 'Massagem relaxante com creme específico, realizada manualmente para estimular circulação.', 50.00, 30, 'Tratamento', 'Auxiliar'),
('Matização Barba', 'Cream neutralizante aplicado para corrigir tonalidade indesejada e realçar cor natural da barba.', 30.00, 30, 'Coloração', 'Barbeiro'),
('Matização Cabelo', 'Cream matizador corrigindo reflexos indesejados, resultando em cor com aparência equilibrada.', 40.00, 30, 'Coloração', 'Barbeiro'),
('Penteado com Lavada', 'Auxiliar lava e prepara, barbeiro realiza escova e penteado com secador, escova, pomadas e laquê.', 25.00, 30, 'Finalização', 'Auxiliar e Barbeiro'),
('Pezinho', 'Acabamento com navalha nas laterais, nuca e costeletas para um aspecto limpo e alinhado.', 20.00, 30, 'Acabamento', 'Barbeiro'),
('Raspagem', 'Barba totalmente raspada com máquina, seguida de acabamento preciso com navalha ou shaver.', 55.00, 30, 'Barba', 'Barbeiro'),
('Selagem', 'Tratamento térmico reconstrutor com aplicação de botox ou selante, selagem de cutícula com secador e chapinha.', 85.00, 60, 'Tratamento', 'Barbeiro'),
('Selagem franja', 'Selamento térmico apenas na franja, resultando em fios alinhados, com secador e chapinha.', 40.00, 30, 'Tratamento', 'Barbeiro'),
('Sobrancelha na cera', 'Modelagem de sobrancelha com aplicação de cera específica para depilação facial.', 40.00, 30, 'Estética', 'Auxiliar'),
('Sobrancelha navalha', 'Definição de sobrancelhas com navalha para linhas precisas e limpas.', 40.00, 30, 'Estética', 'Auxiliar'),
('Sobrancelha pinça', 'Modelagem detalhada com pinça, visando simetria e acabamento natural.', 40.00, 30, 'Estética', 'Auxiliar'),
('Spa dos pés', 'Tratamento completo nos pés: esfoliação, lixas, corte de unha, hidratação intensa e massagem manual.', 95.00, 30, 'Tratamento', 'Auxiliar');

-- Inserir dados dos produtos do PDF
insert into public.produtos (nome, funcao, descricao, preco, beneficios, contra_indicacoes, categoria) values
('Balm para cabelo e barba', 'Finalização e hidratação capilar e da barba', 'Hidratante com textura leve, usado após o banho para manter os fios alinhados e perfumados.', 60.00, 'Hidrata profundamente, suaviza os fios, controla o frizz e proporciona sensação refrescante.', 'Não indicado para pessoas com alergia a fragrâncias ou óleos essenciais presentes na fórmula.', 'Finalização'),
('Creme para cabelos cacheados', 'Modelador e ativador de cachos', 'Creme específico para realçar e definir cachos, promovendo hidratação e controle de volume.', 60.00, 'Define os cachos, reduz o frizz e hidrata os fios sem pesar.', 'Pode não ser ideal para cabelos lisos ou oleosos.', 'Modelador'),
('Óleo para barba', 'Hidratação e brilho para a barba', 'Produto em óleo com rápida absorção que hidrata profundamente a barba e a pele.', 55.00, 'Reduz coceira, promove crescimento saudável, brilho e maciez.', 'Não recomendado para peles muito oleosas ou com acne ativa.', 'Hidratação'),
('Laquê Schwarzkopf alta fixação', 'Fixador para penteados', 'Produto em spray de alta fixação, importado, ideal para finalizar penteados que exigem longa duração.', 130.00, 'Alta durabilidade do penteado, resistência à umidade e acabamento profissional.', 'Pessoas com couro cabeludo sensível ou alergia a aerossóis devem evitar.', 'Fixador'),
('Pomada Macholândia (molhado/seco/pó)', 'Modelador capilar com base natural', 'Pomada natural disponível em versões com brilho (molhado), efeito natural (seco) e textura firme (pó).', 65.00, 'Fixação leve a média sem agredir o couro cabeludo, ideal para uso diário.', 'Menor fixação pode não atender quem precisa de penteado estruturado.', 'Modelador'),
('Pomada Don Alcides (molhado/seco/pó)', 'Modelador capilar com alta fixação e fragrância marcante', 'Pomada com fragrância intensa e fixação mais forte, disponível nas três versões: molhado, seco e pó.', 99.00, 'Alta fixação, fragrância agradável, ideal para eventos ou produções duradouras.', 'Não indicada para couro cabeludo sensível ou quem prefere produtos sem cheiro.', 'Modelador'),
('Escova pequena', 'Escovar cabelos curtos e franjas', 'Escova com base pequena e cerdas mistas, ideal para detalhes e franjas.', 80.00, 'Facilita a modelagem e alinha fios curtos ou franjas com precisão.', 'Não recomendada para cabelos muito longos ou volumosos.', 'Ferramenta'),
('Escova raquete', 'Desembaraçar e alinhar cabelo', 'Escova de base larga e plana, perfeita para pentear cabelos médios a longos.', 80.00, 'Desembaraça sem quebrar os fios, ideal para uso diário.', 'Não indicada para modelagem ou definição de volume.', 'Ferramenta');

-- Inserir dados dos planos do PDF
insert into public.planos (nome, itens_inclusos, valor_total, valor_original, economia) values
('3 Cortes', '3x Corte', 172.50, 210.00, 37.50),
('4 Hidratações', '4x Hidratação com Massagem', 200.00, 240.00, 40.00),
('4 Barbas', '4x Barba Completa', 180.00, 220.00, 40.00),
('4 Cortes + 4 Barbas', '4x Corte + 4x Barba Completa', 360.00, 520.00, 160.00),
('2 Sobrancelhas Navalha', '2x Sobrancelha navalha', 70.00, 80.00, 10.00),
('4 Sobrancelhas Pinça', '4x Sobrancelha pinça', 120.00, 160.00, 40.00),
('2 Cortes + 2 Barbas', '2x Corte + 2x Barba Completa', 220.00, 260.00, 40.00),
('2 Barboterapias', '2x Barboterapia', 80.00, 90.00, 10.00),
('4 Barboterapias', '4x Barboterapia', 150.00, 180.00, 30.00),
('2 Cortes', '2x Corte', 120.00, 140.00, 20.00),
('4 Sobrancelhas Navalha', '4x Sobrancelha navalha', 120.00, 160.00, 40.00),
('2 Sobrancelhas Pinça', '2x Sobrancelha pinça', 70.00, 80.00, 10.00),
('2 Cortes + 4 Barbas', '2x Corte + 4x Barba Completa', 280.00, 370.00, 90.00),
('2 Barbas', '2x Barba Completa', 100.00, 110.00, 10.00);