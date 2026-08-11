import LandingHeader from "./components/LandingHeader";
import LandingHero from "./components/LandingHero";
import LandingMetrics from "./components/LandingMetrics";
import LandingFeatures from "./components/LandingFeatures";
import LandingCommercial from "./components/LandingCommercial";
import LandingPartners from "./components/LandingPartners";
import LandingSecurity from "./components/LandingSecurity";
import LandingReviews from "./components/LandingReviews";
import LandingContact from "./components/LandingContact";
import LandingFooter from "./components/LandingFooter";

import "./LandingPremium.css";

export default function LandingPremium() {
  return (
    <div className="landing-premium">
      <a
        href="#conteudo-principal"
        className="landing-premium__skip-link"
      >
        Ir para o conteúdo principal
      </a>

      <LandingHeader />

      <main id="conteudo-principal">
        <LandingHero />
        <LandingMetrics />
        <LandingFeatures />
        <LandingCommercial />
        <LandingPartners />
        <LandingSecurity />
        <LandingReviews />
        <LandingContact />
      </main>

      <LandingFooter />

      
    </div>
  );
}