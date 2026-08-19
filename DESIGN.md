# DESIGN.md — Direção Visual e UX

## 1. Princípios

- **Dashboard financeiro premium, escuro, denso mas organizado.** Muita
  informação útil, sem sensação de bagunça — hierarquia visual clara resolve
  densidade, não a ausência de conteúdo.
- **Linguagem visual própria.** Referências conceituais (produtos SaaS
  financeiros modernos) orientam apenas a *gramática* — sidebar fixa, cards,
  gráficos, paleta escura com acento roxo/ciano — nunca cópia literal de
  layout, ícones ou nomes.
- **Consistência antes de enfeite.** Um único sistema de espaçamento, tipos
  de card e paleta de cores, reaplicado em todas as telas.

## 2. Paleta de cores (tema escuro)

| Papel | Cor | Uso |
|---|---|---|
| Fundo base | `#0B0D12` | body |
| Fundo elevado (cards, sidebar) | `#12151C` | cards, sidebar, modais |
| Fundo elevado 2 (hover/inputs) | `#1A1E28` | inputs, hover de linha de tabela |
| Borda sutil | `#232838` | divisores, bordas de card |
| Texto primário | `#F4F5F7` | títulos, valores |
| Texto secundário | `#9CA3AF` | labels, legendas |
| Acento primário (roxo) | `#7C5CFC` | ações primárias, links, destaque de receita/foco |
| Acento primário hover | `#8F73FF` | hover de botões |
| Acento secundário (ciano) | `#2DD4E8` | gráficos secundários, badges informativos |
| Sucesso / receita | `#2FD583` | valores positivos, receitas |
| Erro / despesa | `#F0596B` | valores negativos, despesas |
| Alerta | `#F5B94D` | orçamento perto do limite (fase futura) |

Regra prática: roxo = ação/identidade do produto; ciano = dado secundário em
gráficos; verde/vermelho reservados exclusivamente para semântica
financeira (receita/despesa), nunca usados decorativamente.

## 3. Tipografia

- Fonte: **Inter** (ou similar geométrica sans — boa legibilidade em telas
  escuras e em tabelas numéricas).
- Números financeiros usam `font-variant-numeric: tabular-nums` para
  alinhamento correto em tabelas e cards.
- Escala: `12px` (labels/legendas) · `14px` (corpo/tabela) · `16px` (corpo
  destacado) · `20–24px` (títulos de card) · `32–36px` (valor principal do
  card de saldo).

## 4. Layout geral

```
┌───────────┬──────────────────────────────────────────────┐
│           │  Topbar: título da página · seletor de período │
│  Sidebar  │  · avatar/usuário                                │
│  (fixa,   ├──────────────────────────────────────────────┤
│  240px)   │                                                  │
│           │  Conteúdo (grid de cards, gráficos, tabelas)    │
│           │                                                  │
└───────────┴──────────────────────────────────────────────┘
```

- Sidebar fixa à esquerda, colapsável para ícones apenas (ícones
  `lucide-react`). Item ativo com barra vertical roxa + fundo levemente
  elevado.
- Itens: Dashboard, Transações, Contas, Categorias, Orçamentos, Relatórios,
  Configurações — com ícone + label.
- **Metas financeiras** (fase futura, ver ARCHITECTURE.md seção 9.2) entram
  provavelmente como aba dentro de "Orçamentos" em vez de item próprio na
  sidebar, para não sobrecarregar a navegação principal — a decidir com mais
  detalhe na Fase 7.
- **Cartão de crédito** (fase futura, ver ARCHITECTURE.md seção 10) não gera
  item novo na sidebar: um cartão é uma conta como outra qualquer, então a
  visão de fatura/parcelas futuras deve viver como uma sub-tela dentro do
  detalhe de uma conta em "Contas", não como uma seção separada.
- Topbar contextual: nome da página à esquerda, seletor de período
  (mês/ano ou range) e botão "+ Nova transação" à direita — ação primária
  sempre acessível de qualquer tela.

## 5. Componentes-chave

### 5.1 Cards de resumo (dashboard)

Quatro cards no topo: **Saldo**, **Receitas**, **Despesas**, **Economia do
mês**. Cada card:

- Label pequeno (secundário) + valor grande (tabular-nums) + variação vs.
  mês anterior (seta + percentual, verde/vermelho).
- Ícone sutil no canto (círculo com fundo translúcido na cor do acento
  correspondente).
- Fundo `#12151C`, borda `1px solid #232838`, `border-radius: 12px`,
  padding generoso (`20–24px`).

### 5.2 Gráficos

- **Receitas x Despesas (linha/área, últimos 6 meses)**: duas séries —
  receita em verde, despesa em vermelho, fundo com grid sutil quase
  invisível (`#1A1E28`), sem bordas pesadas nos eixos.
- **Gastos por categoria (donut ou barra horizontal)**: cores derivadas de
  uma paleta categórica harmônica com o tema (tons de roxo/ciano/âmbar/verde
  desaturados), nunca cores puras saturadas que brigem com o acento
  primário.
- Tooltips com fundo `#1A1E28`, borda sutil, cantos arredondados,
  sombra leve.

### 5.3 Tabela de transações

- Linhas zebra muito sutil (`#12151C` / `#0F1218`) ou apenas divisores finos
  — preferir divisores finos para visual mais clean.
- Coluna de valor alinhada à direita, cor verde/vermelho conforme tipo,
  sempre com sinal (+/−) explícito além da cor (acessibilidade).
- Badge de categoria: pill pequena com a cor da categoria + nome.
- Ações (editar/excluir) aparecem no hover da linha, ícones discretos.
- Filtros acima da tabela: período, tipo, categoria, conta, método —
  como um toolbar compacto, não um formulário longo.

### 5.4 Formulário de transação (modal/drawer)

- Drawer lateral (não modal central) para não perder contexto do dashboard
  atrás.
- Toggle segmentado no topo do form: **Despesa | Receita** (vermelho/verde
  quando selecionado).
- Campos agrupados logicamente: Valor + Data (lado a lado) → Descrição →
  Categoria + Conta + Método (grid 2 colunas) → Observação (textarea
  opcional, colapsada por padrão).

## 6. Estados e feedback

- **Vazio** (sem transações no período): ilustração minimalista simples +
  texto curto + CTA "Adicionar primeira transação" — nunca tela em branco.
- **Loading**: skeletons no formato exato do componente final (cards,
  linhas de tabela, gráfico), nunca spinner genérico central.
- **Erro de rede/validação**: toast discreto no canto, cor de alerta,
  nunca `alert()` do navegador.

## 7. Responsividade

MVP prioriza desktop (uso típico de gestão financeira), mas o layout deve
degradar graciosamente: sidebar vira drawer/bottom-nav em telas < 768px,
cards de resumo empilham em coluna única, tabela de transações vira lista
de cards em mobile.

## 8. O que evitar

- Gradientes exagerados, glassmorphism pesado, glow neon excessivo — o
  roxo/ciano deve pontuar, não dominar a tela.
- Excesso de bordas/sombras concorrentes — um nível de elevação por vez
  (fundo → card → elemento interativo).
- Ícones decorativos sem função — cada ícone deve reforçar significado
  (tipo de conta, categoria, direção de variação).
