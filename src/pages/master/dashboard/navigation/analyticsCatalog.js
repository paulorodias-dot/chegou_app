export const ANALYTICS_GROUPS = [
  {
    id: 'intelligence',
    label: 'Inteligência e Gestão',
    options: [
      {
        id: 'system-intelligence',
        label: 'Inteligência do Sistema',
        description: 'Riscos, oportunidades e fatos prioritários',
        status: 'available',
      },
      {
        id: 'executive-overview',
        label: 'Visão Executiva',
        description: 'Panorama global do ecossistema',
        status: 'planned',
      },
      {
        id: 'ecosystem-health',
        label: 'Saúde do Ecossistema',
        description: 'Disponibilidade, estabilidade e desempenho',
        status: 'planned',
      },
    ],
  },
  {
    id: 'management',
    label: 'Gestão e Operação',
    options: [
      {
        id: 'condominiums',
        label: 'Condomínios',
        description: 'Crescimento, situação e desempenho',
        status: 'available',
      },
      {
        id: 'users',
        label: 'Usuários',
        description: 'Cadastros, perfis, ativação e crescimento',
        status: 'available',
      },
      {
        id: 'residents',
        label: 'Moradores e Dependentes',
        description: 'Adesão, experiência e vínculos',
        status: 'planned',
      },
      {
        id: 'employees',
        label: 'Funcionários',
        description: 'Vínculos, atividade e performance',
        status: 'planned',
      },
      {
        id: 'packages',
        label: 'Encomendas Global',
        description: 'Operação global e cadeia de custódia',
        status: 'planned',
      },
      {
        id: 'notifications',
        label: 'Notificações',
        description: 'Entregas, falhas, canais e engajamento',
        status: 'planned',
      },
    ],
  },
  {
    id: 'security',
    label: 'Segurança e Atendimento',
    options: [
      {
        id: 'cyber-security',
        label: 'Segurança Cibernética',
        description: 'Riscos, incidentes e postura de segurança',
        status: 'planned',
      },
      {
        id: 'audit',
        label: 'Auditoria',
        description: 'Ações sensíveis e rastreabilidade',
        status: 'planned',
      },
      {
        id: 'helpdesk',
        label: 'Help Desk',
        description: 'Chamados, SLA e problemas recorrentes',
        status: 'planned',
      },
      {
        id: 'nps',
        label: 'NPS e Experiência',
        description: 'Satisfação, avaliações e oportunidades',
        status: 'planned',
      },
    ],
  },
  {
    id: 'technology',
    label: 'Tecnologia e Integrações',
    options: [
      {
        id: 'infrastructure',
        label: 'Infraestrutura',
        description: 'Banco, aplicação e disponibilidade',
        status: 'planned',
      },
      {
        id: 'external-services',
        label: 'Serviços Externos',
        description: 'Limites, consumo, custos e integrações',
        status: 'planned',
      },
      {
        id: 'deployments',
        label: 'Implantações e Versões',
        description: 'Deploys, builds, releases e falhas',
        status: 'planned',
      },
      {
        id: 'performance',
        label: 'Performance',
        description: 'Latência, erros e experiência técnica',
        status: 'planned',
      },
    ],
  },
  {
    id: 'business',
    label: 'Negócios e Crescimento',
    options: [
      {
        id: 'subscriptions',
        label: 'Assinaturas e Planos',
        description: 'Planos, upgrades e retenção',
        status: 'planned',
      },
      {
        id: 'revenue',
        label: 'Receita',
        description: 'Receita recorrente e projeções',
        status: 'planned',
      },
      {
        id: 'marketing',
        label: 'Marketing',
        description: 'Campanhas, alcance e conversão',
        status: 'planned',
      },
      {
        id: 'partners',
        label: 'Parceiros e Publicidade',
        description: 'Parcerias, campanhas e resultados',
        status: 'planned',
      },
    ],
  },
]

export function findAnalyticsOption(analysisId) {
  for (const group of ANALYTICS_GROUPS) {
    const option = group.options.find((item) => item.id === analysisId)

    if (option) {
      return {
        ...option,
        groupId: group.id,
        groupLabel: group.label,
      }
    }
  }

  return null
}