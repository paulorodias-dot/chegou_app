import { useEffect, useState } from 'react'
import { supabase } from '../../services/supabase'

function DashboardMaster() {
  const [dados, setDados] = useState({
    totalCondominios: 0,
    condominiosMes: 0,
    condominiosPendentes: null,
    totalUsuariosCliente: 0,
  })

  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')

  function inicioDoMesISO() {
    const hoje = new Date()
    return new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString()
  }

  async function carregarDashboard() {
    setCarregando(true)
    setErro('')

    try {
      const { count: totalCondominios, error: erroTotalCondominios } = await supabase
        .from('condominios')
        .select('*', { count: 'exact', head: true })

      if (erroTotalCondominios) throw erroTotalCondominios

      const { count: condominiosMes, error: erroCondominiosMes } = await supabase
        .from('condominios')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', inicioDoMesISO())

      if (erroCondominiosMes) throw erroCondominiosMes

      let condominiosPendentes = null

      const tentativaPendentes = await supabase
        .from('condominios')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pendente')

      if (!tentativaPendentes.error) {
        condominiosPendentes = tentativaPendentes.count || 0
      }

      const { count: totalUsuariosCliente, error: erroUsuarios } = await supabase
        .from('usuarios')
        .select('*', { count: 'exact', head: true })
        .neq('origem', 'sistema')

      if (erroUsuarios) throw erroUsuarios

      setDados({
        totalCondominios: totalCondominios || 0,
        condominiosMes: condominiosMes || 0,
        condominiosPendentes,
        totalUsuariosCliente: totalUsuariosCliente || 0,
      })
    } catch (error) {
      setErro(error.message)
    } finally {
      setCarregando(false)
    }
  }

useEffect(() => {
  async function init() {
    await carregarDashboard()
  }

  init()
}, [])

  return (
    <section className="dashboard-page">
      <div className="breadcrumb">Início › Dashboard</div>

      <div className="dashboard-title-row">
        <div>
          <h1>Dashboard Master</h1>
          <p>Visão geral da plataforma Chegou!</p>
        </div>

        <button className="refresh-button" onClick={carregarDashboard}>
          Atualizar
        </button>
      </div>

      {erro && <div className="alert error">{erro}</div>}

      {carregando ? (
        <div className="dashboard-loading">
          Carregando indicadores do sistema...
        </div>
      ) : (
        <>
          <div className="dashboard-cards">
            <div className="dashboard-card main-card">
              <span className="card-label">Condomínios cadastrados</span>

              <strong>{dados.totalCondominios}</strong>

              <div className="mini-card-row">
                <div className="mini-card">
                  <small>Cadastrados este mês</small>
                  <b>{dados.condominiosMes}</b>
                </div>

                <div className="mini-card">
                  <small>Condomínios pendentes</small>
                  <b>{dados.condominiosPendentes === null ? '—' : dados.condominiosPendentes}</b>
                </div>
              </div>
            </div>

            <div className="dashboard-card user-card">
              <span className="card-label">Usuários no sistema</span>
              <strong>{dados.totalUsuariosCliente}</strong>
              <p>Desconsiderando usuários internos do Chegou!</p>
            </div>
          </div>

          <div className="charts-grid">
            <div className="chart-card">
              <h3>Condomínios</h3>

              <div className="bar-chart">
                <div className="bar-line">
                  <span>Total</span>
                  <div>
                    <i style={{ width: `${Math.min(dados.totalCondominios * 10, 100)}%` }}></i>
                  </div>
                  <b>{dados.totalCondominios}</b>
                </div>

                <div className="bar-line">
                  <span>Mês</span>
                  <div>
                    <i style={{ width: `${Math.min(dados.condominiosMes * 10, 100)}%` }}></i>
                  </div>
                  <b>{dados.condominiosMes}</b>
                </div>
              </div>
            </div>

            <div className="chart-card">
              <h3>Usuários</h3>

              <div className="donut-fake">
                <div>
                  <strong>{dados.totalUsuariosCliente}</strong>
                  <span>usuários</span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </section>
  )
}

export default DashboardMaster