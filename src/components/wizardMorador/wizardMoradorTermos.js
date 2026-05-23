export const PERFIS_WIZARD_MORADOR = {
  PROPRIETARIO_MORADOR: "proprietario_morador",
  PROPRIETARIO_RESIDENTE: "proprietario_residente",
  INQUILINO: "inquilino",
  PROPRIETARIO_NAO_RESIDENTE: "proprietario_nao_residente",
  PROPRIETARIO_UNIDADE_ALUGADA: "proprietario_unidade_alugada",
  UNIDADE_VAZIA: "unidade_vazia",
  RESPONSAVEL_CORPORATIVO: "responsavel_unidade_corporativa",
  UNIDADE_CORPORATIVA: "unidade_corporativa",
};

export function normalizarPerfilWizardMorador(perfil = "") {
  const valor = String(perfil || "").trim();

  const mapa = {
    proprietario_residente: "proprietario_morador",
    proprietario_morador: "proprietario_morador",
    proprietario_nao_residente: "proprietario_nao_residente",
    proprietario_unidade_alugada: "proprietario_nao_residente",
    inquilino: "inquilino",
    unidade_vazia: "unidade_vazia",
    responsavel_unidade_corporativa: "unidade_corporativa",
    unidade_corporativa: "unidade_corporativa",
  };

  return mapa[valor] || "proprietario_morador";
}

export function obterTituloPerfilWizardMorador(perfil = "") {
  const normalizado = normalizarPerfilWizardMorador(perfil);

  const mapa = {
    proprietario_morador: "Proprietário Morador",
    inquilino: "Morador Inquilino",
    proprietario_nao_residente: "Proprietário Não Residente",
    unidade_vazia: "Unidade Vazia",
    unidade_corporativa: "Unidade Corporativa",
  };

  return mapa[normalizado] || "Proprietário Morador";
}

