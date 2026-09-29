import React, {
  useEffect,
  useMemo,
  useState,
} from "react";

import { UserRound } from "lucide-react";


import {
  carregarDICRContextosResidenciais,
  carregarResumoFamiliaVinculos,
  carregarResumoVeiculos,
  carregarResumoVagas,
} from "../../../domains/dicr/services/dicr.service";

import {
  adaptarDICRParaCabecalhoPerfil,
  adaptarDICRParaContaPerfil,
  adaptarDICRParaDadosPessoaisPerfil,
  adaptarDICRParaContatoPerfil,
  adaptarDICRParaMinhaUnidadePerfil,
  adaptarResumoFamiliaVinculosParaPerfil,
  adaptarResumoVeiculosParaPerfil,
  adaptarResumoVagasParaPerfil,
} from "../../../domains/dicr/adapters/dicrPerfilMorador.adapter";


import PerfilHeader from "./components/PerfilHeader/PerfilHeader";
import DadosPessoais from "./components/DadosPessoais/DadosPessoais";
import Contato from "./components/Contato/Contato";
import MinhaUnidade from "./components/MinhaUnidade/MinhaUnidade";
import FamiliaVinculos from "./components/FamiliaVinculos/FamiliaVinculos";
import Veiculos from "./components/Veiculos/Veiculos";
import VagasGaragem from "./components/VagasGaragem/VagasGaragem";
import ContatosServicos from "./components/ContatosServicos/ContatosServicos";
import PrivacidadeInformacoes from "./components/PrivacidadeInformacoes/PrivacidadeInformacoes";


import "./PerfilMorador.css";


