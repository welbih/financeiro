# Financeiro

Base do sistema de gestão financeira com Next.js, React, TypeScript e Tailwind CSS.

## Desenvolvimento

```bash
npm ci
npm run dev
```

Acesse http://localhost:3000.

## Autenticação

Copie `.env.example` para `.env.local` e configure `API_URL`, `CLIENT_ID` e
`CLIENT_SECRET` com os valores da API `financeiro-api`. Reinicie o servidor
após alterar as variáveis. Essas variáveis são usadas apenas no servidor.

O login envia o usuário (email) e a senha para `POST /oauth2/token`, com Basic
Auth do cliente e o grant `urn:financeiro:params:oauth:grant-type:password`.
O token é armazenado em cookie HttpOnly, com a validade informada pela API.
Após o sucesso, o usuário é direcionado para `/planejamento-financeiro`.
A tela `/lancamentos` abre no
mês atual (fuso America/Sao_Paulo) e usa GET `/lancamentos/resumo-mensal?mes=AAAA-MM`
para mostrar os lançamentos e os cards de despesas, receitas e restante
(`diferenca` retornada pela API). É possível navegar entre meses, selecionar
mês/ano e voltar ao mês atual. O resumo considera a previsão de pagamento ou,
quando ausente, o vencimento, conforme a regra da API.
Inclusão, edição e exclusão usam POST `/lancamentos` e PUT/DELETE
`/lancamentos/{id}` e atualizam o resumo do mês selecionado.
As chamadas são feitas no servidor com o token Bearer do cookie. Uma sessão
ausente ou rejeitada pela API redireciona para o login. Lançamentos pagos
exigem data de pagamento. A exclusão solicita confirmação.

O cabeçalho das telas autenticadas mostra o nome e sobrenome do usuário (claims
`nome` e `sobrenome` do token, usados somente para exibição) e o menu
Lançamentos/Categorias. Tokens antigos sem esses campos mostram apenas
"Usuário"; entre novamente após atualizar a API para exibir o nome completo.
Ao clicar no nome ou na inicial, o menu oferece Sair. A saída usa
POST `/auth/logout` com Bearer Token, remove o cookie local e retorna ao login.
Se a API falhar, a sessão é mantida para permitir tentar novamente; tokens
já expirados ou revogados (HTTP 401) encerram a sessão local normalmente.
A opção Alterar senha, acima de Sair, abre uma modal com senha atual, nova
senha e confirmação. Usa PUT `/usuarios/senha` com Bearer Token e somente
`senhaAtual` e `novaSenha` no JSON. A nova senha exige pelo menos 8 caracteres, letra maiúscula, minúscula, número
de 0 a 9 e caractere especial, com no máximo 72 bytes UTF-8. O formulário
mostra os requisitos e a confirmação em tempo real, usando a mesma validação
da ação do servidor. O sucesso limpa os campos e mantém a sessão,
conforme o comportamento da API. Nenhuma senha é registrada em logs.
O CRUD de categorias usa GET/POST `/categorias` e PUT/DELETE `/categorias/{id}`,
com nome de até 100 caracteres e tipo Receita ou Despesa. A API controla nomes
duplicados e impede excluir ou alterar o tipo de categorias em uso.
O formulário de lançamento permite salvar sem categoria (`categoriaId: null`).
Quando selecionada, a categoria deve ser do mesmo tipo do lançamento.
O seletor carrega todas as páginas de categorias. Os campos obrigatórios e
opcionais são identificados nos rótulos dos formulários.

## Situação financeira

Disponível no menu principal, antes de Lançamentos, na rota `/planejamento-financeiro`.
A configuração fica separada em `/planejamento-financeiro/configuracao`, acessível
no menu principal, à direita de Categorias. Os ciclos, cards e lançamentos permanecem
na tela principal do planejamento. Ao salvar a configuração, seus dados e os
resumos do planejamento são invalidados para atualizar as próximas consultas.
A configuração usa GET/PUT `/planejamento-financeiro`, com dia de fechamento
de 1 a 31, início do controle no dia seguinte a um fechamento e saldo inicial
(zero, positivo ou negativo). HTTP 404 na consulta inicial indica ausência de
configuração e abre o formulário de cadastro.

GET `/planejamento-financeiro/resumo?mesFechamento=AAAA-MM` carrega cada ciclo,
seus lançamentos, receitas/despesas pagas e pendentes e os saldos projetados.
A navegação respeita o primeiro ciclo do controle e ajusta fechamentos 29–31
ao último dia dos meses menores. O ciclo atual considera o fuso America/Sao_Paulo.
Os valores são projeções da API, com lançamentos pagos e pendentes; alterações
na configuração ou em lançamentos passados recalculam os ciclos futuros.
O botão Adicionar lançamento abre o mesmo formulário da tela de lançamentos,
sem sair do planejamento. Ao salvar, o ciclo selecionado é atualizado. Datas
fora do período exibido são indicadas na mensagem de confirmação.
Na listagem do ciclo, Pagar (despesas) e Receber (receitas) usam
PATCH `/lancamentos/{id}/pagar`. O botão com borda abre uma modal com data de
pagamento opcional; ao confirmar, envia `{data: "AAAA-MM-DD"}` se preenchida ou
omite o corpo para usar a data atual definida pela API.
A ação aparece somente para registros pendentes e atualiza o resumo
do ciclo e os dados das duas telas após sucesso.

No cadastro, Recorrência permite escolher de 0 a 12 meses adicionais, enviando
`quantidadeRecorrencias` em POST `/lancamentos`. Por exemplo, 2 cria o original
e mais dois lançamentos mensais, com o mesmo valor e categoria. A API ajusta
datas para o último dia dos meses menores e copia também o status pago e a
data de pagamento. Na edição o campo não é enviado; cada registro é independente.

## Comandos

- `npm run dev`: inicia o servidor de desenvolvimento.
- `npm run build`: gera a versão de produção.
- `npm start`: inicia a versão de produção após o build.
- `npm run lint`: verifica o código com ESLint.

## Estrutura

- `app/page.tsx`: formulário de login.
- `app/actions/login.ts`: integração de autenticação pelo servidor.
- `app/lancamentos/page.tsx`: página inicial de lançamentos.
- `app/categorias/page.tsx`: página de gerenciamento de categorias.
- `app/components/`: cabeçalho, navegação e layout das telas autenticadas.
- `app/layout.tsx`: layout principal e metadados.
- `app/globals.css`: estilos globais e configuração do Tailwind CSS.

## Usuários (administração)

O menu Usuários aparece à direita de Configuração do planejamento apenas para
sessões com `ROLE_ADMIN` no claim `authorities`. A rota `/usuarios` lista nome,
sobrenome, email, perfis e situação, com paginação em GET `/usuarios`.
A API valida o token e a permissão em todas as consultas. Acesso sem sessão
retorna ao login; sem perfil administrador ou HTTP 403 retorna à situação
financeira. O token e senhas não são enviados como propriedades ao navegador.
A coluna Ações permite ativar usuários inativos e desativar usuários ativos,
com confirmação e atualização da página atual da listagem. As operações usam
PATCH `/usuarios/{id}/ativar` e `/usuarios/{id}/inativar`, sem corpo, com a mesma
verificação de administrador. A desativação da própria conta é bloqueada no botão e na ação do servidor.
