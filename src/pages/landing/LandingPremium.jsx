import LandingHeader from "./components/LandingHeader";
import LandingHero from "./components/LandingHero";
import LandingFeatures from "./components/LandingFeatures";
import LandingCommercial from "./components/LandingCommercial";
import LandingSecurity from "./components/LandingSecurity";
import LandingContact from "./components/LandingContact";
import LandingFooter from "./components/LandingFooter";
import LandingBackToTop from "./components/LandingBackToTop";

import {
  LandingNavigationProvider,
} from "./navigation/LandingNavigationContext";

import "./LandingPremium.css";

export default function LandingPremium() {
  return (
    <LandingNavigationProvider>
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
          <LandingFeatures />
          <LandingCommercial />
          <LandingSecurity />
          <LandingContact />
        </main>

        <LandingFooter />

        <LandingBackToTop />
      </div>
    </LandingNavigationProvider>
  );
}