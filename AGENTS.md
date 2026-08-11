# Dynamic Dashboard — guia do projeto para agentes

## Objetivo do produto

Este repositório contém um plugin comunitário do Obsidian chamado **Dynamic Dashboard**. O objetivo é calcular, atualizar e futuramente exibir métricas dinâmicas do Vault, incluindo:

- quantidade de arquivos Markdown, arquivos em geral, anexos e pastas;
- palavras, caracteres, “sentenças”, tamanho do Vault e média de palavras por arquivo;
- tempo estimado de leitura e de fala;
- tags mais/menos frequentes, arquivos órfãos, pasta mais ativa e arquivos recentes;
- métricas diárias, sessões, tempo ativo e sequências de uso;
- métricas do arquivo que está sendo editado ou visualizado.

O projeto ainda está em desenvolvimento. A camada de coleta e estado está parcialmente implementada; há uma aba de configuração e um comando de atualização manual, mas ainda não há dashboard de apresentação.

## Tecnologia e execução

- Plataforma: Obsidian Community Plugin.
- Linguagem: TypeScript.
- API externa de runtime: pacote `obsidian`.
- Gerenciador obrigatório: npm.
- Bundler: esbuild.
- Entrada: `src/main.ts`.
- Artefato gerado: `main.js` na raiz.
- CSS de release: `styles.css`.
- Módulos internos usam imports absolutos relativos a `src/`, habilitados por `baseUrl: "src"` no `tsconfig.json`.
- O bundle é CommonJS, tem alvo ES2018 e mantém `obsidian`, Electron, CodeMirror, Lezer e módulos nativos do Node como externos.
- O manifesto declara `isDesktopOnly: true`, embora a maior parte do código use apenas APIs do Obsidian e do navegador.

Comandos:

```bash
npm install
npm run dev
npm run build
npm run lint
```

`npm run dev` mantém o esbuild em watch e gera source map inline. `npm run build` executa primeiro o TypeScript sem emitir arquivos e depois cria um `main.js` minificado. Não edite `main.js`: ele é gerado e ignorado pelo Git.

## Arquitetura atual

O desenho predominante é uma separação em camadas:

```text
Obsidian / eventos do Vault
        |
        v
src/main.ts ---> ServiceContainer
                    |
                    +--> VaultService --------+
                    +--> MetadataAnalyzer      |
                    +--> SessionService        +--> StatsCalculator
                    |                                  |
                    +--> StateManager <-------- StatProcessor
                              |
                              v
                    Plugin.saveData(data.json)
```

Responsabilidades:

- `DashboardPlugin` controla o ciclo de vida e o bootstrap.
- `ServiceContainer` instancia e conecta as dependências.
- `VaultEventListener` traduz eventos do Obsidian em operações do domínio.
- `VaultService` lê arquivos, conteúdo, metadados e estrutura do Vault.
- `MetadataAnalyzer` concentra análises de tags e conexões.
- `StatsCalculator` monta métricas tipadas a partir dos serviços.
- `StatProcessor` orquestra cálculos, atualizações incrementais e estado.
- `StateManager` mantém estado em memória, cache por arquivo e persistência com debounce.
- modelos e value objects definem os contratos de dados.
- mappers criam valores vazios e normalizam patches parciais.

Evite colocar regras novas em `main.ts`. A direção preferida é:

1. leitura bruta do Obsidian em `services/` ou `analyzer/`;
2. composição da métrica em `StatsCalculator`;
3. coordenação e atualização de estado em `StatProcessor`;
4. reação a eventos em `VaultEventListener`;
5. contratos em `models/` e valores padrão em `mappers/` ou `datas/`.

## Fluxo de inicialização

Ao carregar o plugin, `DashboardPlugin.onload()`:

1. chama `loadSettings()` e reconstrói `vaultMetricData`;
2. cria o `ServiceContainer`;
3. inicializa estado, serviços, calculadora e processador;
4. cria `VaultEventListener`;
5. registra listeners;
6. inicia o rastreamento de sessão;
7. executa `statsProcessor.vaultLoad("all")`;
8. registra a sessão diária e a atualização periódica do tempo ativo.

`vaultLoad("all")`:

1. calcula e armazena `FileMetrics` de cada Markdown no cache em memória;
2. calcula em paralelo os grupos `volume`, `estimates`, `appears`, `streak` e `storageValues`;
3. emite um novo `VaultMetrics`;
4. a inicialização registra separadamente as métricas da sessão diária.

