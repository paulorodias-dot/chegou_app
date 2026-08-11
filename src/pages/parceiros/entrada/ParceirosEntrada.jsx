import "./styles/parceiros.tokens.css";
import "./ParceirosEntrada.css";

import ParceirosHeader from "./components/ParceirosHeader";
import ParceirosHero from "./components/ParceirosHero";
import ParceirosBenefits from "./components/ParceirosBenefits";
import ParceirosHowItWorks from "./components/ParceirosHowItWorks";
import ParceirosPricing from "./components/ParceirosPricing";
import ParceirosProgram from "./components/ParceirosProgram";
import ParceirosMetrics from "./components/ParceirosMetrics";
import ParceirosTestimonials from "./components/ParceirosTestimonials";
import ParceirosFaq from "./components/ParceirosFaq";
import ParceirosFinalCta from "./components/ParceirosFinalCta";
import ParceirosContact from "./components/ParceirosContact";
import ParceirosFooter from "./components/ParceirosFooter";

export default function ParceirosEntrada() {
  return (
    <div className="parceiros-entrada-page">
      <div className="parceiros-entrada-top">
        <ParceirosHeader />
        <ParceirosHero />
      </div>

      <main className="parceiros-entrada-main">
        <ParceirosBenefits />

        <ParceirosHowItWorks />
        <ParceirosPricing />
        <ParceirosProgram />
        <ParceirosMetrics />
        <ParceirosTestimonials />
        <ParceirosFaq />
        <ParceirosFinalCta />
        <ParceirosContact />        
      </main>

      <ParceirosFooter />
      
    </div>
  );
}