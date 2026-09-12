# Registro de decisões técnicas — LOOP

Cada entrada segue 4 partes: proposta original do usuário, contra-argumentação
(se houve), decisão final e motivo, alternativa descartada e condição de
reconsideração.

---

## 2026-08-29 — Verbo HTTP da edição: `PATCH` em vez de `PUT`

**Contexto:** `PUT /users/:id` e `PUT /habits/:id` eram os endpoints de
edição. O item ficou aberto na seção 7 do `PROGRESSO-2026-08-29.md`
("Usuário adiou").

**Proposta original do usuário:** trocar o verbo de edição para `PATCH`.

**Contra-argumentação:** nenhuma. A semântica de atualização parcial já
estava implementada — `UpdateHabitVal = CreateHabitVal.partial()` e o
schema de usuário com `.partial()` fazem todo campo ser opcional e só
atualizam o que vem no corpo. O verbo `PUT` já se comportava como
`PATCH` na prática; a mudança alinha o contrato ao comportamento real,
sem alterar handler nem validação.

**Decisão final:** `PATCH /users/:id` e `PATCH /habits/:id`.

- Rotas: `src/routes/UserRoute.ts`, `src/routes/HabitRoute.ts`
  (`server.put` → `server.patch`).
- Testes: `src/__tests__/ownership.test.ts`, `src/__tests__/gaps.test.ts`
  (`method: "PUT"` → `"PATCH"` e descrições).
- Doc: tabela de rotas em `docs/VISAO-GERAL.md`.

**Motivo:** `PATCH` comunica "atualização parcial" — que é o que o
endpoint faz. `PUT` sinalizaria substituição do recurso inteiro, o que
exigiria o corpo completo e não é o caso.

**Alternativa descartada:** manter `PUT`. Seria reconsiderado se a
edição passasse a exigir o recurso completo no corpo (substituição
total, campos omitidos viram `null`/default), aí `PUT` seria o verbo
correto.

---

## 2026-09-04 — Vigência de edição do `HabitSchedule`: imediata, não `>= amanhã`

**Contexto:** revisa 6.2/6.4 de `docs/explain/DECISOES-NAO-IMPLEMENTADAS.md`
(decididas em 28/08, ainda sem código). Detalhe completo em
`docs/progress/PROGRESSO-2026-09-04.md`.

**Proposta original do usuário:** manter a edição de schedule
não-retroativa entre dias, mas trocar `effectiveFrom >= amanhã` por
vigência **na hora** — a edição já vale a partir do instante em que é
feita, dentro do próprio dia.

**Contra-argumentação:** isso reabre o "dia partido" que a 6.4 original
existia pra evitar. A 6.4 garantia uma versão por dia calendário, o que
tornava `completed(D)` uma função sem ambiguidade
(`schedule_vigente_em(D)` com resposta única). Vigência imediata permite
duas ou mais versões dentro do mesmo dia, e isso força regras novas pra
`completed(D)` não ficar ambíguo (ver as três decisões seguintes).

**Decisão final:** vigência imediata. Não-retroatividade **entre dias**
continua valendo — só dentro do próprio dia é que passou a admitir mais
de uma versão. `effectiveFrom`/`effectiveTo` continuam `Date` (resolvem
a fronteira entre dias); um campo de hora novo desempata versões do
mesmo dia.

**Alternativa descartada:** manter `effectiveFrom >= amanhã` (a 6.2
original, mais simples — garantia 1 versão por dia sem regra extra).
Reconsiderar se a reprojeção de contagem dentro do dia (decisão
seguinte) se mostrar mais complexa de manter do que o ganho de "a
edição já vale agora".

---

## 2026-09-04 — `completed(D)`: reprojeta se o dia continua agendado, tranca se o dia sai da agenda

**Contexto:** sub-decisão forçada pela vigência imediata (decisão
acima). Ver `docs/progress/PROGRESSO-2026-09-04.md`, item 4.

**Proposta original do usuário:** um dia já completado antes de uma
edição no mesmo dia continua contando como feito, mesmo que a edição
tire aquele dia da agenda — exemplo usado: `WEEKLY[Ter,Qui,Sex]` meta 5,
completa as 5 na sexta, edita pra `WEEKLY[Ter,Qui]` (sexta sai da
agenda), a sexta continua valendo como dia feito.

**Contra-argumentação:** isso parecia contradizer a resposta já dada
pro caso de só o `targetPerDay` mudar no mesmo dia mantendo o dia
agendado (schedule com meta 4, `1/4` feito, edita a meta pra 3, a
contagem reprojeta pra `1/3` — deixa de contar). Se "já cumpriu, fica
selado" fosse regra geral, esse outro caso também devia ficar selado, e
não fica.

**Decisão final:** duas regras conforme o eixo que mudou.
- Dia **continua** na agenda da versão mais nova (só o alvo numérico
  mudou): sempre **reprojeta** contra o alvo atual, pra cima ou pra
  baixo.
- Dia **sai** da agenda da versão mais nova (não é mais dia-alvo pelo
  `daysOfWeek`/`type`): **tranca** no estado de conclusão de antes da
  edição.

O critério é "o dia continua sendo dia-alvo pela versão mais recente, ou
não" — não "o dia já foi completado antes, ou não". Derivável sem
materializar nada novo: olha a última versão do dia; se inclui hoje,
reprojeta; se não inclui, olha o estado acumulado até o instante em que
a última versão que incluía hoje deixou de valer.

**Alternativa descartada:** selar sempre que o dia já tiver sido
completado, inclusive contra aumento de alvo (protegeria também o caso
`1/4`→`1/3` acima). Descartada porque o usuário confirmou
explicitamente que só o caso "dia sai da agenda" deve travar; aumento de
alvo no mesmo dia continua reprojetando pra baixo.