Essa varredura lê o conteúdo dos arquivos várias vezes. Trate alterações nessa etapa como sensíveis a desempenho, principalmente em Vaults grandes e dispositivos móveis.

## Estado e persistência

O Obsidian persiste os dados pelo par `Plugin.loadData()` / `Plugin.saveData()`, normalmente no `data.json` local do plugin. `data.json` contém dados do usuário, está no `.gitignore` e não deve ser versionado, sobrescrito ou usado como fixture.

Contrato persistido em `StorageData`:

```ts
interface StorageData {
	vaultMetrics: VaultMetrics;
	dailyHistory: Record<string, DailyMetrics>;
	settings: DashboardSettings;
}
```

- `vaultMetrics`: snapshot agregado atual.
- `dailyHistory`: histórico indexado por data no formato `YYYY-MM-DD`.
- `settings`: contém `idleLimitMinutes`, com padrão de 5 minutos, aplicado ao `SessionService`.
- `fileStatsCacheState`: cache `Map<path, FileMetrics>` somente em memória; não é persistido.

O `StateManager` aceita patches, normaliza-os com os mappers e agenda gravação após 2 segundos. Chamadas sucessivas reiniciam o timer. Ao adicionar novos campos persistidos:

1. atualize o modelo;
2. atualize `DEFAULT_STORAGE_DATA`;
3. atualize o mapper vazio e o merge;
4. preserve compatibilidade com `data.json` antigo;
5. confirme que o valor é serializável.

Não persista instâncias complexas do Obsidian (`TFile`, `TFolder`, `App`, elementos DOM). Prefira caminhos, nomes, IDs, números, strings e objetos simples.

## Semântica atual das métricas

As definições abaixo descrevem o código existente, não necessariamente a definição final do produto:

- intervalo `today`: arquivos com `mtime` desde o início do dia;
- intervalo `week`: últimos 7 dias contando hoje;
- intervalo `month`: últimos 30 dias contando hoje;
- intervalo `all`: todos os Markdown;
- palavras, caracteres e sentenças usam `ContentAnalyzer`, tanto no snapshot quanto no cache e preview;
- o frontmatter inicial é removido antes da análise;
- caracteres: conteúdo sem espaços;
- palavras: grupos Unicode de letras/números, aceitando conectores internos comuns;
- sentenças: segmentos separados por pontuação final ou quebra de linha;
- leitura estimada: 200 palavras por minuto;
- fala estimada: 130 palavras por minuto;
- anexo: qualquer arquivo que não seja Markdown;
- arquivo órfão: sem tags, links de saída e backlinks resolvidos;
- pasta mais ativa: pasta com mais filhos diretos que sejam arquivos;
- tamanho: soma de `file.stat.size` de todos os arquivos, em bytes;
- tempo ocioso pretendido: 5 minutos;
- heartbeat da sessão: 10 segundos.

Essas definições são inconsistentes em alguns pontos (especialmente palavras e sentenças). Antes de criar cálculos incrementais, centralize ou reutilize a mesma regra para evitar divergência entre a varredura inicial, cache, preview e eventos.

## Eventos registrados

`VaultEventListener.init()` usa `plugin.registerEvent()` para garantir limpeza automática:

- `workspace.quick-preview`: marca atividade e atualiza palavras/caracteres no cache do arquivo;
- `vault.modify`: aplica o delta de Markdown ou reconcilia o tamanho de anexos;
- `vault.create`: processa Markdown, anexo ou pasta criada;
- `vault.delete`: processa Markdown, anexo ou pasta removida;
- `vault.rename`: move a entrada de cache de Markdown e reconcilia pastas.

Ao adicionar listeners, sempre use `registerEvent`, `registerDomEvent` ou outra API de registro do `Plugin`. Operações frequentes como `modify` devem usar debounce/throttle ou cálculo incremental confiável.

`VaultEventListener.initActivityEvents()` registra atividade por teclado, ponteiro e foco da janela. Ainda não existem listeners dedicados para mudanças do `metadataCache`, abertura de arquivo, blur ou visibilidade da janela.

## Estrutura e inventário arquivo por arquivo

### Raiz