export default function PerfilMorador() {
  /*
   * ==========================================================
   * PERFIL DO MORADOR
   * ==========================================================
   *
   * O Perfil consome o DICR por meio de:
   *
   * DICR Core / projeções especializadas
   *   ↓
   * dicr.service.js
   *   ↓
   * adapter específico do Perfil
   *   ↓
   * componentes visuais
   *
   * O JSX não consulta Supabase diretamente.
   */


  /*
   * ==========================================================
   * DICR — CONTEXTO AUTENTICADO
   * ==========================================================
   */

  const [dicr, setDicr] =
    useState(null);

  const [
    dicrCarregando,
    setDicrCarregando,
  ] = useState(true);

  const [dicrErro, setDicrErro] =
    useState(null);


  useEffect(() => {
    let ativo = true;

    async function carregarDicr() {
      setDicrCarregando(true);
      setDicrErro(null);

      try {
        const resposta =
          await carregarDICRContextosResidenciais();

        if (!ativo) {
          return;
        }

        setDicr(resposta);
      } catch (error) {
        if (!ativo) {
          return;
        }

        setDicr(null);
        setDicrErro(error);

        if (import.meta.env.DEV) {
          console.error(
            "[DICR] Falha ao carregar contexto do Perfil:",
            {
              name:
                error?.name || null,

              codigo:
                error?.codigo ||
                error?.code ||
                null,

              message:
                error?.message ||
                "Erro não identificado",
            }
          );
        }
      } finally {
        if (ativo) {
          setDicrCarregando(false);
        }
      }
    }

    carregarDicr();

    return () => {
      ativo = false;
    };
  }, []);


  /*
   * ==========================================================
   * PERFIL.01 — CABEÇALHO
   * ==========================================================
   */

  const dadosCabecalho =
    useMemo(
      () =>
        adaptarDICRParaCabecalhoPerfil(
          dicr
        ),
      [dicr]
    );


  /*
   * ==========================================================
   * PERFIL.02 — DADOS PESSOAIS
   * ==========================================================
   */

  const dadosPessoais =
    useMemo(
      () =>
        adaptarDICRParaDadosPessoaisPerfil(
          dicr
        ),
      [dicr]
    );


  /*
   * ==========================================================
   * PERFIL.03 — CONTATO
   * ==========================================================
   */

  const dadosContato =
    useMemo(
      () =>
        adaptarDICRParaContatoPerfil(
          dicr
        ),
      [dicr]
    );


  /*
   * ==========================================================
   * PERFIL.04 — MINHA UNIDADE
   * ==========================================================
   *
   * Projeção do contexto residencial oficial do DICR.
   *
   * O frontend não escolhe arbitrariamente uma unidade
   * quando existem múltiplos contextos.
   */

  const dadosUnidade =
    useMemo(
      () =>
        adaptarDICRParaMinhaUnidadePerfil(
          dicr
        ),
      [dicr]
    );


  /*
   * ==========================================================
   * PERFIL.05 — MINHA CONTA
   * ==========================================================
   */

  const dadosConta =
    useMemo(
      () =>
        adaptarDICRParaContaPerfil(
          dicr
        ),
      [dicr]
    );


  /*
   * ==========================================================
   * CONTEXTO RESIDENCIAL ÚNICO
   * ==========================================================
   *
   * Cards especializados reutilizam o mesmo seletor.
   *
   * O Perfil atual trabalha somente quando o DICR possui
   * contexto residencial único.
   *
   * Não utilizamos contextos[0].
   * Não escolhemos automaticamente uma unidade.
   */

  const moradorUnidadeVinculoId =
    useMemo(() => {
      if (
        !dicr ||
        dicr.selecao_necessaria === true ||
        !dicr.contexto
      ) {
        return null;
      }

      const valor =
        dicr.contexto
          ?.residencia
          ?.morador_unidade_vinculo_id;

      if (typeof valor !== "string") {
        return null;
      }

      const id = valor.trim();

      return id || null;
    }, [dicr]);


  /*
   * ==========================================================
   * PERFIL.06 — MINHA FAMÍLIA E VÍNCULOS
   * ==========================================================
   *
   * Este Card utiliza uma projeção especializada.
   *
   * O DICR resolve o contexto residencial canônico.
   * A RPC especializada resolve os totais autorizados.
   *
   * Loading e erro são independentes do DICR Core para que
   * uma falha neste domínio não derrube os Cards 01–05.
   * ==========================================================
   */

  const [
    resumoFamiliaVinculos,
    setResumoFamiliaVinculos,
  ] = useState(null);

  const [
    familiaVinculosCarregando,
    setFamiliaVinculosCarregando,
  ] = useState(false);

  const [
    familiaVinculosErro,
    setFamiliaVinculosErro,
  ] = useState(null);


  useEffect(() => {
    let ativo = true;

    async function carregarFamiliaVinculos() {
      /*
       * Enquanto o DICR Core ainda está carregando,
       * não iniciamos a projeção especializada.
       */
      if (dicrCarregando) {
        return;
      }

      /*
       * Sem contexto único autorizado não fazemos chamada
       * arbitrária e não convertemos ausência em zero.
       */
      if (!moradorUnidadeVinculoId) {
        setResumoFamiliaVinculos(null);
        setFamiliaVinculosCarregando(false);
        setFamiliaVinculosErro(null);

        return;
      }

      setFamiliaVinculosCarregando(true);
      setFamiliaVinculosErro(null);
      setResumoFamiliaVinculos(null);

      try {
        const resposta =
          await carregarResumoFamiliaVinculos(
            moradorUnidadeVinculoId
          );

        if (!ativo) {
          return;
        }

        setResumoFamiliaVinculos(
          resposta
        );
      } catch (error) {
        if (!ativo) {
          return;
        }

        setResumoFamiliaVinculos(null);
        setFamiliaVinculosErro(error);

        if (import.meta.env.DEV) {
          console.error(
            "[DICR] Falha ao carregar Família e Vínculos:",
            {
              name:
                error?.name || null,

              codigo:
                error?.codigo ||
                error?.code ||
                null,

              message:
                error?.message ||
                "Erro não identificado",
            }
          );
        }
      } finally {
        if (ativo) {
          setFamiliaVinculosCarregando(
            false
          );
        }
      }
    }

    carregarFamiliaVinculos();

    return () => {
      ativo = false;
    };
  }, [
    dicrCarregando,
    moradorUnidadeVinculoId,
  ]);


  const dadosFamiliaVinculos =
    useMemo(
      () =>
        adaptarResumoFamiliaVinculosParaPerfil(
          resumoFamiliaVinculos
        ),
      [resumoFamiliaVinculos]
    );


  /*
   * ==========================================================
   * PERFIL.07 — VEÍCULOS
   * ==========================================================
   *
   * Projeção especializada read-only.
   *
   * O contexto vem do DICR Core.
   * A autorização é revalidada pela RPC especializada.
   *
   * Nenhuma operação de CRUD é realizada nesta etapa.
   * ==========================================================
   */

  const [
    resumoVeiculos,
    setResumoVeiculos,
  ] = useState(null);

  const [
    veiculosCarregando,
    setVeiculosCarregando,
  ] = useState(false);

  const [
    veiculosErro,
    setVeiculosErro,
  ] = useState(null);


  useEffect(() => {
    let ativo = true;

    async function carregarVeiculos() {
      /*
       * Enquanto o contexto canônico ainda está carregando,
       * não iniciamos a projeção especializada.
       */
      if (dicrCarregando) {
        return;
      }

      /*
       * Sem contexto residencial único autorizado:
       * - não escolhemos contextos[0];
       * - não fazemos chamada arbitrária;
       * - não transformamos ausência em lista vazia.
       */
      if (!moradorUnidadeVinculoId) {
        setResumoVeiculos(null);
        setVeiculosCarregando(false);
        setVeiculosErro(null);

        return;
      }

      setVeiculosCarregando(true);
      setVeiculosErro(null);
      setResumoVeiculos(null);

      try {
        const resposta =
          await carregarResumoVeiculos(
            moradorUnidadeVinculoId
          );

        if (!ativo) {
          return;
        }

        setResumoVeiculos(resposta);
      } catch (error) {
        if (!ativo) {
          return;
        }

        setResumoVeiculos(null);
        setVeiculosErro(error);

        if (import.meta.env.DEV) {
          console.error(
            "[DICR] Falha ao carregar Veículos:",
            {
              name:
                error?.name || null,

              codigo:
                error?.codigo ||
                error?.code ||
                null,

              message:
                error?.message ||
                "Erro não identificado",
            }
          );
        }
      } finally {
        if (ativo) {
          setVeiculosCarregando(false);
        }
      }
    }

    carregarVeiculos();

    return () => {
      ativo = false;
    };
  }, [
    dicrCarregando,
    moradorUnidadeVinculoId,
  ]);


  const dadosVeiculos =
    useMemo(
      () =>
        adaptarResumoVeiculosParaPerfil(
          resumoVeiculos
        ),
      [resumoVeiculos]
    );


  /*
    * ==========================================================
    * PERFIL.08 — VAGA(S) DE GARAGEM
    * ==========================================================
    *
    * Projeção especializada read-only.
    *
    * A origem das vagas é a unidade oficial resolvida pelo DICR.
    * A autorização é novamente validada pela RPC especializada.
    *
    * O Card não deriva vagas de veículos e não realiza CRUD.
    * ==========================================================
    */

    const [
      resumoVagas,
      setResumoVagas,
    ] = useState(null);

    const [
      vagasCarregando,
      setVagasCarregando,
    ] = useState(false);

    const [
      vagasErro,
      setVagasErro,
    ] = useState(null);


    useEffect(() => {
      let ativo = true;

      async function carregarVagas() {
        if (dicrCarregando) {
          return;
        }

        /*
        * Sem contexto residencial único autorizado:
        * - não escolhemos contextos[0];
        * - não fazemos chamada arbitrária;
        * - não transformamos ausência em lista vazia.
        */
        if (!moradorUnidadeVinculoId) {
          setResumoVagas(null);
          setVagasCarregando(false);
          setVagasErro(null);

          return;
        }

        setVagasCarregando(true);
        setVagasErro(null);
        setResumoVagas(null);

        try {
          const resposta =
            await carregarResumoVagas(
              moradorUnidadeVinculoId
            );

          if (!ativo) {
            return;
          }

          setResumoVagas(resposta);
        } catch (error) {
          if (!ativo) {
            return;
          }

          setResumoVagas(null);
          setVagasErro(error);

          if (import.meta.env.DEV) {
            console.error(
              "[DICR] Falha ao carregar Vagas:",
              {
                name:
                  error?.name || null,

                codigo:
                  error?.codigo ||
                  error?.code ||
                  null,

                message:
                  error?.message ||
                  "Erro não identificado",
              }
            );
          }
        } finally {
          if (ativo) {
            setVagasCarregando(false);
          }
        }
      }

      carregarVagas();

      return () => {
        ativo = false;
      };
    }, [
      dicrCarregando,
      moradorUnidadeVinculoId,
    ]);


    const dadosVagasGaragem =
      useMemo(
        () =>
          adaptarResumoVagasParaPerfil(
            resumoVagas
          ),
        [resumoVagas]
      );


  /*
   * ==========================================================
   * PERFIL.09 — CONTATOS E SERVIÇOS
   * ==========================================================
   */

  const dadosContatosServicos = null;


  /*
   * Os erros permanecem separados dos estados de carregamento.
   *
   * Nenhuma falha é convertida silenciosamente em dado vazio.
   */

  void dicrErro;
  void familiaVinculosErro;
  void veiculosErro;
  void vagasErro;


  return (
    <main className="morador-perfil">
      <header className="morador-perfil__page-header">
        <div className="morador-perfil__eyebrow">
          <UserRound
            size={15}
            aria-hidden="true"
          />

          <span>
            PERFIL • MINHA CONTA
          </span>
        </div>

        <h1>
          Meu Perfil
        </h1>

        <p>
          Consulte e mantenha atualizadas suas informações no
          Sistema Chegou!.
        </p>
      </header>


      <section
        className="morador-perfil__content"
        aria-label="Informações do perfil"
      >
        <PerfilHeader
          dados={dadosCabecalho}
          dadosConta={dadosConta}
          loading={dicrCarregando}
        />


        <div className="morador-perfil__primary-grid">
          <DadosPessoais
            dados={dadosPessoais}
            loading={dicrCarregando}
          />

          <Contato
            dados={dadosContato}
            loading={dicrCarregando}
          />

          <MinhaUnidade
            dados={dadosUnidade}
            loading={dicrCarregando}
            erro={Boolean(dicrErro)}
          />
        </div>


        <FamiliaVinculos
          dados={dadosFamiliaVinculos}
          loading={
            dicrCarregando ||
            familiaVinculosCarregando
          }
        />


        <div className="morador-perfil__mobility-grid">
          <Veiculos
            dados={dadosVeiculos}
            loading={
              dicrCarregando ||
              veiculosCarregando
            }
          />

          <VagasGaragem
            dados={dadosVagasGaragem}
            loading={
              dicrCarregando ||
              vagasCarregando
            }
          />
        </div>


        <ContatosServicos
          dados={dadosContatosServicos}
        />


        <PrivacidadeInformacoes />
      </section>
    </main>
  );
}