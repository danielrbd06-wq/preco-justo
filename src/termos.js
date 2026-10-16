/* ======================================================================= */
/* Termos de Uso e Aviso de Privacidade (Bloco 12) — textos e regras puras, */
/* testados em termos.test.js. Texto-base: documento "Preço Justo — Termos  */
/* de Uso e Aviso de Privacidade (rascunho)", versão 0.1, de 16/10/2026.    */
/*                                                                         */
/* VERSÃO PRELIMINAR, em revisão jurídica. Ao mudar qualquer texto que o    */
/* usuário aceita, suba VERSAO_TERMOS: o app pede o aceite de novo.         */
/* ======================================================================= */

export const VERSAO_TERMOS = "0.1";
export const DATA_TERMOS = "16 de outubro de 2026";

// Registro do aceite: fica direto no localStorage, FORA do espaço de dados do
// app (prefixo "preco-justo:cache-local:"). Assim ele não vai para a cópia de
// segurança e restaurar uma cópia antiga não apaga o aceite deste aparelho.
export const CHAVE_ACEITE = "preco-justo:aceite-termos";

// Tudo o que o app guarda no aparelho começa com este prefixo.
export const PREFIXO_DADOS_APP = "preco-justo:";

export function montarAceite({ versao = VERSAO_TERMOS, agora = new Date() } = {}) {
  return JSON.stringify({ versao, aceitoEm: agora.toISOString() });
}

/* Lê o registro guardado. Devolve { versao, aceitoEm } ou null se não houver */
/* registro, se ele estiver corrompido ou se for de outra versão dos textos.  */
export function lerAceite(texto, versaoAtual = VERSAO_TERMOS) {
  if (typeof texto !== "string" || !texto) return null;
  let obj;
  try { obj = JSON.parse(texto); } catch { return null; }
  if (!obj || typeof obj !== "object" || obj.versao !== versaoAtual) return null;
  if (typeof obj.aceitoEm !== "string" || Number.isNaN(Date.parse(obj.aceitoEm))) return null;
  return { versao: obj.versao, aceitoEm: obj.aceitoEm };
}

/* Chaves que "Apagar todos os dados deste aparelho" remove: só as do app,    */
/* nunca as de outros sites ou apps que dividam o mesmo endereço.             */
export function chavesDoApp(todasAsChaves) {
  return (todasAsChaves || []).filter((k) => typeof k === "string" && k.startsWith(PREFIXO_DADOS_APP));
}

/* Canal de contato: vazio até ser definido na versão final. */
export const CONTATO_PRIVACIDADE = "";
const TEXTO_CONTATO = CONTATO_PRIVACIDADE
  ? `Para dúvidas sobre privacidade, fale com o responsável pelo app: ${CONTATO_PRIVACIDADE}.`
  : "O canal de contato do responsável pelo app será informado na versão final destes documentos.";

/* Tela de aceite: o resumo que aparece antes de começar. */
export const RESUMO_ACEITE = [
  "Seus dados ficam só neste aparelho. O Preço Justo não recebe nada do que você digita.",
  "Os cálculos são estimativas para apoiar suas decisões. Confira os valores importantes com seu contador.",
  "Baixe a cópia de segurança de vez em quando: se o aparelho for limpo ou trocado, é ela que traz seus dados de volta.",
];

/* Cada seção: { titulo, paragrafos: [texto], itens?: [texto], depois?: [texto] } */
export const TERMOS_DE_USO = [
  { titulo: "1. Quem oferece o app", paragrafos: [
    "O Preço Justo é desenvolvido por Daniel Almeida dos Santos Barbosa, em Feira de Santana, Bahia.",
    TEXTO_CONTATO,
  ] },
  { titulo: "2. Aceite", paragrafos: [
    "Para usar o app, você precisa ler e aceitar estes Termos e conhecer o Aviso de Privacidade. Se não concordar, não use o app. Quando estes Termos mudarem, o app mostra a nova versão e pede um novo aceite.",
  ] },
  { titulo: "3. Quem pode usar", paragrafos: [
    "O app é feito para quem empreende no setor de beleza (salões, barbearias, estúdios, profissionais autônomos e MEIs). Você precisa ter 18 anos ou mais, ou ser legalmente emancipado.",
  ] },
  { titulo: "4. O que o app faz", paragrafos: [
    "O Preço Justo ajuda a calcular preços, custos, margem de contribuição, ponto de equilíbrio, impostos estimados do Simples Nacional e resultados do mês. Também permite anotar preços da concorrência no Observatório. Nesta versão o app é gratuito.",
  ] },
  { titulo: "5. Os cálculos são estimativas", paragrafos: [
    "Os resultados dependem dos dados que você digita e das regras em vigor na data de cada versão do app. Eles servem para apoiar suas decisões e não substituem o trabalho do seu contador, nem uma consultoria tributária, trabalhista ou jurídica.",
    "Confira os valores com seu contador antes de decisões importantes, como mudar de regime tributário, assinar contratos de salão-parceiro ou reajustar preços.",
  ] },
  { titulo: "6. Seus dados ficam com você", paragrafos: [
    "Tudo o que você digita fica guardado só no aparelho em que você usa o app. Por isso:",
  ], itens: [
    "se você limpar os dados do navegador, trocar de aparelho ou desinstalar o app, as informações podem ser perdidas;",
    "a cópia de segurança é a única forma de recuperá-las, e guardá-la em lugar seguro é responsabilidade sua;",
    "quem tiver acesso ao aparelho ou ao arquivo da cópia consegue ver seus dados.",
  ] },
  { titulo: "7. Suas responsabilidades", paragrafos: [
    "Ao usar o app, você se compromete a:",
  ], itens: [
    "usar o app de forma lícita, para a gestão do seu próprio negócio;",
    "só cadastrar dados de outras pessoas, como nomes da sua equipe, quando tiver base legal para isso;",
    "anotar preços da concorrência apenas a partir de informações públicas, como tabelas expostas, sites e redes sociais;",
    "não usar as informações do app para combinar preços com concorrentes.",
  ] },
  { titulo: "8. Funcionamento e atualizações", paragrafos: [
    "O app é oferecido como está e pode ter falhas, ficar fora do ar ou mudar de recursos. Quando houver versão nova, o app avisa e você escolhe a hora de atualizar.",
  ] },
  { titulo: "9. Limite de responsabilidade", paragrafos: [
    "Na medida permitida pela lei, o responsável pelo app não responde por decisões tomadas com base nos cálculos, por dados digitados de forma errada nem por perda de dados guardados apenas no aparelho.",
  ] },
  { titulo: "10. Propriedade intelectual", paragrafos: [
    "O nome Preço Justo, o código e o visual do app pertencem ao responsável. Os dados que você digita são seus. O mapa usa dados © colaboradores do OpenStreetMap, sob a licença ODbL.",
  ] },
  { titulo: "11. Lei aplicável", paragrafos: [
    "Estes Termos seguem as leis do Brasil.",
  ] },
];