export const TERMOS_BASE_WIZARD_MORADOR = [
  {
    id: "termos_uso_sistema",
    titulo: "Termos de uso do Sistema Chegou!",
    resumo:
      "Regras gerais de utilização da plataforma, acesso, auditoria e uso correto do sistema.",
    conteudo: [
      "O Sistema Chegou! é uma plataforma tecnológica destinada ao apoio operacional da gestão de encomendas em condomínios, incluindo cadastro, notificações, rastreabilidade, registro de eventos, auditoria e controle de retirada.",
      "O usuário declara estar ciente de que o Sistema Chegou! não é transportadora, empresa de entrega, operador logístico, depositário, seguradora ou responsável físico pela guarda, transporte, integridade, conteúdo, origem ou destino das encomendas.",
      "O uso da plataforma deverá ocorrer de forma lícita, ética, verdadeira e compatível com as regras internas do condomínio, com estes termos e com as políticas de segurança aplicáveis.",
      "O acesso ao sistema poderá ser submetido à auditoria administrativa do condomínio e/ou da equipe responsável pela operação da plataforma, podendo ser aprovado, recusado, bloqueado, suspenso ou revisado em caso de inconsistência, suspeita de fraude, uso indevido, violação de regras, risco de segurança ou necessidade operacional.",
      "O usuário se compromete a não compartilhar indevidamente credenciais, tokens, links de acesso, QR Codes, códigos de retirada, informações de terceiros ou quaisquer mecanismos de validação disponibilizados pelo sistema.",
      "O Sistema Chegou! poderá registrar logs de uso, acessos, alterações, tentativas de operação, eventos relevantes, data, hora, IP, dispositivo, navegador, sistema operacional, localização quando aplicável e demais informações técnicas necessárias à segurança, rastreabilidade e auditoria.",
      "Funcionalidades, telas, notificações, integrações, fluxos operacionais e regras do sistema poderão ser atualizados, ajustados ou temporariamente indisponibilizados para manutenção, evolução, correção, segurança ou adequação legal.",
      "O uso indevido da plataforma, a tentativa de burlar regras, a inserção de informações falsas, o uso de dados de terceiros sem legitimidade, a tentativa de acessar dados não autorizados ou qualquer conduta incompatível com a segurança do condomínio poderá gerar bloqueio do acesso e comunicação à administração responsável.",
    ],
  },
  {
    id: "privacidade_lgpd",
    titulo: "Política de privacidade e tratamento de dados (LGPD)",
    resumo:
      "Como os dados são utilizados para segurança, comunicação, rastreabilidade e operação condominial.",
    conteudo: [
      "Os dados pessoais informados no cadastro poderão ser tratados para fins de identificação do usuário, validação administrativa, liberação de acesso, comunicação operacional, notificações sobre encomendas, auditoria, segurança, prevenção de fraude, rastreabilidade e cumprimento de obrigações legais ou regulatórias.",
      "Entre os dados tratados podem estar: nome, CPF, data de nascimento, e-mail, telefone/WhatsApp, vínculo com a unidade, torre, unidade, pessoas vinculadas, autorizações concedidas, histórico de ações, logs de acesso, IP, data, hora, dispositivo, navegador, sistema operacional e dados de localização quando aplicável.",
      "O tratamento dos dados observará princípios de finalidade, adequação, necessidade, segurança, prevenção, transparência e responsabilização, conforme aplicável à Lei Geral de Proteção de Dados (LGPD).",
      "Os dados serão utilizados exclusivamente para finalidades compatíveis com a operação condominial, segurança, comunicação, gestão de encomendas, controle de acesso ao sistema, auditoria e melhoria da plataforma.",
      "O usuário declara ciência de que determinados dados poderão ser compartilhados com a administração do condomínio, equipe autorizada, operadores internos, portaria, responsáveis pela auditoria e prestadores essenciais à operação do Sistema Chegou!, sempre conforme necessidade operacional e regras de permissão.",
      "Dados de usuários diferentes vinculados à mesma unidade serão tratados de forma segregada sempre que necessário para preservar privacidade, segurança e confidencialidade das informações e das encomendas.",
      "O usuário poderá solicitar informações sobre seus dados, correção, atualização ou outras providências previstas em lei, observadas as limitações decorrentes de obrigações legais, segurança, auditoria, logs, prevenção de fraude e necessidade de preservação de registros operacionais.",
      "Logs, registros de auditoria e eventos de segurança poderão ser preservados pelo período necessário para comprovação de operações, investigação de incidentes, defesa de direitos, prevenção de fraude e atendimento de obrigações legais ou contratuais.",
    ],
  },
  {
    id: "localizacao_dispositivo",
    titulo: "Localização, dispositivo e registros técnicos",
    resumo:
      "Uso de localização, IP, aparelho e registros técnicos para segurança, auditoria e prevenção de fraude.",
    conteudo: [
      "O Sistema Chegou! poderá registrar dados técnicos associados ao uso da plataforma, incluindo endereço IP, data, hora, navegador, sistema operacional, identificadores técnicos de sessão, tipo de dispositivo e informações de localização quando autorizadas ou tecnicamente necessárias.",
      "A localização, quando solicitada ou registrada, será utilizada para finalidades de segurança, auditoria, prevenção de fraude, validação operacional, investigação de uso indevido, confirmação de eventos relevantes, retirada excepcional, contestação de operação ou proteção do usuário, do condomínio e da plataforma.",
      "O Sistema Chegou! não realiza rastreamento contínuo de localização como regra padrão para moradores. O uso de localização será condicionado à finalidade operacional, autorização, configuração do condomínio, necessidade de segurança ou evento específico que justifique o registro.",
      "Em fluxos operacionais envolvendo funcionários, portaria, operadores, retirada excepcional, suporte, acesso suspeito ou validações críticas, a localização aproximada poderá ser solicitada ou registrada conforme configuração do condomínio, permissões do dispositivo e regras aplicáveis.",
      "A precisão da localização depende do aparelho, navegador, rede, GPS, permissões do usuário, sinal disponível e configurações do sistema operacional, não sendo o Sistema Chegou! responsável por imprecisões decorrentes de limitações técnicas externas.",
      "A recusa no compartilhamento de localização poderá limitar determinadas funcionalidades de segurança, auditoria, validação operacional ou proteção contra uso indevido, quando tais dados forem necessários para a execução segura da funcionalidade.",
      "Os registros técnicos poderão ser utilizados para comprovar acessos, identificar alterações, auditar operações, investigar incidentes, proteger contas, validar tokens, controlar uso indevido e apoiar a administração do condomínio em situações de contestação ou risco operacional.",
    ],
  },
];
export const TERMOS_OPERACIONAIS_WIZARD_MORADOR = [
  {
    id: "autenticidade_informacoes",
    titulo: "Autenticidade e responsabilidade pelas informações",
    resumo:
      "Responsabilidade do usuário sobre dados informados, documentos, contatos e pessoas vinculadas.",
    conteudo: [
      "O usuário declara, sob sua inteira responsabilidade, que todas as informações fornecidas são verdadeiras, atuais, completas e compatíveis com sua identidade, vínculo com a unidade e finalidade do cadastro.",
      "O usuário é responsável por manter atualizados seus dados pessoais, e-mail, WhatsApp, CPF, vínculo com a unidade, pessoas vinculadas, autorizações concedidas e demais informações necessárias à operação segura do sistema.",
      "A inserção de informações falsas, incompletas, incorretas, desatualizadas, de terceiros sem autorização legítima ou incompatíveis com a realidade poderá resultar em reprovação do cadastro, bloqueio de acesso, revisão administrativa, suspensão de funcionalidades e comunicação à administração do condomínio.",
      "O Sistema Chegou! e o condomínio poderão solicitar validação complementar, documentação, confirmação de identidade, auditoria manual ou ajuste de informações sempre que houver inconsistência, divergência, suspeita de fraude, risco operacional ou necessidade de segurança.",
      "O usuário reconhece que o uso de e-mail e WhatsApp incorretos, inexistentes, de terceiros sem autorização ou inacessíveis poderá impedir notificações importantes, recuperação de acesso, alertas de encomendas e comunicações operacionais, sendo de sua responsabilidade manter esses canais válidos.",
      "O CPF informado poderá ser utilizado como identificador de segurança, validação administrativa e forma alternativa de acesso ou recuperação, conforme políticas de autenticação do condomínio e do Sistema Chegou!.",
      "O usuário reconhece que a aprovação do cadastro não afasta a possibilidade de revisão posterior caso sejam identificadas informações incorretas, uso indevido, divergências cadastrais, conflito de titularidade ou risco à segurança.",
    ],
  },
  {
    id: "encomendas_responsabilidade_operacional",
    titulo: "Encomendas, retirada e responsabilidade operacional",
    resumo:
      "Regras sobre registro, notificação, retirada, guarda e encerramento da responsabilidade após entrega.",
    conteudo: [
      "O Sistema Chegou! atua como ferramenta de apoio ao registro, organização, comunicação, auditoria e rastreabilidade de encomendas no ambiente condominial, não substituindo as regras internas do condomínio nem as responsabilidades legais de transportadoras, entregadores, remetentes ou destinatários.",
      "O condomínio, por meio de sua administração, portaria, equipe operacional ou responsáveis autorizados, poderá utilizar o sistema para registrar entradas, notificar moradores, controlar disponibilidade, validar retirada, registrar eventos, gerar logs e manter histórico operacional das encomendas.",
      "A existência de registro no Sistema Chegou! não representa garantia sobre conteúdo, valor, integridade, estado físico, origem, autenticidade, regularidade fiscal, legalidade ou adequação da encomenda entregue por terceiros.",
      "O usuário reconhece que transportadoras, entregadores, remetentes, marketplaces e demais terceiros externos ao condomínio são responsáveis por suas próprias obrigações, prazos, comprovantes, danos, extravios anteriores à entrada no condomínio e demais situações alheias ao controle do sistema.",
      "A retirada de encomenda poderá exigir token, QR Code, confirmação no sistema, validação de identidade, assinatura, log operacional, registro do operador, registro de data/hora ou outro método definido pelo condomínio e pelo Sistema Chegou!.",
      "Após a confirmação formal da retirada da encomenda no sistema, inclusive por token, QR Code, validação operacional, assinatura, liberação excepcional registrada ou mecanismo equivalente, encerra-se a responsabilidade operacional do condomínio quanto à guarda do item retirado.",
      "O usuário é responsável por conferir a encomenda no momento da retirada sempre que possível, especialmente em casos de dano aparente, divergência visual, violação de embalagem, item frágil, item de alto valor ou qualquer situação que demande registro de observação.",
      "Caso a retirada seja realizada por pessoa autorizada pelo usuário, dependente, terceiro, funcionário pessoal, representante, familiar ou outro autorizado vinculado à unidade, o usuário reconhece que a autorização concedida no sistema poderá produzir efeitos operacionais perante a portaria e a administração.",
      "O condomínio não se responsabiliza por encomendas retiradas regularmente por pessoa autorizada no sistema, desde que observados os procedimentos de validação, logs e registro operacional aplicáveis.",
      "A liberação excepcional, quando disponível, poderá exigir senha do operador, justificativa, log reforçado, notificação ao responsável e auditoria posterior, não representando obrigação automática do condomínio ou do Sistema Chegou!.",
    ],
  },
  {
    id: "limitacao_responsabilidade_chegou",
    titulo: "Limitação de responsabilidade do Sistema Chegou!",
    resumo:
      "Delimitação da atuação do Sistema Chegou! como plataforma tecnológica de apoio operacional.",
    conteudo: [
      "O Sistema Chegou! atua exclusivamente como plataforma tecnológica de registro, comunicação, rastreabilidade, notificação, auditoria e apoio à gestão operacional de encomendas em condomínios.",
      "O Sistema Chegou! não é responsável físico pela guarda, manuseio, transporte, entrega externa, conteúdo, embalagem, valor, integridade, procedência, regularidade, prazo ou destino das encomendas.",
      "O Sistema Chegou! não responde por falhas de transportadoras, entregadores, marketplaces, remetentes, destinatários, terceiros autorizados, usuários, administradoras, equipes de portaria ou prestadores que atuem fora do controle direto da plataforma.",
      "O Sistema Chegou! não garante disponibilidade ininterrupta, ausência absoluta de falhas, compatibilidade perfeita com todos os dispositivos, precisão total de notificações externas, funcionamento contínuo de APIs de terceiros, WhatsApp, e-mail, internet, operadoras ou serviços integrados.",
      "Notificações por e-mail, WhatsApp, push, aplicativo ou outros canais poderão sofrer atrasos, falhas, bloqueios, indisponibilidades, limites de envio, erros de cadastro, filtros anti-spam, restrições de terceiros ou problemas técnicos externos.",
      "A plataforma poderá registrar eventos e disponibilizar informações com base nos dados inseridos pelos usuários, operadores, condomínio, transportadoras ou integrações. A responsabilidade pela veracidade da informação de origem pertence a quem a forneceu ou operou o respectivo registro.",
      "O Sistema Chegou! poderá adotar medidas de segurança, auditoria, bloqueio preventivo, limitação de acesso, invalidação de tokens, revisão de permissões e suspensão temporária de funcionalidades quando necessário para proteger usuários, condomínio, dados e operação.",
    ],
  },
];
export const TERMOS_PESSOAS_VINCULADAS_WIZARD_MORADOR = [
  {
    id: "pessoas_vinculadas_terceiros",
    titulo: "Pessoas vinculadas, terceiros e autorizações",
    resumo:
      "Responsabilidade sobre pessoas autorizadas, terceiros, funcionários pessoais e permissões concedidas.",
    conteudo: [
      "O usuário poderá informar pessoas vinculadas à unidade, tais como cônjuge, companheiro(a), filhos, familiares, funcionários pessoais, autorizados eventuais ou terceiros, conforme funcionalidades disponíveis e regras do condomínio.",
      "Ao cadastrar, autorizar ou manter pessoa vinculada no sistema, o usuário declara possuir legitimidade para informar os dados e conceder as permissões correspondentes, responsabilizando-se pela veracidade e adequação dessas informações.",
      "As permissões concedidas poderão incluir, conforme o caso: recebimento de encomendas em nome da pessoa vinculada, retirada de encomendas na portaria, acesso próprio ao Sistema Chegou! ou outras funcionalidades futuras.",
      "A permissão de retirada na portaria poderá permitir que a pessoa autorizada retire encomendas próprias, encomendas de outros dependentes autorizados e encomendas vinculadas ao morador responsável, conforme regras operacionais aplicáveis.",
      "O usuário reconhece que a autorização concedida a terceiros, familiares, funcionários pessoais, prestadores ou pessoas vinculadas é de sua responsabilidade, inclusive quanto aos atos praticados por essas pessoas dentro do fluxo operacional do sistema.",
      "O condomínio e o Sistema Chegou! não se responsabilizam por prejuízos, divergências, conflitos internos, retirada por pessoa autorizada, compartilhamento indevido de token, autorização concedida equivocadamente ou falha do usuário em revogar permissões que não deveriam permanecer ativas.",
      "O usuário deverá manter atualizadas as permissões de pessoas vinculadas, removendo ou alterando autorizações quando houver mudança de residência, término de vínculo, desligamento de funcionário, alteração familiar, perda de confiança, troca de responsável ou qualquer situação que torne a autorização inadequada.",
      "Pessoas vinculadas com acesso próprio ao Sistema Chegou! poderão ter credenciais, tokens temporários, convites, logs, notificações e permissões individualizadas, mantendo segregação de dados conforme regras do sistema.",
      "O envio de convite para pessoa vinculada com acesso próprio poderá depender de aprovação administrativa, ação posterior do morador responsável, geração de token temporário de uso único e canal de envio autorizado.",
      "O cadastro de pessoa vinculada não transfere ao condomínio obrigação automática de validação civil, familiar, trabalhista ou contratual sobre o vínculo informado, cabendo ao usuário responder pela legitimidade da autorização concedida.",
    ],
  },
  {
    id: "menores_idade",
    titulo: "Menores de idade e responsabilidade do responsável",
    resumo:
      "Regras especiais para menores, retirada de encomendas, acesso próprio e responsabilidade do responsável.",
    conteudo: [
      "Quando o usuário cadastrar pessoa menor de idade, especialmente menor de 16 anos, o sistema poderá exigir ciência específica, aceite de responsabilidade e confirmação expressa para determinadas permissões.",
      "A autorização para menor de idade retirar encomendas na portaria deverá ser concedida pelo responsável cadastrado, que declara ciência e assume responsabilidade integral pelos efeitos dessa permissão.",
      "A criação de acesso próprio ao Sistema Chegou! para menor de idade, quando permitida, poderá exigir e-mail, WhatsApp, aceite específico, validação posterior, auditoria administrativa e controle adicional de segurança.",
      "O condomínio e o Sistema Chegou! poderão restringir, revisar, bloquear ou exigir validação adicional para permissões envolvendo menores, sempre que houver risco operacional, inconsistência, conflito com regras internas ou necessidade de proteção do menor.",
      "O usuário declara compreender que autorizações concedidas a menores devem observar maturidade, segurança, regras internas do condomínio, orientações familiares e responsabilidade legal do responsável.",
      "A autorização registrada no sistema poderá ser utilizada para fins de auditoria, comprovação, validação de retirada e eventual apuração de contestação.",
    ],
  },
  {
    id: "funcionarios_pessoais_prestadores",
    titulo: "Funcionários pessoais, prestadores e terceiros autorizados",
    resumo:
      "Regras sobre autorização de funcionários pessoais, prestadores, cuidadores, diaristas e terceiros.",
    conteudo: [
      "Funcionários pessoais, diaristas, cuidadores, babás, motoristas, prestadores eventuais ou terceiros autorizados pelo usuário poderão ser cadastrados ou vinculados conforme funcionalidades disponíveis no sistema e regras do condomínio.",
      "Ao cadastrar ou autorizar funcionário pessoal, prestador ou terceiro, o usuário declara que possui legitimidade para conceder a autorização e que se responsabiliza pelas permissões informadas.",
      "O cadastro de funcionário pessoal, prestador ou terceiro no Sistema Chegou! tem finalidade exclusivamente operacional, de segurança, identificação, comunicação e rastreabilidade, não criando vínculo trabalhista, societário, comercial ou de responsabilidade direta entre o Sistema Chegou!, condomínio e a pessoa cadastrada.",
      "O condomínio poderá definir regras próprias sobre entrada, circulação, retirada de encomendas, horários, identificação, documentos, autorização prévia e demais procedimentos aplicáveis a funcionários pessoais e terceiros.",
      "Caso o usuário autorize terceiro a retirar encomendas, reconhece que eventual retirada realizada conforme permissões registradas, token, validação ou procedimento operacional será considerada válida para fins de controle interno.",
      "O usuário deve remover ou atualizar autorizações de terceiros imediatamente quando o vínculo deixar de existir, houver risco, troca de funcionário, encerramento de prestação de serviço, mudança de confiança ou qualquer situação que torne a autorização inadequada.",
    ],
  },
];
export const TERMOS_ESPECIFICOS_PERFIL_WIZARD_MORADOR = {
  proprietario_morador: [
    {
      id: "perfil_proprietario_morador",
      titulo: "Condição de proprietário morador",
      resumo:
        "Regras específicas para proprietário que reside na unidade.",
      conteudo: [
        "O usuário declara que, na condição de proprietário morador, utilizará o Sistema Chegou! para acompanhar encomendas, receber notificações, autorizar pessoas vinculadas e interagir com funcionalidades operacionais relacionadas à sua unidade.",
        "O usuário reconhece que é responsável pelas informações prestadas, pelas permissões concedidas e pela atualização dos dados de pessoas vinculadas à unidade.",
        "As autorizações concedidas a dependentes, familiares, terceiros ou funcionários pessoais serão de responsabilidade do usuário, inclusive quanto à retirada de encomendas e ao uso de tokens ou permissões operacionais.",
      ],
    },
  ],

  inquilino: [
    {
      id: "perfil_inquilino",
      titulo: "Condição de morador inquilino",
      resumo:
        "Regras específicas para inquilino ou responsável residente na unidade.",
      conteudo: [
        "O usuário declara que, na condição de inquilino ou responsável residente, utilizará o Sistema Chegou! para acompanhar encomendas, receber notificações e gerenciar autorizações vinculadas ao seu uso operacional da unidade.",
        "O usuário reconhece que seu cadastro, dados pessoais, encomendas e notificações são tratados de forma segregada em relação a proprietário não residente, outros titulares ou terceiros vinculados à mesma unidade.",
        "O usuário é responsável pelas informações prestadas, pelas pessoas vinculadas que cadastrar e pelas autorizações operacionais concedidas durante o período em que estiver relacionado à unidade.",
      ],
    },
  ],

  proprietario_nao_residente: [
    {
      id: "perfil_proprietario_nao_residente",
      titulo: "Condição de proprietário não residente",
      resumo:
        "Regras específicas para proprietário que não reside na unidade.",
      conteudo: [
        "O acesso deste perfil é restrito às informações, notificações e encomendas vinculadas ao próprio titular cadastrado, não representando acesso irrestrito aos dados, encomendas ou atividades de eventual morador, inquilino ou usuário operacional residente na unidade.",
        "Caso exista morador ou inquilino ativo na unidade, os dados pessoais, encomendas, notificações e registros desse usuário permanecerão segregados por segurança, privacidade e proteção de dados.",
        "O proprietário não residente poderá receber notificações e acompanhar encomendas destinadas a si próprio, quando registradas em seu nome e vinculadas corretamente ao seu perfil no sistema.",
        "Autorizações adicionais concedidas voluntariamente pelo titular a terceiros serão registradas no sistema e permanecerão sob sua responsabilidade, sem transferência automática de responsabilidade operacional ao condomínio ou ao Sistema Chegou!.",
        "O usuário declara compreender que uma coisa é o vínculo de propriedade da unidade e outra é o fluxo operacional de dados, encomendas e notificações do usuário residente ou responsável por uso da unidade.",
      ],
    },
  ],

  unidade_vazia: [
    {
      id: "perfil_unidade_vazia",
      titulo: "Condição de unidade vazia",
      resumo:
        "Regras específicas para unidade sem ocupação operacional ativa.",
      conteudo: [
        "Esta unidade está atualmente declarada como sem ocupação operacional ativa, conforme informação prestada pelo usuário no momento do cadastro.",
        "O acesso deste perfil refere-se exclusivamente ao titular cadastrado e às encomendas, notificações e registros vinculados diretamente a ele.",
        "A declaração de unidade vazia não cria autorização automática para terceiros, futuros moradores, ocupantes, prestadores ou responsáveis operacionais.",
        "Caso futuramente exista morador, inquilino, ocupante ou responsável operacional pela unidade, deverá ser seguido fluxo próprio de cadastro, validação e auditoria, com segregação de dados e permissões.",
        "O usuário declara compreender que o vínculo com a unidade não autoriza acesso a dados de terceiros e que futuras ativações deverão respeitar os fluxos próprios do Sistema Chegou! e do condomínio.",
      ],
    },
  ],

  unidade_corporativa: [
    {
      id: "perfil_unidade_corporativa",
      titulo: "Condição de unidade corporativa",
      resumo:
        "Regras específicas para unidade vinculada a pessoa jurídica ou ocupação empresarial.",
      conteudo: [
        "O cadastro corporativo tem finalidade de controle operacional, segurança, rastreabilidade e organização de informações relacionadas à unidade no Sistema Chegou!.",
        "A pessoa jurídica, representante ou responsável indicado declara que as informações prestadas são verdadeiras e que possui legitimidade para realizar o cadastro em nome da empresa ou entidade correspondente.",
        "Cada usuário autorizado pela empresa deverá possuir segregação individual de dados, acessos, notificações e responsabilidade sobre suas próprias informações e encomendas vinculadas.",
        "O cadastro jurídico não implica visualização irrestrita entre usuários, colaboradores, moradores, funcionários, prestadores ou terceiros sem permissões compatíveis.",
        "A empresa ou responsável indicado deverá manter atualizadas as informações de usuários autorizados, remover acessos indevidos, revisar permissões e observar regras internas do condomínio e do Sistema Chegou!.",
        "O Sistema Chegou! não se responsabiliza por conflitos internos da empresa, autorizações concedidas indevidamente, dados incorretos fornecidos por representantes ou uso inadequado por colaboradores ou terceiros autorizados.",
      ],
    },
  ],
};