---

## 2026-09-04 — Reversão de `HabitSchedule` sempre cria corte novo, sem merge

**Contexto:** sub-decisão forçada pela vigência imediata. Ver
`docs/progress/PROGRESSO-2026-09-04.md`, item 5.

**Proposta original do usuário:** `HabitSchedule` só define frequência;
a tabela de log não muda por causa disso. Não existe "undo" de
schedule, só `edit` — se o usuário quiser voltar pro valor anterior,
edita de novo com os mesmos valores (`C = A`).

**Contra-argumentação:** nenhuma. A pergunta original (desenhada em
29/08 sob o modelo `effectiveFrom >= amanhã`) assumia que uma edição
revertida antes de "amanhã" nunca tinha governado nada, então apagá-la
era seguro por definição. Com vigência imediata isso mudava de forma —
toda versão vale a partir da criação, então uma reversão rápida (A→B→A)
faz B existir de verdade por um tempo real, ainda que curto. A proposta
do usuário resolve isso não tentando detectar o caso — trata toda
edição, incluindo reversões, como uma edição comum.

**Decisão final:** sempre aceita o corte. Toda edição sempre cria uma
versão nova e fecha a anterior, mesmo que os valores sejam idênticos a
uma versão passada. Sem lógica de detectar-e-mesclar reversões.

**Alternativa descartada:** detectar reversão (nova versão com valores
idênticos a uma versão recente que não teve evento embaixo dela) e
mesclar, reabrindo a versão antiga. Descartada por adicionar checagem e
complexidade sem problema real medido — mesma lógica da 6.5 (não
otimiza sem evidência). Reconsiderar se o número de cortes no-op na
timeline se mostrar um problema concreto na prática (não por intuição).

---

## 2026-09-04 — `schedule` no `PATCH` é sempre o objeto completo, sem merge parcial

**Contexto:** fecha o item 3 de "Aberto nesta seção" de
`docs/progress/PROGRESSO-2026-08-29.md`. Ver
`docs/progress/PROGRESSO-2026-09-04.md`, item 6.

**Proposta original do usuário:** sempre completo.

