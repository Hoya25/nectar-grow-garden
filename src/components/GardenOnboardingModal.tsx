import { useState } from "react";
import { useNavigate } from "react-router-dom";

interface GardenOnboardingModalProps {
  onComplete: () => void;
}

const STEPS = [
  {
    icon: "🌱",
    headline: "Welcome to The Garden",
    body: "The Garden is where you earn NCTR — your digital stake in the NCTR Alliance ecosystem. Shop 6,000+ brands you already love and earn on every purchase.",
    button: "Show Me How →",
  },
  {
    headline: "Earn By Living Your Life",
    body: "Every purchase through The Garden earns you NCTR. No extra steps. No changes to how you shop. Just earn.",
    button: "What Do I Do With NCTR? →",
    steps: [
      { icon: "🛒", text: "Browse 6,000+ brands" },
      { icon: "💳", text: "Shop like you normally would" },
      { icon: "✨", text: "Earn NCTR automatically" },
    ],
  },
  {
    icon: "💎",
    headline: "NCTR Fuels Your Crescendo Status",
    body: "The NCTR you earn here powers your status in Crescendo — Bronze through Diamond. Higher status unlocks better rewards, opportunities, and benefits. The more you earn, the higher you climb.",
  },
];

export const GardenOnboardingModal = ({ onComplete }: GardenOnboardingModalProps) => {
  const [step, setStep] = useState(0);
  const navigate = useNavigate();
  const current = STEPS[step];

  const finish = () => {
    localStorage.setItem("garden_onboarded", "true");
    onComplete();
  };

  const handlePrimary = () => {
    if (step < 2) {
      setStep(step + 1);
    } else {
      finish();
      navigate("/garden");
    }
  };

  const handleSecondary = () => {
    finish();
    window.open("https://crescendo.nctr.live", "_blank");
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center">
      {/* Overlay — not dismissible */}
      <div className="absolute inset-0 bg-black/70" />

      {/* Modal */}
      <div
        className="relative z-10 w-full h-full md:h-auto md:max-w-[480px] md:rounded-2xl flex flex-col overflow-hidden"
        style={{ background: "#323232" }}
      >
        <div className="flex-1 flex flex-col items-center justify-center p-8 md:p-10 text-center">
          {/* Icon */}
          {current.icon && (
            <span className="text-6xl mb-6">{current.icon}</span>
          )}

          {/* Visual flow steps (step 2) */}
          {current.steps && (
            <div className="flex flex-col gap-4 mb-6 w-full max-w-xs">
              {current.steps.map((s, i) => (
                <div
                  key={i}
                  className="flex items-center gap-4 rounded-xl px-5 py-4"
                  style={{ background: "#5A5A58" }}
                >
                  <span className="text-3xl flex-shrink-0">{s.icon}</span>
                  <span className="text-white text-sm font-medium text-left">{s.text}</span>
                </div>
              ))}
            </div>
          )}

          {/* Headline */}
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
            {current.headline}
          </h2>

          {/* Body */}
          <p className="text-sm md:text-base leading-relaxed mb-8 max-w-sm" style={{ color: "#D9D9D9" }}>
            {current.body}
          </p>

          {/* Buttons */}
          {step < 2 ? (
            <button
              onClick={handlePrimary}
              className="px-8 py-3 rounded-xl text-sm font-bold transition-all hover:opacity-90"
              style={{ background: "#E2FF6D", color: "#323232" }}
            >
              {current.button}
            </button>
          ) : (
            <div className="flex flex-col sm:flex-row gap-3 w-full max-w-sm">
              <button
                onClick={handlePrimary}
                className="flex-1 px-5 py-3 rounded-xl text-sm font-bold transition-all hover:opacity-90"
                style={{ background: "#E2FF6D", color: "#323232" }}
              >
                Start Browsing Brands →
              </button>
              <button
                onClick={handleSecondary}
                className="flex-1 px-5 py-3 rounded-xl text-sm font-bold border transition-all hover:opacity-80"
                style={{ borderColor: "#E2FF6D", color: "#E2FF6D", background: "transparent" }}
              >
                See My Status in Crescendo →
              </button>
            </div>
          )}
        </div>

        {/* Progress dots */}
        <div className="flex items-center justify-center gap-2 pb-8">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className="w-2.5 h-2.5 rounded-full transition-all"
              style={{ background: i === step ? "#E2FF6D" : "#5A5A58" }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default GardenOnboardingModal;
