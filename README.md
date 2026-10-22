# Preço Justo

Precificação e gestão gerencial para salões de beleza, barbearias e estúdios de beleza da Bahia.

> Antes de mexer em qualquer coisa, leia o [**CONTEXTO.md**](CONTEXTO.md) — ele traz as regras do projeto e o fluxo de trabalho obrigatório (Issues, Pull Requests, padrões de interface e qualidade).

## Rodando no computador

Requer [Node.js](https://nodejs.org) 18 ou mais recente.

```bash
npm install        # instala as dependências (só na primeira vez)
npm run dev        # abre o app em modo desenvolvimento
npm run build      # gera a versão de produção na pasta dist/
npm run preview    # testa a versão de produção localmente
```

### Versão em arquivo único

```bash
npm run build:single
```

Gera `dist-single/index.html`, um único arquivo HTML com todo o app embutido, útil para apresentação ou teste sem servidor.

## Deploy

A Vercel está conectada a este repositório:

- todo envio para a branch `main` publica uma nova versão automaticamente;
- todo Pull Request ganha uma URL de pré-visualização própria.

Configuração detectada automaticamente pela Vercel: **Framework** Vite, **Build Command** `npm run build`, **Output Directory** `dist`.

## Estrutura

```
├── CONTEXTO.md            regras do projeto e fluxo de trabalho
├── index.html             página base
├── src/
│   ├── App.jsx            casca do app: tema, cabeçalho e abas
│   ├── telas/             uma pasta ou arquivo por aba (Negócio, Calculadora, Painel…)
│   ├── componentes/       peças usadas por mais de uma tela
│   ├── dados/             FAQ, segmentos, exemplo e dados de referência
│   ├── calculos.js        todas as contas (com testes em calculos.test.js)
│   ├── main.jsx           ponto de entrada do React
│   └── index.css          Tailwind
├── public/                ícones do PWA
├── docs/                  análise crítica e histórico dos blocos de melhoria
├── vite.config.js         build padrão (PWA)
└── vite.single.config.js  build em arquivo único
```

## Privacidade

Os dados que o empreendedor digita ficam salvos apenas no próprio dispositivo (navegador). Nenhum dado financeiro é enviado para servidor nesta versão.
