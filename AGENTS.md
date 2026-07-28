# Dynamic Dashboard — guia do projeto para agentes

## Objetivo do produto

Este repositório contém um plugin comunitário do Obsidian chamado **Dynamic Dashboard**. O objetivo é calcular, atualizar e futuramente exibir métricas dinâmicas do Vault, incluindo:

- quantidade de arquivos Markdown, arquivos em geral, anexos e pastas;
- palavras, caracteres, “sentenças”, tamanho do Vault e média de palavras por arquivo;
- tempo estimado de leitura e de fala;
- tags mais/menos frequentes, arquivos órfãos, pasta mais ativa e arquivos recentes;
- métricas diárias, sessões, tempo ativo e sequências de uso;
- métricas do arquivo que está sendo editado ou visualizado.

O projeto ainda está em desenvolvimento. A camada de coleta e estado está parcialmente implementada; não há dashboard ou outra interface de apresentação registrada no estado atual.

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
7. executa `statsProcessor.VaultLoad("all")`.

`VaultLoad("all")`:

1. calcula e armazena `FileMetrics` de cada Markdown no cache em memória;
2. calcula em paralelo os grupos `volume`, `estimates`, `appears`, `streak` e `storageValues`;
3. emite um novo `VaultMetrics`;
4. calcula e persiste as métricas diárias.

Essa varredura lê o conteúdo dos arquivos várias vezes. Trate alterações nessa etapa como sensíveis a desempenho, principalmente em Vaults grandes e dispositivos móveis.

## Estado e persistência

O Obsidian persiste os dados pelo par `Plugin.loadData()` / `Plugin.saveData()`, normalmente no `data.json` local do plugin. `data.json` contém dados do usuário, está no `.gitignore` e não deve ser versionado, sobrescrito ou usado como fixture.

Contrato persistido em `StorageData`:

```ts
interface StorageData {
	vaultMetrics: VaultMetrics;
	dailyHistory: Record<string, DailyMetrics>;
	settings: any;
}
```

- `vaultMetrics`: snapshot agregado atual.
- `dailyHistory`: histórico indexado por data no formato `YYYY-MM-DD`.
- `settings`: atualmente contém por padrão `idleLimitMinutes: 5`, mas ainda é `any` e não está ligado ao `SessionService`.
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
- caracteres globais: conteúdo sem caracteres de espaço (`/\s/g`);
- palavras globais: tokens separados por espaços (`/\s+/`);
- palavras do preview: grupos Unicode de letras ou números, removendo frontmatter inicial;
- “sentenças” globais: linhas não vazias;
- “sentenças” por arquivo no cache: trechos terminados em `.`, `!` ou `?`;
- leitura estimada: 200 palavras por minuto;
- fala estimada: 130 palavras por minuto;
- anexo: qualquer arquivo que não seja Markdown;
- arquivo órfão: sem tags, links de saída e backlinks resolvidos;
- pasta mais ativa: pasta com mais filhos diretos que sejam arquivos;
- tamanho: soma de `file.stat.size`;
- tempo ocioso pretendido: 5 minutos;
- heartbeat da sessão: 10 segundos.

Essas definições são inconsistentes em alguns pontos (especialmente palavras e sentenças). Antes de criar cálculos incrementais, centralize ou reutilize a mesma regra para evitar divergência entre a varredura inicial, cache, preview e eventos.

## Eventos registrados

`VaultEventListener.init()` usa `plugin.registerEvent()` para garantir limpeza automática:

- `workspace.quick-preview`: marca atividade e atualiza palavras/caracteres no cache do arquivo;
- `vault.modify`: para Markdown, recalcula o snapshot associado ao arquivo;
- `vault.create`: processa Markdown ou pasta criada;
- `vault.delete`: processa Markdown ou pasta removida.

Ao adicionar listeners, sempre use `registerEvent`, `registerDomEvent` ou outra API de registro do `Plugin`. Operações frequentes como `modify` devem usar debounce/throttle ou cálculo incremental confiável.

Ainda não existem listeners para rename/move, mudanças de metadados, abertura de arquivo, foco/blur/visibilidade da janela ou atividade global de teclado/mouse.

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
- `styles.css`: estilos globais do plugin; atualmente contém apenas um estilo de template.
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
- `src/settings.ts`: interface e tab de configurações herdadas do sample. Ainda não está integrada de forma válida à classe principal.
- `src/commands/VaultCommands.ts`: comando experimental `DashBoard-word` para imprimir um snapshot. Não é registrado no bootstrap e seu import de `StatProcessor` está incorreto.

### Eventos e orquestração

- `src/events/VaultEventListener.ts`: registra eventos do workspace/Vault e encaminha alterações ao processador.
- `src/orchestrators/StatsProcessor.ts`: coordena carga inicial, snapshot, métricas diárias, preview e processamento de criação/exclusão. O nome exportado é singular: `StatProcessor`.

### Serviços e análise

- `src/services/ServiceContainer.ts`: composition root/DI manual do plugin.
- `src/services/VaultService.ts`: consultas ao Vault, leitura de conteúdo e cálculos de baixo nível. É o maior arquivo e deve ser dividido se continuar crescendo.
- `src/services/StatsCalculator.ts`: produz `FileMetrics`, `DailyMetrics` e os grupos internos de `VaultMetrics`.
- `src/services/SessionService.ts`: heartbeat e atividade/ociosidade da sessão.
- `src/analyzer/MetadataAnalyzer.ts`: tags de frontmatter, tags únicas e detecção de arquivo órfão.

