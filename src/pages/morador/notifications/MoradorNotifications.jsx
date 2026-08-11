import NotificationCenter from "../../notificacoes";
import "./MoradorNotifications.css";

export default function MoradorNotifications({
  perfil,
  onNavigate,
}) {
  return (
    <div className="morador-notifications-page">
      <NotificationCenter
        perfil={perfil}
        moduleContext="morador"
        onNavigate={onNavigate}
      />
    </div>
  );
}