export const CHECKLIST_FINAL_WIZARD_MORADOR = [
  {
    id: "confirmo_dados_corretos",
    texto:
      "Confirmo que revisei os dados informados e que eles são verdadeiros, atuais e completos.",
    obrigatorio: true,
  },
  {
    id: "confirmo_contatos_validos",
    texto:
      "Confirmo que o e-mail e o WhatsApp informados são válidos e poderão ser usados para comunicações importantes.",
    obrigatorio: true,
  },
  {
    id: "confirmo_responsabilidade_encomendas",
    texto:
      "Declaro ciência de que, após a retirada registrada no sistema, encerra-se a responsabilidade operacional do condomínio quanto à guarda da encomenda retirada.",
    obrigatorio: true,
  },
  {
    id: "confirmo_pessoas_vinculadas",
    texto:
      "Declaro responsabilidade pelas pessoas vinculadas, terceiros, funcionários pessoais ou autorizados cadastrados por mim.",
    obrigatorio: true,
  },
  {
    id: "confirmo_auditoria",
    texto:
      "Autorizo a auditoria administrativa do cadastro, das informações prestadas e das permissões concedidas.",
    obrigatorio: true,
  },
  {
    id: "aceito_lgpd",
    texto:
      "Li e aceito as regras de privacidade, tratamento de dados, logs, auditoria, localização e segurança.",
    obrigatorio: true,
  },
  {
    id: "aceito_termos",
    texto:
      "Li, compreendi e aceito integralmente os Termos de Uso do Sistema Chegou!.",
    obrigatorio: true,
  },
];

