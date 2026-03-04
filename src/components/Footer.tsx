import nctrLogo from "@/assets/nctr-logo-grey-transparent.png";

const Footer = () => {
  return (
    <footer className="relative bg-[#323232] text-white py-24 overflow-hidden">
      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-6xl mx-auto">
          {/* Logo Section */}
          <div className="text-center mb-16 animate-fade-in-up">
            <div className="flex items-center justify-center space-x-4 mb-8 group">
              <span className="text-4xl font-bold text-[#E2FF6D]">The Garden</span>
              <img 
                src={nctrLogo} 
                alt="NCTR" 
                className="h-40 w-auto opacity-90 group-hover:opacity-100 transition-opacity duration-500"
              />
            </div>
            
            <p className="text-xl text-[#D9D9D9] leading-relaxed mb-12 max-w-4xl mx-auto font-medium">
              The Garden is an innovation from{" "}
              <span className="text-[#E2FF6D] font-bold">NCTR Alliance</span>
              . A community-driven initiative creating an ecosystem to harness our buying power 
              and influence to make a positive impact on our lives and the world.
            </p>
          </div>
          
          {/* Crescendo Cross-link */}
          <div className="text-center mb-12">
            <a
              href="https://crescendo.nctr.live"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-semibold transition-all hover:scale-105 bg-[#E2FF6D] text-[#323232]"
            >
              Unlock rewards with your earned NCTR → Visit Crescendo
            </a>
          </div>

          {/* Footer Bottom */}
          <div className="border-t border-[#5A5A58] pt-12">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <p className="text-[#D9D9D9] text-lg">
                © 2026 NCTR Alliance · The Garden. All rights reserved.
              </p>
              
              <div className="flex items-center gap-6">
                <a href="/faq" className="text-[#D9D9D9] hover:text-[#E2FF6D] hover:scale-110 transition-all duration-300">
                  FAQ
                </a>
                <button className="text-[#D9D9D9] hover:text-[#E2FF6D] hover:scale-110 transition-all duration-300 bg-transparent">
                  Privacy Policy
                </button>
                <button className="text-[#D9D9D9] hover:text-[#E2FF6D] hover:scale-110 transition-all duration-300 bg-transparent">
                  Terms of Service  
                </button>
                <button className="text-[#D9D9D9] hover:text-[#E2FF6D] hover:scale-110 transition-all duration-300 bg-transparent">
                  Contact
                </button>
              </div>
            </div>
          </div>

          {/* Legal disclaimer */}
          <p className="text-center mt-8" style={{ fontSize: '11px', color: '#5A5A58' }}>
            NCTR is a utility token used within the NCTR Alliance commerce network. Not an investment product. Not a security.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