- `AGENTS.md`: este guia. Atualize-o quando a arquitetura, comandos, persistência ou estrutura mudar.
- `README.md`: ainda é majoritariamente o README do sample oficial; não descreve corretamente o produto atual.
- `package.json`: scripts, versão npm e dependências. O nome e descrição ainda são do sample.
- `package-lock.json`: lockfile npm; mantenha sincronizado com `package.json`.
- `manifest.json`: metadados carregados pelo Obsidian. Atualmente contém valores provisórios.
- `versions.json`: mapeia versão do plugin para versão mínima do Obsidian.
- `version-bump.mjs`: sincroniza a versão npm com manifesto e `versions.json`.
- `esbuild.config.mjs`: bundle de `src/main.ts` para `main.js`.
- `tsconfig.json`: configuração TypeScript, imports absolutos e verificações estritas.
- `eslint.config.mts`: flat config do ESLint com regras `obsidianmd`.
- `styles.css`: dimensões responsivas e estilos globais da view do dashboard.
- `LICENSE`: licença 0-BSD.
- `.editorconfig`: UTF-8, LF, newline final e tabs de largura 4.
- `.npmrc`: remove o prefixo `v` das tags geradas pelo npm.
- `.gitignore`: ignora dependências, build, mapas e dados locais.
- `.github/workflows/lint.yml`: instala, compila e executa lint em Node 20 e 22 para pushes e PRs.
- `.github/workflows/release.yml`: em tags, compila com Node 24, atesta artefatos e cria draft release com `main.js`, `manifest.json` e CSS opcional.
- `main.js`: bundle local gerado; não editar nem commitar.
- `data.json`: estado local real do plugin; ignorado e potencialmente privado.

### Entrada e configuração

- `src/main.ts`: classe `DashboardPlugin`, carregamento/gravação dos dados e bootstrap. Deve permanecer pequeno e focado no lifecycle.
- `src/settings.ts`: aba de configuração do limite de inatividade.
- `src/commands/DashboardCommands.ts`: registra comandos para abrir o dashboard nos painéis laterais esquerdo ou direito.
- `src/commands/VaultCommands.ts`: registra o comando `refresh-vault-metrics`.

### Eventos e orquestração

- `src/events/VaultEventListener.ts`: registra eventos do workspace/Vault e encaminha alterações ao processador.
- `src/orchestrators/StatsProcessor.ts`: coordena carga inicial, snapshot, métricas diárias, preview e processamento de criação/exclusão. O nome exportado é singular: `StatProcessor`.

### Views

- `src/views/DashboardView.ts`: registra a view e o wireframe responsivo do dashboard, seus identificadores e a abertura em qualquer painel lateral; a aba pode ser movida pelo drag-and-drop nativo do Obsidian.
- a view ocupa toda a largura disponível, abre com altura de referência de 480px, usa mínimo adaptativo de até 280px e nunca ultrapassa a altura concedida pelo painel lateral.

### Serviços e análise

- `src/services/ServiceContainer.ts`: composition root/DI manual do plugin.
- `src/services/VaultService.ts`: consultas ao Vault, leitura de conteúdo e cálculos de baixo nível. É o maior arquivo e deve ser dividido se continuar crescendo.
- `src/services/StatsCalculator.ts`: produz `FileMetrics`, `DailyMetrics` e os grupos internos de `VaultMetrics`.
- `src/services/SessionService.ts`: heartbeat e atividade/ociosidade da sessão.
- `src/analyzer/ContentAnalyzer.ts`: regra única e pura para palavras, caracteres e sentenças.
- `src/analyzer/MetadataAnalyzer.ts`: tags de frontmatter, tags únicas e detecção de arquivo órfão.

### Estado, dados e conversão

- `src/state/StateManager.ts`: fonte de verdade em memória, cache por caminho e persistência com debounce.
- `src/utils/Logger.ts`: logger estruturado para lifecycle, eventos e emissões de estado; não deve registrar conteúdo de notas.
- `src/datas/VaultMetricData.ts`: `StorageData` e valores persistidos padrão.
- `src/mappers/VaultMapper.ts`: objeto vazio e merge seguro de grupos de `VaultMetrics`.
- `src/mappers/DailyMapper.ts`: objetos vazios e normalização de `DailyMetrics`/`FileMetrics`.

### Modelos

- `src/models/ActivityMetrics.ts`: contratos normalizados de métricas diárias datadas e períodos agregados de atividade.
- `src/models/VaultMetrics.ts`: contrato agregado, dividido em `volume`, `estimates`, `appears`, `streak` e `storageValues`.
- `src/models/DailyMetrics.ts`: totais e tempo de uma data.
- `src/models/FileMetrics.ts`: métricas e identidade de um arquivo.
- `src/models/DashboardSettings.ts`: contrato e padrão das configurações.
- `src/models/StatusBarMetrics.ts`: contrato planejado para status bar; ainda não usado.
- `src/models/value_objects/ReadingTime.ts`: horas, minutos, segundos e total em segundos.
- `src/models/value_objects/TagType.ts`: nome e contagem de tag. O tipo atual se chama `tagType`.
- `src/models/value_objects/TimeRange.ts`: intervalos predefinidos e `DateBounds`.

