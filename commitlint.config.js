// Padrão das mensagens de commit (Bloco 19). O título começa com "Bloco N:" (como nos
// PRs de cada bloco) ou com um tipo curto em inglês, seguido de dois-pontos e do
// resumo em português. Exemplos:
//   Bloco 19: Knip, Commitlint e Stryker
//   fix: rascunho do fechamento não voltava depois de recarregar
//   test(calculos): ponto de equilíbrio com aluguel de cadeira
const TIPOS = ["feat", "fix", "docs", "test", "refactor", "perf", "chore", "ci", "style", "build", "revert"];

export default {
  parserPreset: {
    parserOpts: {
      headerPattern: /^([A-Za-z]+(?: \d+)?)(?:\(([^)]*)\))?!?: (.+)$/,
      headerCorrespondence: ["type", "scope", "subject"],
    },
  },
  plugins: [
    {
      rules: {
        "tipo-do-projeto": ({ type }) => [
          TIPOS.includes(type) || /^Bloco \d+$/.test(type || ""),
          `comece o título com "Bloco N:" ou com um destes tipos: ${TIPOS.join(", ")} (ex.: "fix: corrige o arredondamento")`,
        ],
      },
    },
  ],
  rules: {
    "tipo-do-projeto": [2, "always"],
    "subject-empty": [2, "never"],
    "header-max-length": [2, "always", 120],
  },
  // Mensagens que o próprio GitHub cria (merge, edição pela web) não precisam seguir o padrão.
  ignores: [(mensagem) => /^(Merge |Update |Create |Delete |Revert ")/.test(mensagem)],
};
