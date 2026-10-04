import "./landing.css";
import LandingHeader from "@/components/landing/LandingHeader";
import LandingFooter from "@/components/landing/LandingFooter";
import {
  LandingHero, LandingStats, LandingHowItWorks, LandingTwoSides,
  LandingCategories, LandingTestimonials, LandingCtaBand,
} from "@/components/landing/LandingSections";

// Homepage pra-login (route "/"), dikonversi dari digital.in-sam-fe (React +
// Vite + Tailwind). Gaya di app/landing.css (kelas lp-*, token brand Dashboard);
// hanya LandingHeader yang client component (menu mobile).
export default function LandingPage() {
  return (
    <div className="lp">
      <LandingHeader />
      <main>
        <LandingHero />
        <LandingStats />
        <LandingHowItWorks />
        <LandingTwoSides />
        <LandingCategories />
        <LandingTestimonials />
        <LandingCtaBand />
      </main>
      <LandingFooter />
    </div>
  );
}