### Recursos

- `src/assets/icons/DashboardIcon.ts`: retorna o SVG registrado para a view e para a ribbon do dashboard.
- `src/assets/icons/DashboardLeftIcon.ts`: segundo SVG como string, também ainda não conectado.

## Estado conhecido e débitos técnicos

Não esconda, contorne silenciosamente nem confunda estes problemas com regressões introduzidas por uma tarefa nova. Confirme o baseline antes de corrigi-los.

### Build e lint

No estado atual, `npm run build` e `npm run lint` passam. Preserve esse baseline.

### Lifecycle e composição

- comandos, settings tab, ícone e wireframe visual estão registrados; os cards ainda não exibem métricas;
- timers e eventos possuem cleanup pelo lifecycle do plugin;
- mudanças no limite de inatividade afetam a sessão atual sem exigir reload.

### Estado e atualização incremental

- o carregamento aceita a chave atual `vaultMetrics` e a chave legada `vaultMetricData`;
- modificações Markdown usam a diferença entre cache anterior e métricas novas;
- criação, exclusão, modificação de anexos, pastas e rename possuem tratamento;
- o cache de preview é separado do cache-base usado nos deltas;
- `StateManager.flushPendingSave()` é chamado no unload;
- datas persistidas usam chave ISO (`YYYY-MM-DD`).

### Cálculos

- streak, maior streak, média diária e dias/semanas/meses mais ativos retornam `null`.
- leituras repetidas de todos os arquivos tornam o bootstrap pesado.
- grupos de métricas como tags, estimativas e pasta mais ativa são recalculados na carga completa, não incrementalmente em todos os eventos.

### Metadados e release

- o ID definitivo atual é `dynamic-dashboard`; a pasta local de desenvolvimento ainda se chama `obsidian-sample-plugin`;
- `README.md` e `styles.css` ainda carregam conteúdo do sample;
- `package.json`, `manifest.json` e `versions.json` estão alinhados em `1.0.0`, com Obsidian mínimo `1.6.6`.
- preserve o ID definitivo depois do primeiro release e use SemVer sem prefixo `v`.

## Regras para alterações futuras

- Leia este arquivo e os módulos envolvidos antes de editar.
- Preserve alterações existentes do usuário; não reverta arquivos fora do escopo.
- Mantenha `main.ts` apenas como lifecycle/composition root.
- Prefira interfaces com nomes em PascalCase (`TagType`, `StatusBarMetrics`) em código novo.
- Evite `any`; modele settings e payloads persistidos.
- Use `boolean`, não o wrapper `Boolean`.
- Mantenha IDs de comandos estáveis depois de publicados.
- Use mensagens de UI curtas, em sentence case e consistentes no mesmo idioma.
- Não adicione rede, telemetria ou serviços externos sem necessidade visível, opt-in e documentação.
- Não leia/escreva fora do Vault para funcionalidades do plugin.
- Não execute código remoto nem implemente atualização fora do fluxo normal de releases.
- Registre todos os eventos, DOM listeners e timers com mecanismos que permitam cleanup.
- Para métricas caras, leia cada arquivo uma vez por ciclo quando possível e derive vários valores do mesmo conteúdo.
- Separe arquivos que ultrapassem aproximadamente 200–300 linhas.
- Ao mudar semântica de métrica, documente a definição e adicione teste para limites (Vault vazio, Unicode, frontmatter, arquivos sem conteúdo e intervalos de data).
- Não edite artefatos gerados nem dados do usuário.

## Checklist de validação

Depois de uma mudança:

1. execute `npm run build`;
2. execute `npm run lint`;
3. diferencie erros preexistentes de erros introduzidos;
4. para mudanças de persistência, teste carga com dados ausentes e dados antigos;
5. para eventos, teste create/modify/delete/rename e unload/reload sem listeners ou timers duplicados;
6. para métricas, teste Vault vazio e pelo menos um arquivo Markdown com frontmatter, tags e links;
7. valide manualmente copiando `main.js`, `manifest.json` e `styles.css` para a pasta do plugin e recarregando o Obsidian.

Artefatos obrigatórios de release: `main.js`, `manifest.json` e `styles.css` quando presente. A tag do GitHub deve ser exatamente a versão do manifesto, sem `v`.