export function obterTermosWizardMorador(perfil = "") {
  const perfilNormalizado = normalizarPerfilWizardMorador(perfil);

  return [
    ...TERMOS_BASE_WIZARD_MORADOR,
    ...TERMOS_OPERACIONAIS_WIZARD_MORADOR,
    ...TERMOS_PESSOAS_VINCULADAS_WIZARD_MORADOR,
    ...(TERMOS_ESPECIFICOS_PERFIL_WIZARD_MORADOR[perfilNormalizado] || []),
  ];
}

export function obterChecklistWizardMorador() {
  return CHECKLIST_FINAL_WIZARD_MORADOR;
}

export function obterResumoTermosPorPerfil(perfil = "") {
  const perfilNormalizado = normalizarPerfilWizardMorador(perfil);

  const mapa = {
    proprietario_morador:
      "Você está concluindo o cadastro como proprietário morador. Revise seus dados, pessoas vinculadas e autorizações antes de enviar para auditoria.",
    inquilino:
      "Você está concluindo o cadastro como morador inquilino. Seus dados e encomendas serão tratados de forma segregada e protegida.",
    proprietario_nao_residente:
      "Você está concluindo o cadastro como proprietário não residente. Seu acesso será restrito aos seus próprios dados e encomendas, sem acesso aos dados de eventual inquilino.",
    unidade_vazia:
      "Você está concluindo o cadastro de uma unidade vazia. O acesso refere-se ao titular cadastrado e não cria permissões automáticas para terceiros.",
    unidade_corporativa:
      "Você está concluindo o cadastro de uma unidade corporativa. O controle jurídico é operacional e cada usuário autorizado terá responsabilidade individual por seus dados e encomendas.",
  };

  return mapa[perfilNormalizado] || mapa.proprietario_morador;
}