**Contra-argumentação:** nenhuma — a alternativa (merge parcial) foi
descartada na própria discussão: `schedule` é união discriminada por
`type` (`DAILY | WEEKLY | INTERVAL`), e merge parcial ingênuo permite
estados inválidos (ex: `PATCH { schedule: { type: "INTERVAL" } }` numa
versão hoje `WEEKLY` produziria `type` trocado com `daysOfWeek` órfão e
sem `intervalDays`). Evitar isso exigiria uma regra extra ("trocar
`type` exige mandar todos os campos daquela variante junto"), que já é
metade do caminho de volta pro "sempre completo".

**Decisão final:** quando a chave `schedule` vier no `PATCH`, tem que
ser o objeto inteiro da união discriminada — mesma validação da
criação, reusa o mesmo Zod `discriminatedUnion` de 6.3 (sem
`UpdateScheduleVal` separado). O `PATCH` do hábito como um todo
continua parcial (`name`/`description` podem vir sozinhos); a regra de
"sempre completo" vale só dentro da chave `schedule`.

**Alternativa descartada:** merge parcial de campos sobre a versão
vigente. Descartada pelo motivo acima (estados inválidos na união
discriminada). Reconsiderar só se `schedule` deixar de ser união
discriminada (ex: virar um objeto só com campos sempre presentes,
nenhum condicional por `type`).

---

## 2026-09-04 — `pendingSchedule` eliminado do contrato de leitura

**Contexto:** consequência direta da vigência imediata, não uma
decisão isolada. Substitui parte do contrato de leitura desenhado na
seção 7 de `docs/progress/PROGRESSO-2026-08-29.md`. Ver
`docs/progress/PROGRESSO-2026-09-04.md`, item 7.

**Proposta original do usuário:** nenhuma proposta nova — o assistente
identificou que a pergunta original ("`GET /me/habits` também carrega
`pendingSchedule`?") pressupunha um conceito que a vigência imediata já
tinha matado, e perguntou se `pendingSchedule` ainda fazia sentido.

**Contra-argumentação:** não se aplica — não houve posições opostas, só
uma confirmação.

**Decisão final:** `pendingSchedule` não existe mais. Fazia sentido só
sob o modelo antigo, onde uma edição ficava "esperando" até o dia
seguinte (`schedule` = vigente hoje, `pendingSchedule` = valendo
amanhã). Com vigência imediata não existe mais "esperando" — uma edição
já é a vigente no instante em que é feita. `GET /habits/:id` e
`GET /me/habits` carregam só `schedule` (a versão vigente agora), do
mesmo jeito nos dois endpoints, sem histórico.

**Alternativa descartada:** nenhuma — não é uma escolha entre opções,
é a constatação de que o campo ficou sem propósito. Reconsiderar se
"vigência imediata" for revertida no futuro (item acima), o que
reintroduziria a necessidade de expor uma versão "ainda não vigente".

---

## 2026-09-04 — O que "fecha" um dia: deixar de ser hoje no timezone do usuário

**Contexto:** pendência registrada desde 26/08 (`DECISOES-NAO-IMPLEMENTADAS.md`,
item 1, "sub-decisões que o Path A força"). Escopo original era sobre
disparar um cache de resumo de dia, mas isso já tinha caído com a 6.5
("derivar sempre, sem cache de resumo de dia"). O que sobrou de pergunta
real: quando um dia D fica estável o bastante pra algo que dependa da
conclusão dele (uma conquista congelada, por exemplo) confiar nesse
valor pra sempre. Ver `docs/progress/PROGRESSO-2026-09-04.md`.

**Proposta original do usuário:** um dia fecha quando deixa de ser hoje
no timezone do usuário.

**Contra-argumentação:** nenhuma — a proposta já é suficiente e não
precisa de mecanismo novo. Enquanto D é o dia atual, o schedule pode
receber edição com efeito imediato (decisões anteriores desta sessão);
assim que D deixa de ser hoje, nenhuma edição pode mais tocar nele
(6.2, não-retroatividade entre dias, mantida) — então o estado de
conclusão de D já fica travado pra sempre nesse instante, sem precisar
de nenhuma ação explícita.

**Decisão final:** um dia fecha no exato momento em que deixa de ser
"hoje" pro timezone do usuário. Não é um evento disparado — é um
predicado calculado sob demanda (`now()` em UTC + `User.timezone`),
reusando o mesmo mecanismo que o check-in já usa pra decidir o dia
local. Sem cron, sem job, sem novo campo. Implicação direta: **é seguro
congelar/materializar qualquer coisa que dependa da conclusão de D
assim que D deixar de ser hoje** — antes disso, não.

**Alternativa descartada:** um mecanismo explícito de "fechamento"
(job, trigger, ou campo `closedAt` gravado) que marcasse o dia como
encerrado. Descartada por ser trabalho e estado extra pra responder uma
pergunta que já é derivável sem guardar nada — mesma lógica da 6.5.
Reconsiderar só se aparecer uma necessidade de notificar alguém no
exato instante em que um dia fecha (ex: push assim que a virada
acontece), o que exigiria um gatilho ativo em vez de um predicado
passivo.

---

## 2026-09-04 — Listagem de check-ins mostra só eventos efetivos

**Contexto:** achado montando `docs/PLANO-IMPLEMENTACAO-PATH-A.md`. Com
o log de eventos virando imutável (`kind: CHECKIN | UNDO`, 6.1), um
check-in desfeito passa a **continuar existindo** como linha no banco
(compensado por um evento `UNDO`), diferente de hoje, onde undo é
`DELETE` físico e a linha simplesmente some.

**Proposta original do usuário:** apenas efetivos.

**Contra-argumentação:** nenhuma — a alternativa (expor o histórico
completo, incluindo o que foi desfeito) foi levantada só como opção a
descartar ou não, não como posição do assistente.

**Decisão final:** `GET /habits/:habitId/checkins` e
`GET /users/:userId/checkins` listam só eventos `CHECKIN` sem nenhum
`UNDO` apontando pra eles (anti-join por `undoesId`). Preserva o
comportamento atual — desfazer um check-in continua fazendo ele "sumir"
da listagem, mesmo a linha persistindo no banco pra fins de streak.

**Alternativa descartada:** expor o histórico completo (`CHECKIN` e
`UNDO`, com o efeito líquido calculado no cliente). Descartada por ser
mudança de UX não pedida — reconsiderar se surgir uma feature que
precise mostrar "o que o usuário tentou e desfez" (ex: auditoria,
estatística de indecisão), que exigiria expor os eventos brutos.

---

## 2026-09-07 — `SECRET_KEY` em produção: env var manual no Render + guard de boot (função pura)

**Contexto:** issue #6. O `.env` local tem `SECRET_KEY = abcdefghijklmnopqrstuvwxyz`
(valor de exemplo, 26 chars). O arquivo está no `.gitignore`, mas não
havia decisão de como o segredo de produção seria injetado nem checagem
que falhasse antes do boot — hoje `Auth.ts` e `indexService.ts` só
falham (500) na hora de uma requisição que precisa da chave.

**Proposta original do usuário:** deployar no Render (free). O segredo
de produção vive como env var configurada **manualmente no dashboard**
do serviço. Além disso, adicionar um guard de boot que rejeite chave
ausente, curta demais **ou** um valor de exemplo conhecido (rigor "1c"),
mantendo a checagem lazy de `Auth.ts`/login como segunda camada ("2a").

**Contra-argumentação:** o assistente montou uma dicotomia falsa entre
guard em `server.ts` (não coberto pela suíte) e guard em `buildApp()`
(coberto, mas contamina os 8 arquivos de teste e força uma `SECRET_KEY`
forte no ambiente de teste). O usuário apontou que "onde o guard roda"
e "onde o guard vive como código" são decisões separadas: extrair o
guard para uma função pura, chamá-la de `server.ts`, e testar a função
isolada — resolve os dois lados sem trade-off.

Sobre "manual no dashboard": alternativa levantada foi `render.yaml`
com `generateValue: true` (o Render gera um segredo forte e único no
primeiro deploy, impossível esquecer). Descartada agora por puxar a
descrição do serviço inteiro em IaC — escopo de uma issue à parte.

**Decisão final:**
- Segredo de produção = env var `SECRET_KEY` setada à mão no dashboard
  do Render. Nada no repo.
- `src/config/secretKey.ts`: função pura `validateSecretKey(value)` que
  lança `Error` se a chave estiver ausente/vazia, tiver menos de 32
  caracteres (`MIN_SECRET_KEY_LENGTH`), ou constar numa blocklist de
  placeholders conhecidos (comparação após `trim().toLowerCase()`). A
  blocklist é deliberadamente não exaustiva — o piso de comprimento é o
  filtro principal; a lista pega o caso "placeholder conhecido longo o
  suficiente pra passar no piso".
- `src/server.ts` chama `validateSecretKey(process.env.SECRET_KEY)`
  antes de `buildApp()`; em erro imprime `[boot] configuração inválida:
  <msg>` e `process.exit(1)`.
- `Auth.ts` e `indexService.ts` **não mudam** — a checagem lazy (500 na
  requisição) continua como defesa em profundidade. Os testes que
  fixaram esse comportamento ("SECRET_KEY some em runtime → 500 no
  login", em `bugfixes.test.ts` e `gaps.test.ts`) seguem válidos: a
  suíte sobe o app por `buildApp()`, que não tem guard.
- `src/__tests__/secretKey.test.ts`: 9 casos sobre a função isolada.

**Motivo:** a função pura desacopla o ponto de invocação (só o boot
real, via `server.ts`) da cobertura de teste (a função, testada
direto). Suíte existente fica intacta, sem precisar injetar chave forte
no ambiente de teste. As duas camadas (guard no boot + lazy na
requisição) cobrem tanto "subiu sem chave" quanto "chave sumiu depois
de subir".

**Alternativa descartada:**
- `render.yaml` com `generateValue: true` — reconsiderar quando a
  infra de deploy for descrita em IaC (build/start command,
  `DATABASE_URL`, plano do serviço), aí o segredo autogerado entra
  junto e elimina o passo manual.
- Módulo `env.ts` central com Zod parseando `process.env` no import
  (rigor "2b") — descartado porque congelaria a chave no import e
  quebraria os testes de "chave some em runtime → 500", aposentando
  parte do contrato lazy firmado no PR do 500 genérico. Reconsiderar se
  a leitura de env espalhada (`server.ts`, `Auth.ts`, `indexService.ts`,
  `PORT`/`HOST`) virar fonte de bug na prática.

---

## 2026-09-10 — CI: GitHub Actions rodando a suíte em cada push/PR

**Contexto:** issue #8. Não existia `.github/workflows` — nada rodava
`npm test` automaticamente. A suíte (60 testes) só era validada à mão.
`main` está dormente: `test` script é `echo "Error: no test specified"`,
tem 1 migration, sem `__tests__`, sem `vitest.config.ts`. Toda a app
vive na `LOOP-v2`, e os commits recentes (#3–#6) entraram direto nela,
sem PR.

**Proposta original do usuário:** workflow simples do GitHub Actions —
sobe um Postgres de serviço, roda `npx prisma migrate deploy` e
`npm test` em cada push/PR pras "branches principais". Ao longo da
conversa refinou: (a) a promoção `LOOP-v2 → main` é sempre via Pull
Request; (b) incluir também `push` em `main` (badge/última linha de
defesa); (c) incluir `tsc --noEmit` como gate, fail-fast, no mesmo job
antes dos testes; (d) `SECRET_KEY` do CI via `${{ secrets.SECRET_KEY ||
literal }}`; (e) Node 24 + Postgres 16.

**Contra-argumentação:**
- "Branches principais" era ambíguo e perigoso: como `main` está
  dormente e o trabalho é commitado direto na `LOOP-v2`, um CI que só
  dispara em `main` (ou só em `pull_request`) **quase nunca rodaria** — a
  quebra só apareceria na hora da promoção, com N commits acumulados e
  sem saber qual quebrou. Levou a `push: [LOOP-v2, main]` +
  `pull_request: [main]`: cada commit de dev roda CI na `LOOP-v2`, e o PR
  de promoção roda no preview do merge antes de entrar no público.
- Gap de tipos: o Vitest transpila sem checar tipos (type stripping), e
  `npm run build` (que roda `tsc`) não roda no CI — um erro de tipo só
  apareceria no deploy do Render. Daí o step `npx tsc --noEmit`.
- Isolamento entre testes: não há transação/rollback nem injeção de
  client — repo e services fazem `import { prisma } from '../app'` e usam
  direto; isolamento é por email `${prefixo}-${Date.now()}` + cleanup
  best-effort com `.catch(() => {})` no `afterAll` (apoiado no
  `onDelete: Cascade`). Não quebra no CI porque o Postgres de serviço
  sobe limpo a cada run — o ponto fraco (linhas órfãs de cleanup que
  falhou) só morde em banco persistente. Nenhuma mudança de infra de
  teste entrou no escopo do #8.
- Acoplamento oculto a ambiente real: o scan não achou listener de porta
  em teste, nem `fs`/`__dirname`/cwd, nem `setupFiles`/`globalSetup`/
  `db seed`; o TZ é passado explícito ao `Intl.DateTimeFormat`. Resíduo:
  `getDateOnlyInTimezone(new Date(), tz)` usa o relógio real — risco só
  se a suíte cruzar a meia-noite (em `America/Sao_Paulo`) ou uma
  transição de DST durante o run. A verificação definitiva (Postgres
  descartável + `mv .env` + rodar `prisma generate && migrate deploy &&
  npm test` só com vars inline; `prisma migrate status`; sweeps de `TZ` e
  de `--sequence.shuffle`/`--fileParallelism=false`) ficou pendente pro
  usuário rodar localmente.
- `SECRET_KEY` de teste não é sensível (banco efêmero, token
  descartável) — um Actions Secret dedicado seria cerimônia sem ganho de
  segurança. O fallback `||` cobre run com e sem secret, e faz o CI
  ainda rodar em PR de fork (forks não enxergam secrets; o repo é
  público).

**Decisão final:** `.github/workflows/ci.yml` (commit `b168ab3`):
- `on`: `push` em `LOOP-v2` e `main`; `pull_request` mirando `main`.
- Job único em `ubuntu-latest`, service container `postgres:16` com
  health check `pg_isready`.
- `env` do job: `DATABASE_URL` apontando pro service;
  `SECRET_KEY: ${{ secrets.SECRET_KEY || 'ci-test-secret-nao-real-0123456789' }}`.
- Steps, nesta ordem (cada um bloqueia o seguinte): `actions/checkout@v4`
  → `actions/setup-node@v4` (node 24, `cache: npm`) → `npm ci` →
  `npx prisma generate` (obrigatório: `/src/generated/prisma` está no
  `.gitignore`) → `npx tsc --noEmit` (gate de tipo, fail-fast) →
  `npx prisma migrate deploy` → `npm test`.
- Sucesso do job = 1 status check, que a branch protection vai exigir
  num passo seguinte.

**Motivo:** o gatilho casa com o fluxo real (commit direto na `LOOP-v2`,
promoção pra `main` via PR) — a quebra é pega no commit exato, não na
promoção. `tsc --noEmit` fecha o buraco entre "testes passam" e "build
do Render passa". Postgres de serviço + `migrate deploy` reproduz o
schema versionado num banco limpo, sem depender do `.env` nem do banco
local. `npm ci` (lockfile em dia, confirmado) garante instalação
determinística.

**Alternativa descartada:**
- CI só em `main` / só em `pull_request` — reconsiderar se o fluxo virar
  PR-based também pra `LOOP-v2` (feature branches abrindo PR contra
  `LOOP-v2`); aí `push: LOOP-v2` perde sentido e o gatilho vira
  `pull_request: [LOOP-v2, main]`.
- `tsc --noEmit` em job paralelo ao de teste — reconsiderar se o `tsc`
  ficar lento a ponto de segurar o feedback dos testes (hoje ~3-5s,
  irrelevante). Custo do paralelo: repetir `checkout` + `npm ci` +
  `prisma generate` no segundo job.
- Não rodar `tsc` no CI — descartada porque o erro de tipo só quebraria
  no deploy do Render (`npm run build`), o pior momento.
- Isolamento de teste por transação + rollback por arquivo — fora do
  escopo do #8. Reconsiderar se a suíte passar a rodar contra um banco
  persistente/compartilhado (fora do CI) onde as órfãs do cleanup
  best-effort virem problema medido; exigiria refatorar repo e services
  pra receber o client (parâmetro ou wrapper com AsyncLocalStorage).
- `SECRET_KEY` como Actions Secret dedicado, sem literal — reconsiderar
  se o valor de teste precisar ser rotacionado sem commit, ou se o repo
  virar privado e o alinhamento "todo segredo no store" passar a
  importar.
- Node 24 / Postgres 16 — reconsiderar se produção (Render) fixar outra
  versão; o CI acompanha o ambiente de produção.
- Branch protection (required status check) — não configurada agora: o
  GitHub só deixa exigir um check depois que ele reportou ao menos uma
  vez. Passo seguinte, depois do primeiro run no remote.

**Nota operacional:** o push do `b168ab3` foi rejeitado pelo GitHub —
o token OAuth em uso não tem o escopo `workflow`, exigido pra criar
arquivo em `.github/workflows/`. Destrava com `gh auth refresh -h
github.com -s workflow` + `git push`.

---

## 2026-09-10 — Rate limit em /login e /users: duas camadas com papéis diferentes

**Contexto:** issue #7. `/login` não tinha limitação de tentativas — força
bruta de senha sem fricção. `/users` (cadastro) também sem limite, aberto
a abuso de criação de conta.

**Proposta original do usuário:** `@fastify/rate-limit` nas rotas de auth,
limite conservador por IP — proposta inicial da issue. Refinada ao longo
da conversa numa proposta concreta de duas camadas:
- **IP** (`@fastify/rate-limit`): filtro barato, pega bot/scanner burro.
- **Conta**: contador de falhas por email normalizado, incrementado
  depois de validar a senha, dentro do handler — não no `keyGenerator`
  do plugin. Resposta sempre `401` genérico (nunca diferencia "conta não
  existe" de "senha errada"). Em vez de negar, aplica **delay progressivo**
  (algumas tentativas livres, depois delay crescente até um teto) — nunca
  bloqueia de verdade, só desacelera. `/users`: só IP (não existe "conta"
  ainda pra rastrear), limite bem mais agressivo que login.
- Store em `Map` na mão agora (instância única), atrás de uma interface
  própria — trocável por Redis sem tocar no handler se for multi-instância.
- Alternativa descartada de saída: 429 hard-deny por conta após N
  tentativas — rejeitada por virar DoS direcionado (trancar a conta de
  qualquer um só sabendo o email). Reconsiderar se o projeto ganhar 2FA
  ou notificação por email no lockout (muda o cálculo de risco).

**Contra-argumentação:** rodada iterativa, ponto a ponto:
- **`trustProxy`**: sem isso, no Render (hop único de proxy) os dois
  limitadores de IP viram globais (todo request chega com o IP do proxy).
  Usuário fechou em `trustProxy: true` — lista de CIDR seria over-engineering
  que troca um risco (Render mudar range) por outro pior (lista
  desatualizada silenciosamente, ninguém percebe o rate limit voltar a
  ser global).
- **Delay-not-deny troca um DoS por outro**: segurar conexão até 15s por
  tentativa facilita exaustão de socket num Render free. Usuário resolveu
  com **cap de concorrência** (3 respostas-em-delay simultâneas por conta;
  a 4ª leva 429 imediato sem segurar socket) + delay reduzido pro teto de
  5s (a diferença de proteção entre 5s e 15s é marginal; o custo de socket
  é linear).
- **Decaimento do contador**: sem janela, um erro de digitação de ontem
  persegue o usuário pra sempre. Usuário fechou em **janela deslizante de
  15min** (reset também no sucesso — os dois coexistem). A janela só
  perdoa usuário legítimo intermitente; ataque sustentado mantém o
  contador quente de qualquer jeito.
- **Delay no login que dá certo**: pular o delay no sucesso é oráculo de
  timing mais barato que medir microssegundos de argon2 ("respondeu rápido
  = acertei"). Usuário confirmou: delay simétrico, sucesso e falha pagam
  o mesmo cálculo.
- **Timing oracle pré-existente em `Logar`**: sem conta, `findUnique` sem
  match retorna em ~1ms contra os ~50-100ms do `argon2.verify` quando a
  conta existe — vazava "essa conta existe" nas tentativas livres, antes
  do delay entrar. Usuário confirmou que entra no escopo: `argon2.verify`
  contra hash dummy fixo quando o usuário não existe.
- **IP layer de `/login` a 10/min**: apertado pra usuário atrás de NAT
  (escritório, faculdade) — bloqueia gente legítima sem ganho real, já
  que quem ataca de verdade distribui IP. Usuário afrouxou pra **20/min**.
- **`Map` sem eviction**: ataque distribuído borrifando emails inventados
  faz o `Map` crescer sem limite → exaustão de memória no Render free.
  Não dá pra só rastrear email de conta real (reintroduz oráculo de
  enumeração). Usuário fechou: **teto de 50k entradas** (dimensionado pelo
  pior caso de memória tolerável, não pelo tráfego esperado — ~10-20MB no
  pior caso, contra 512MB do Render free), eviction em lote pra 90% do
  teto, `delete`+`set` a cada update reordena a entrada no `Map` (LRU por
  ordem de iteração, sem lista encadeada separada), sweep a cada 60s
  reusando a janela de 15min como TTL.
- **Interação com a suíte de testes**: o tracker é singleton com estado
  cross-test e um `setInterval`. Opções cogitadas e descartadas: zerar
  delay via env em teste (testaria um caminho que não é o real, e não
  resolve o estado persistente) e "unref + emails únicos já resolve"
  (funciona hoje por acidente — nenhum teste atual passa de 3 falhas no
  mesmo email — mas é invariante não documentada que quebra silenciosamente
  no próximo teste de auth). Usuário fechou em **`reset()` + `stop()`**
  explícitos: torna o tracker testável de verdade e resolve o vazamento de
  processo na raiz.
- **Escopo do rate limit de IP**: global (toda rota herda) ou opt-in.
  Usuário fechou em **`global: false`** — cada rota futura decide
  conscientemente, não herda config de auth por acidente.
- **Shape do 429**: o plugin manda um formato próprio; o cap de
  concorrência é 429 na mão. Espelhar os dois manualmente diverge no
  primeiro campo que mudar. Usuário fechou em **shape único** (mesmo
  formato dos 500 do `errorHandler`: `{statusCode, error, reqId}`), via
  `errorResponseBuilder` do plugin reaproveitado pelo handler.

**Decisão final:**
- `src/services/attemptTracker.ts` — classe `AttemptTracker` + singleton:
  `freeAttempts=3`, `delaysMs=[1000,2000,5000]`, `windowMs=15min`,
  `maxConcurrent=3`, `maxEntries=50_000` (evict pra 90%), sweep a cada
  60s. `getDelay`/`acquireSlot`/`releaseSlot`/`recordFailure`/
  `recordSuccess`/`reset`/`stop`. Números de `maxConcurrent` e `windowMs`
  registrados como ponto de partida revisável, não travado.
- `src/Middleware/rateLimit.ts` — `buildRateLimitError` (shape único do
  429) + `registerRateLimit` (`@fastify/rate-limit` v11.2.0, `global: false`).
- `src/app.ts` — `trustProxy: true`.
- `/login`: 20/min por IP (`indexRoute.ts`) + delay simétrico e cap de
  concorrência no handler (`indexController.ts`).
- `POST /users`: 5/hora por IP (`UserRoute.ts`).
- `src/services/indexService.ts` — `Logar` faz `argon2.verify` contra
  hash dummy fixo quando o usuário não existe.
- Testes: `src/__tests__/attemptTracker.test.ts` (12 casos, instância
  isolada com relógio injetável) + `src/__tests__/setup.ts`
  (`attemptTracker.stop()` no `afterAll` global) + `afterEach(reset())`
  nos 4 arquivos que batem em `/login`.

**Motivo:** cada peça fecha um buraco que a peça anterior abria — delay
em vez de deny evita DoS direcionado, mas abre exaustão de socket (cap de
concorrência fecha); contador por conta fecha brute force distribuído,
mas cresce sem limite (teto + eviction fecha); delay fecha o brute force
por tempo de resposta, mas deixa aberto o timing oracle do argon2
condicional (dummy hash fecha). Nenhuma camada isolada seria suficiente.

**Alternativa descartada:**
- 429 hard-deny por conta — DoS direcionado. Reconsiderar com 2FA ou
  notificação de lockout.
- `trustProxy` com lista de CIDR — reconsiderar se a app for exposta
  atrás de outro proxy também, ou direto.
- Delay de até 15s sem cap de concorrência — reconsiderar nunca sem
  reintroduzir o cap junto.
- Zerar delay via env em teste, ou depender de `unref()` + emails únicos
  sem `reset()`/`stop()` — descartadas por mascarar sintoma em vez de
  testar o comportamento real / resolver o estado na raiz.
- Rate limit de IP global — reconsiderar rota a rota, com raciocínio
  próprio (scraping? custo de query?), nunca por herança de config de auth.
- Redis como store da camada de conta — condicionado a sair de instância
  única; até lá, `Map` na mão atrás da interface do `AttemptTracker`.

**Nota de implementação:** a validação manual (smoke test com
`app.inject` sequencial e concorrente) pegou um off-by-one real em
`getDelay` — com `freeAttempts=3`, a 4ª tentativa ainda saía sem delay,
só a 5ª pegava, porque o cálculo usava as falhas já registradas em vez de
contar a tentativa prestes a acontecer (falhas + 1). Corrigido antes do
commit; 3 dos 12 testes do tracker validavam a semântica antiga e foram
reescritos.

---

## 2026-09-12 — Shape de erro uniforme (`{ error, details? }`)

**Contexto:** a API respondia erro em três formatos incompatíveis —
string crua (401/403/404 dos controllers e do `Auth.ts`), array de
`{campo, message}` (Zod, 400) e objeto (`{message}` no 409,
`{statusCode, error, reqId}` no 500/429). Um cliente não tinha como
escrever um handler de erro único sem antes inspecionar o tipo do corpo.
Registrado como achado em `docs/problems/PROBLEMAS 12-09-26.md`, item 5.

**Proposta original do usuário:** substituir todo `res.send("string")`
por um shape único, ex.: `{ error: string }`, em todos os controllers.
Decidir explicitamente se o 400 de validação Zod (que carrega múltiplos
problemas, um por campo) entra no mesmo envelope ou fica diferente por
natureza.

**Decisão final:** todo erro da API sempre tem um campo `error: string`.
A validação Zod é a única exceção que precisa de granularidade extra —
em vez de um segundo shape, ganhou um campo adicional dentro do mesmo
envelope: `{ error: "Dados inválidos.", details: [{campo, message}, …] }`.
409 (`Prisma P2002`) passou de `{message}` para `{error}`. 500/429 já
tinham `error` — mantidos como estavam, só uniformizados no nome do
campo raiz. `Auth.ts` (401/403/500 de token ausente/inválido/config) foi
incluído mesmo não estando na lista original do spec — é a origem da
maioria dos 401/403 da API inteira; deixá-lo de fora invalidaria o
objetivo de uniformidade. Aproveitado pra também não vazar mais "Sem
chave secreta" no 500 de `Auth.user()` (mesma regra do `errorHandler`
central pra qualquer 500: nunca detalhe interno no corpo).

**Alternativa descartada:** dar ao erro de validação um shape totalmente
diferente (ex.: só o array cru, sem campo `error`) — descartada porque
reintroduz exatamente o problema que motivou a mudança (cliente precisa
saber de antemão qual endpoint pode devolver formato diferente).
Reconsiderar só se a API adotar um padrão de mercado (RFC 7807/
`application/problem+json`) por inteiro — nesse caso a migração seria
completa, não incremental.

---

## 2026-09-12 — Envelope de sucesso uniforme (`{ message, data }`)

**Contexto:** parte das respostas de sucesso já usava
`{ message, data }` (`UpdateHabit`/`DeleteHabit`/`UndoCheckIn`), o resto
devolvia o objeto/array cru (`POST /users`, `POST /login`,
`POST /habits`, toda listagem). Duas formas concorrentes pro mesmo tipo
de resposta.

**Proposta original do usuário:** envolver toda resposta de sucesso
(create, list, get — não só update/delete) no mesmo padrão
`{ message, data: T }`, com o motivo explícito de facilitar consumo por
outra entidade/serviço lendo o payload sem precisar saber por endpoint
se o corpo é objeto cru ou array cru.

**Decisão final:** adotado em toda rota, incluindo as três novas
(`/refresh`, `/logout`). Mensagens padronizadas no formato "<recurso>
<ação> com sucesso." (ex.: "Hábito criado com sucesso.",
"Check-ins encontrados."), corrigindo de passagem duas mensagens com erro
gramatical que já existiam (`"Dados atualizado"` sem concordância de
gênero/número, `"Hábito apagado"` sem "com sucesso" como o resto).
`POST /logout` devolve `data: null` — não há recurso pra retornar, mas o
shape fica igual a qualquer outra resposta de sucesso, sem exceção.

**Alternativa descartada:** manter as duas formas coexistindo por
endpoint conforme "faz sentido" caso a caso — é a situação atual, e é
exatamente o problema que o item existe pra resolver. Reconsiderar só se
o formato do corpo virar `Content-Type` negociado por cliente (ex.: um
consumidor que prefira JSON:API), o que não está no radar.

---

## 2026-09-12 — CORS + cookie httpOnly (origem por env var, `credentials: true`)

**Contexto:** a API não tinha CORS configurado — qualquer cliente web em
domínio diferente seria bloqueado pelo navegador antes mesmo da resposta
chegar, documentado em `docs/API-REFERENCE.md` como bloqueante pro
próximo cliente. `API-REFERENCE.md` (11/09) registrava plataforma
**mobile** como próximo cliente, não web — sem menção a um `loop-web`.

**Proposta original do usuário:** `@fastify/cors` com origem configurável
por env var (nunca hardcoded, nunca `*`), `credentials: true` porque o
refresh token (ver entrada seguinte) viaja em cookie `httpOnly`.

**Contra-argumentação:** o spec de CORS+cookie pressupõe cliente web, mas
a única decisão de cliente registrada até então (`API-REFERENCE.md`,
11/09) era mobile (React Native/Flutter) — plataforma onde cookie
`httpOnly` gerenciado por navegador não é o mecanismo natural (o próprio
doc já apontava secure storage — `expo-secure-store`/`flutter_secure_storage`
— como candidato pro token no mobile). Implementar a seção inteira em
cima de cookie sem resolver esse conflito arriscava entregar um refresh
token que o cliente real não conseguiria usar. Segundo ponto: o spec
citava "sameSite apropriado (ver nota de trade-off abaixo)" sem a nota
existir no texto — decisão real deixada em aberto, não só formatação.

**Decisão do usuário, perguntado explicitamente:** (1) o cookie serve só
um cliente **loop-web** (novo, ainda não criado — citado na seção de
documentação do próprio spec, "mover API-REFERENCE.md pro repo loop-web
quando criado"); o mobile decidido em 11/09 fica **sem** refresh por
enquanto, usando só o accessToken de 1h como hoje. (2) `sameSite: "none"`
+ `secure: true` em produção (loop-web e a API ficam em domínios
diferentes — `sameSite: "lax"/"strict"` simplesmente não enviaria o
cookie em request cross-site iniciado por `fetch`), caindo pra
`sameSite: "lax"` + `secure: false` em dev local (sem HTTPS, "none" seria
rejeitado pelo navegador de qualquer forma) — decidido por
`NODE_ENV === "production"` em `src/config/cookies.ts`.

**Motivo:** registrar a lacuna do mobile explicitamente (em vez de deixar
implícito) evita que uma sessão futura assuma, por engano, que o refresh
token já cobre os dois clientes.

**Alternativa descartada:** servir os dois clientes desde já (refresh
por cookie **ou** por corpo/header pro mobile) — mais superfície de API e
teste, sem cliente nenhum ainda pra validar contra. Reconsiderar quando o
app mobile existir de fato e precisar de sessão longa.

**Nota de implementação:** origem resolvida em
`src/Middleware/cors.ts` — `CORS_ORIGIN` (lista separada por vírgula) ou,
se ausente, default de dev (`localhost:5173`/`localhost:3000`); nunca
`*`. Validação com navegador real (item 2.3 do spec) fica pendente até o
`loop-web` existir de fato — não há frontend neste repositório pra testar
contra.

---

## 2026-09-12 — Refresh token em banco, hash sha256, sem rotação

**Contexto:** login emitia só um accessToken JWT de 1h, sem renovação —
expirado, o usuário refaz login. `API-REFERENCE.md` já registrava isso
como limitação conhecida.

**Proposta original do usuário:** modelo `RefreshToken` no Postgres
(`id`/hash do token — não o valor puro —, `userId`, `expiresAt`,
`revokedAt` nullable, `createdAt`); `POST /login` também emite refresh
token e seta cookie `httpOnly`; `POST /refresh` valida contra o banco e
emite accessToken novo, **sem rotação** (mesmo refresh token continua
válido); `POST /logout` revoga no banco e limpa o cookie. Duração do
cookie delegada explicitamente ("7 dias é o padrão de mercado, mas é
decisão sua").

**Decisão final:** implementado como proposto. `expiresAt = 7 dias`
(decisão delegada, sem requisito de produto que pedisse outro valor).
Hash com **sha256** (`node:crypto`), não argon2: argon2 existe pra
compensar a baixa entropia de senha escolhida por humano — um refresh
token nasce com 256 bits de entropia aleatória (`randomBytes(32)`), já
inviável de adivinhar por força bruta; o custo computacional extra do
argon2 não compraria proteção real, só lentidão em todo `POST /refresh`.
Escopo limitado ao `loop-web` (ver entrada de CORS acima) — mobile segue
sem refresh.

**Alternativa descartada:** rotação de refresh token a cada uso (token
antigo invalidado, novo emitido) — descartada por simplicidade explícita
do usuário, com o trade-off reconhecido: um token roubado continua válido
até expirar ou até uma revogação manual (`POST /logout`, ou
administrativa direto no banco) descobrir o comprometimento. Reconsiderar
se o produto precisar detectar reuso de token roubado (rotação +
detecção de reuso é o padrão que cobre esse caso, ao custo de mais
estado por sessão).

---

## 2026-09-12 — OpenAPI/`@fastify/swagger`: adiado

**Contexto:** nenhuma rota declara `schema` no Fastify hoje — toda
validação é `.parse()` manual dentro de 4 métodos de controller; 11 dos
15 endpoints originais não tinham validação de request nenhuma (params
nunca validados). `@fastify/swagger` gera OpenAPI a partir de schema do
**Fastify**, não dos Zod soltos do projeto — rodar a lib hoje produziria
uma casca vazia (15 paths, zero request bodies documentados).

**Proposta original do usuário:** avaliar `@fastify/swagger` gerando
OpenAPI a partir dos schemas Zod existentes; se adiado, registrar como
dívida técnica.

**Decisão final:** adiado. Migrar validação de `.parse()` nos
controllers pra `schema` de rota (via algo como
`fastify-type-provider-zod`) é um trabalho maior que o resto deste spec,
e colide de frente com a decisão de shape de erro registrada acima —
validação do Fastify não lança `ZodError`, então o branch de
`errorHandler.ts` pra Zod deixaria de disparar pras rotas migradas,
fragmentando o shape de erro bem no momento em que ele acabou de ser
unificado. Fazer as duas coisas na mesma sessão sem tempo de validar cada
uma separadamente é mais risco do que o valor entrega agora.

**Alternativa descartada:** nenhuma — a única alternativa real era "fazer
agora", descartada pelo motivo acima. Reconsiderar quando (a) o shape de
erro uniforme já estiver validado em produção por um tempo, e (b) houver
um cliente de verdade (loop-web) consumindo a API, que se beneficiaria de
um contrato machine-readable pra gerar tipos/cliente automaticamente —
hoje ninguém consome a API programaticamente ainda.
