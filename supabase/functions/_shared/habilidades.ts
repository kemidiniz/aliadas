// Catálogo único: interface, worker e validação usam os mesmos ids estáveis.
export const HABILIDADES = [
  {
    "id": "entrevistas",
    "nome": "Preparação para entrevistas",
    "grupo": "Carreira",
    "descricao": "Preparar respostas e etapas de processos seletivos.",
    "sinonimos": [
      "processo seletivo",
      "dinâmica",
      "case",
      "entrevista"
    ]
  },
  {
    "id": "curriculo_linkedin",
    "nome": "Currículo e LinkedIn",
    "grupo": "Carreira",
    "descricao": "Organizar currículo e apresentação profissional no LinkedIn.",
    "sinonimos": [
      "currículo",
      "cv",
      "linkedin"
    ]
  },
  {
    "id": "transicao_carreira",
    "nome": "Transição de carreira",
    "grupo": "Carreira",
    "descricao": "Planejar mudanças de área ou de atuação profissional.",
    "sinonimos": [
      "mudar de área",
      "recolocação",
      "transição"
    ]
  },
  {
    "id": "planejamento_carreira",
    "nome": "Planejamento de carreira",
    "grupo": "Carreira",
    "descricao": "Definir próximos passos e objetivos de carreira.",
    "sinonimos": [
      "plano de carreira",
      "objetivos",
      "desenvolvimento"
    ]
  },
  {
    "id": "negociacao_salarial",
    "nome": "Negociação salarial",
    "grupo": "Carreira",
    "descricao": "Preparar conversas sobre salário e remuneração.",
    "sinonimos": [
      "salário",
      "remuneração",
      "aumento"
    ]
  },
  {
    "id": "networking",
    "nome": "Networking",
    "grupo": "Carreira",
    "descricao": "Construir e manter conexões profissionais.",
    "sinonimos": [
      "rede de contatos",
      "conexões",
      "networking"
    ]
  },
  {
    "id": "apresentacoes",
    "nome": "Apresentações e falar em público",
    "grupo": "Comunicação",
    "descricao": "Organizar ideias e praticar apresentações.",
    "sinonimos": [
      "oratória",
      "apresentação",
      "pitch",
      "falar em público"
    ]
  },
  {
    "id": "escrita_profissional",
    "nome": "Escrita profissional",
    "grupo": "Comunicação",
    "descricao": "Escrever textos claros para o trabalho.",
    "sinonimos": [
      "redação",
      "comunicação escrita",
      "escrita"
    ]
  },
  {
    "id": "feedback_conversas",
    "nome": "Feedback e conversas difíceis",
    "grupo": "Comunicação",
    "descricao": "Preparar feedbacks e conversas profissionais delicadas.",
    "sinonimos": [
      "feedback",
      "conflito",
      "conversa difícil"
    ]
  },
  {
    "id": "negociacao",
    "nome": "Negociação",
    "grupo": "Comunicação",
    "descricao": "Preparar acordos e negociar interesses profissionais.",
    "sinonimos": [
      "acordo",
      "negociar",
      "negociação"
    ]
  },
  {
    "id": "lideranca",
    "nome": "Liderança de equipes",
    "grupo": "Gestão e liderança",
    "descricao": "Compartilhar práticas de liderança e gestão de pessoas.",
    "sinonimos": [
      "liderança",
      "gestão de pessoas",
      "equipes"
    ]
  },
  {
    "id": "gestao_projetos",
    "nome": "Gestão de projetos",
    "grupo": "Gestão e liderança",
    "descricao": "Planejar e acompanhar entregas de projetos.",
    "sinonimos": [
      "projetos",
      "cronograma",
      "scrum",
      "kanban"
    ]
  },
  {
    "id": "organizacao_produtividade",
    "nome": "Organização e produtividade",
    "grupo": "Gestão e liderança",
    "descricao": "Organizar prioridades e rotinas de trabalho.",
    "sinonimos": [
      "produtividade",
      "prioridades",
      "gestão do tempo"
    ]
  },
  {
    "id": "tomada_decisao",
    "nome": "Tomada de decisão",
    "grupo": "Gestão e liderança",
    "descricao": "Estruturar opções e critérios para decisões.",
    "sinonimos": [
      "decidir",
      "decisão",
      "priorização"
    ]
  },
  {
    "id": "programacao",
    "nome": "Programação",
    "grupo": "Tecnologia e dados",
    "descricao": "Compartilhar conhecimentos de desenvolvimento de software.",
    "sinonimos": [
      "código",
      "software",
      "python",
      "javascript",
      "programação"
    ]
  },
  {
    "id": "analise_dados",
    "nome": "Análise de dados",
    "grupo": "Tecnologia e dados",
    "descricao": "Interpretar dados e construir análises.",
    "sinonimos": [
      "planilhas",
      "sql",
      "estatística",
      "dados"
    ]
  },
  {
    "id": "ia_trabalho",
    "nome": "IA no trabalho",
    "grupo": "Tecnologia e dados",
    "descricao": "Aplicar ferramentas de IA em atividades profissionais.",
    "sinonimos": [
      "inteligência artificial",
      "gemini",
      "prompt",
      "ia"
    ]
  },
  {
    "id": "nocode",
    "nome": "Ferramentas sem código",
    "grupo": "Tecnologia e dados",
    "descricao": "Criar soluções e automações sem programar.",
    "sinonimos": [
      "no code",
      "nocode",
      "make",
      "automação"
    ]
  },
  {
    "id": "ux_produto",
    "nome": "UX e design de produto",
    "grupo": "Tecnologia e dados",
    "descricao": "Pesquisar necessidades e desenhar experiências de uso.",
    "sinonimos": [
      "ux",
      "ui",
      "design",
      "produto",
      "usabilidade"
    ]
  },
  {
    "id": "empreendedorismo",
    "nome": "Empreendedorismo",
    "grupo": "Negócios",
    "descricao": "Estruturar ideias e atividades de um negócio.",
    "sinonimos": [
      "empreender",
      "negócio",
      "empreendedorismo"
    ]
  },
  {
    "id": "marketing_digital",
    "nome": "Marketing digital e redes sociais",
    "grupo": "Negócios",
    "descricao": "Planejar comunicação e presença digital.",
    "sinonimos": [
      "marketing",
      "redes sociais",
      "conteúdo"
    ]
  },
  {
    "id": "vendas_atendimento",
    "nome": "Vendas e atendimento",
    "grupo": "Negócios",
    "descricao": "Aprimorar vendas e relacionamento com clientes.",
    "sinonimos": [
      "vendas",
      "atendimento",
      "clientes"
    ]
  },
  {
    "id": "financas_precificacao",
    "nome": "Finanças e precificação",
    "grupo": "Negócios",
    "descricao": "Organizar finanças e definir preços.",
    "sinonimos": [
      "finanças",
      "preço",
      "precificação",
      "orçamento"
    ]
  },
  {
    "id": "portfolio",
    "nome": "Montar portfólio",
    "grupo": "Estudos e projetos",
    "descricao": "Selecionar e apresentar trabalhos em um portfólio.",
    "sinonimos": [
      "portfólio",
      "portfolio",
      "trabalhos"
    ]
  },
  {
    "id": "rotina_estudos",
    "nome": "Rotina de estudos",
    "grupo": "Estudos e projetos",
    "descricao": "Organizar estudos e aprendizagem.",
    "sinonimos": [
      "estudos",
      "aprendizagem",
      "estudar"
    ]
  },
  {
    "id": "projetos_pessoais",
    "nome": "Projetos pessoais",
    "grupo": "Estudos e projetos",
    "descricao": "Tirar projetos profissionais próprios do papel.",
    "sinonimos": [
      "projeto pessoal",
      "projeto autoral",
      "iniciativa"
    ]
  }
];
export const MAPA_OBJETIVO: Record<string, string[]> = {
  "situacao": [
    "feedback_conversas",
    "tomada_decisao",
    "negociacao",
    "organizacao_produtividade"
  ],
  "entrevista": [
    "entrevistas",
    "curriculo_linkedin",
    "apresentacoes"
  ],
  "apresentacao": [
    "apresentacoes",
    "escrita_profissional",
    "feedback_conversas"
  ],
  "portfolio": [
    "portfolio",
    "ux_produto",
    "escrita_profissional"
  ],
  "carreira": [
    "planejamento_carreira",
    "transicao_carreira",
    "negociacao_salarial",
    "networking"
  ],
  "rede": [
    "networking",
    "apresentacoes",
    "escrita_profissional"
  ],
  "projeto": [
    "gestao_projetos",
    "projetos_pessoais",
    "tomada_decisao",
    "empreendedorismo"
  ],
  "outro": [
    "planejamento_carreira",
    "tomada_decisao",
    "projetos_pessoais"
  ]
};
export const IDS_HABILIDADES = HABILIDADES.map(h => h.id);
export const nomeHabilidade = (id: string) => HABILIDADES.find(h => h.id === id)?.nome ?? id;