export const AVISO_PRIVACIDADE = [
  { titulo: "1. Resumo", paragrafos: [
    "O Preço Justo não recebe os dados do seu negócio. Tudo o que você digita fica guardado só no seu aparelho. Não há cadastro, login nem cookies de rastreamento. Este aviso segue a Lei Geral de Proteção de Dados (Lei 13.709/2018, LGPD).",
  ] },
  { titulo: "2. O que fica no seu aparelho", paragrafos: [
    "Ficam guardados no armazenamento do navegador, e só nele:",
  ], itens: [
    "perfil do negócio: nome, segmento, cidade e forma de trabalho;",
    "custos, serviços, preços, fechamentos do mês e estoque;",
    "dados da equipe que você escolher cadastrar, como nomes, comissões e forma de trabalho;",
    "concorrentes e preços anotados no Observatório, com a localização marcada no mapa;",
    "a data em que você aceitou estes documentos.",
  ], depois: [
    "O responsável pelo app não tem acesso a nenhuma dessas informações.",
  ] },
  { titulo: "3. Serviços de terceiros", paragrafos: [
    "Para o app funcionar, o seu navegador se conecta a três serviços. Eles recebem dados técnicos de acesso, como endereço IP, tipo de navegador, data e hora, e seguem as próprias políticas de privacidade. Nenhum deles recebe os dados do seu negócio.",
  ], itens: [
    "Vercel (EUA): hospeda e entrega o app, ao abrir ou atualizar;",
    "Google Fonts (EUA): entrega a fonte das letras, ao abrir o app;",
    "OpenStreetMap (Reino Unido): entrega as imagens do mapa, só ao abrir o mapa do Observatório.",
  ], depois: [
    "Como esses serviços ficam fora do Brasil, o acesso envolve transferência internacional desses dados técnicos.",
  ] },
  { titulo: "4. Arquivos que você baixa", paragrafos: [
    "A cópia de segurança (.json) e as planilhas (.xlsx) são criadas no próprio aparelho. Depois de baixadas, ficam sob sua guarda: quem tiver o arquivo consegue ver os dados.",
  ] },
  { titulo: "5. Seus direitos", paragrafos: [
    "Como os dados ficam com você, você mesmo exerce os direitos da LGPD (art. 18), direto no app:",
  ], itens: [
    "ver e corrigir: em cada tela do app;",
    "levar para outro aparelho: baixando a cópia de segurança;",
    "apagar tudo: em FAQ → Privacidade e termos → Apagar todos os dados deste aparelho.",
  ], depois: [TEXTO_CONTATO] },
  { titulo: "6. Dados da sua equipe", paragrafos: [
    "Se você cadastrar dados de outras pessoas, você é o responsável por eles perante a LGPD. O app só os guarda no seu aparelho.",
  ] },
  { titulo: "7. Segurança", paragrafos: [
    "Como os dados ficam no aparelho, a segurança deles depende de quem tem acesso a ele. Use senha ou bloqueio de tela e guarde a cópia de segurança em lugar protegido.",
  ] },
  { titulo: "8. Mudanças neste aviso", paragrafos: [
    "Se o app passar a enviar qualquer dado a um servidor, como na futura média de preços da região, este aviso será atualizado antes. O app também vai pedir sua autorização separada, e participar será opcional.",
  ] },
];

export const DOCUMENTOS_LEGAIS = {
  termos: { titulo: "Termos de Uso", secoes: TERMOS_DE_USO },
  privacidade: { titulo: "Aviso de Privacidade", secoes: AVISO_PRIVACIDADE },
};