### Estado, dados e conversão

- `src/state/StateManager.ts`: fonte de verdade em memória, cache por caminho e persistência com debounce.
- `src/datas/VaultMetricData.ts`: `StorageData` e valores persistidos padrão.
- `src/mappers/VaultMapper.ts`: objeto vazio e merge seguro de grupos de `VaultMetrics`.
- `src/mappers/DailyMapper.ts`: objetos vazios e normalização de `DailyMetrics`/`FileMetrics`.

### Modelos

- `src/models/VaultMetrics.ts`: contrato agregado, dividido em `volume`, `estimates`, `appears`, `streak` e `storageValues`.
- `src/models/DailyMetrics.ts`: totais e tempo de uma data.
- `src/models/FileMetrics.ts`: métricas e identidade de um arquivo.
- `src/models/StatusBarMetrics.ts`: contrato planejado para status bar; ainda não usado.
- `src/models/value_objects/ReadingTime.ts`: horas, minutos, segundos e total em segundos.
- `src/models/value_objects/TagType.ts`: nome e contagem de tag. O tipo atual se chama `tagType`.
- `src/models/value_objects/TimeRange.ts`: intervalos predefinidos e `DateBounds`.

### Recursos

- `src/assets/icons/DashboardIcon.tsx`: retorna SVG como string; não usa JSX e não está conectado ao plugin.
- `src/assets/icons/DashboardLeftIcon.tsx`: segundo SVG como string; também não está conectado.

O `tsconfig.json` inclui apenas `src/**/*.ts`, portanto os arquivos `.tsx` não participam da checagem/build enquanto não forem importados. Se forem adotados, decidir entre renomeá-los para `.ts` ou configurar JSX/`include` corretamente.

## Estado conhecido e débitos técnicos

Não esconda, contorne silenciosamente nem confunda estes problemas com regressões introduzidas por uma tarefa nova. Confirme o baseline antes de corrigi-los.

### Build e lint

No estado analisado, `npm run build` falha por:

- import inexistente `services/StatsProcessor` em comandos e eventos; o arquivo real é `orchestrators/StatsProcessor`;
- acesso possivelmente indefinido em backlinks de `MetadataAnalyzer` e `VaultService`;
- inicialização possivelmente indefinida da primeira pasta em `mostActiveFolder`;
- `settings.ts` acessando `plugin.settings`, propriedade ausente em `DashboardPlugin`.

`npm run lint` também falha ao aplicar uma regra tipada do plugin `obsidianmd` a `package.json`.

### Lifecycle e composição

- `ServiceContainer.initialize()` cria duas instâncias de `SessionService`: a calculadora recebe uma, enquanto `serviceContainer.sessionService` expõe outra. Assim, a instância iniciada/pingada não é a usada no cálculo diário.
- `initialize()` é `async`, mas não possui awaits e é chamada sem `await`.
- o intervalo de `SessionService` usa `setInterval` diretamente e não possui `stop`; ele deveria ser registrado/limpo no unload.
- comandos, settings tab, ícones e UI não são registrados.
- há imports não usados em `main.ts` e outros arquivos.

### Estado e atualização incremental

- `loadSettings()` lê métricas de `dataFromDisk.vaultMetricData`, mas `saveSettings()` grava `vaultMetrics`; métricas persistidas podem não ser restauradas.
- em `modify`, `updateSnapshotLoad()` substitui o snapshot global pelas métricas somente do arquivo alterado, em vez de aplicar a diferença entre cache anterior e novo.
- `processFolders()` não altera a contagem de pastas.
- criação/exclusão não cobre anexos e depende de cache para subtrair arquivo excluído.
- médias incrementais usam totais/contagens anteriores em alguns caminhos.
- renomear/mover arquivo não atualiza a chave do cache.
- `StateManager` não expõe cleanup/flush do debounce no unload.
- métricas diárias usam chave ISO (`YYYY-MM-DD`), mas o campo interno `date` é criado com locale `pt-BR`.

### Cálculos

- `SessionService.getActiveMinutes()` divide milissegundos pelo intervalo de heartbeat, retornando quantidade aproximada de ticks, não minutos.
- `totalVaultSize` é documentado como MB, calcula MB em uma variável não usada e retorna bytes.
- `getLastModifiedMarkDownFile()` usa uma redução invertida e tende a retornar o arquivo mais antigo.
- streak, maior streak, média diária e dias/semanas/meses mais ativos retornam `null`.
- contagem de sessões é sempre `1`.
- limites de idle e heartbeat são hardcoded; o setting persistido não é consumido.
- `MetadataAnalyzer.isOrphanFile()` duplica a implementação de `VaultService.isOrphanFile()`.
- leituras repetidas de todos os arquivos tornam o bootstrap pesado.

### Metadados e release

- `manifest.json` usa ID com espaços e maiúsculas (`Dynamic DashBoard`), não corresponde ao nome da pasta e possui versão/minAppVersion/descrição provisórias.
- `package.json`, `README.md` e `styles.css` ainda carregam conteúdo do sample.
- versões do `package.json` (`1.0.0`) e manifesto (`0.0.0`) divergem.
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
