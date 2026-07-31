import { useEffect, useState } from "react";

import {
  obterVersaoPublicada,
} from "../services/versionManagerService";

/**
 * Exibe a identificação pública da versão do Sistema Chegou!.
 *
 * Pode ser reutilizado em:
 * - rodapé do AppLayout;
 * - rodapé do MasterLayout;
 * - página Sobre;
 * - telas de suporte e diagnóstico.
 */
export default function SystemVersion({
  className = "",
  mostrarRelease = true,
  prefixoVersao = "Versão",
  separador = "•",
}) {
  const [versao, setVersao] = useState(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    let componenteAtivo = true;

    async function carregarVersao() {
      try {
        const versaoPublicada =
          await obterVersaoPublicada();

        if (!componenteAtivo) {
          return;
        }

        setVersao(versaoPublicada);
      } catch (error) {
        console.warn(
          "[Sistema Chegou!] Não foi possível carregar a identificação da versão:",
          error
        );
      } finally {
        if (componenteAtivo) {
          setCarregando(false);
        }
      }
    }

    carregarVersao();

    return () => {
      componenteAtivo = false;
    };
  }, []);

  if (carregando || !versao?.appVersion) {
    return null;
  }

  return (
    <span
      className={[
        "system-version",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      aria-label={[
        `${prefixoVersao} ${versao.appVersion}`,
        mostrarRelease && versao.releaseId
          ? `release ${versao.releaseId}`
          : null,
      ]
        .filter(Boolean)
        .join(", ")}
    >
      <span className="system-version-app">
        {prefixoVersao} {versao.appVersion}
      </span>

      {mostrarRelease && versao.releaseId ? (
        <>
          <span
            className="system-version-separator"
            aria-hidden="true"
          >
            {separador}
          </span>

          <span className="system-version-release">
            Release {versao.releaseId}
          </span>
        </>
      ) : null}
    </span>
  );
}