import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";


const FAQ = () => {
  const faqs = [
    {
      question: "What is The Garden?",
      answer: "The Garden is a shopping rewards platform where you earn NCTR by purchasing from 6,000+ brands. Your NCTR builds your Crescendo membership status, unlocking better rewards and exclusive opportunities. No buy-in required — just shop and earn.",
      icon: "🌱"
    },
    {
      question: "What is NCTR?",
      answer: "NCTR is what you earn by shopping and participating in The Garden. Think of NCTR like loyalty points — except they are real digital assets you own and control. Commit them with 360LOCK to build your Crescendo status and unlock better rewards. Your NCTR stays yours — it is never spent when committed, just set aside for a period.\n\n⚠️ OFFICIAL CONTRACT ADDRESS: 0x973104fAa7F2B11787557e85953ECA6B4e262328\n\nThis is the ONLY official NCTR contract. Do not confuse with any other assets that may have the same name. Always verify the contract address before any transactions.",
      icon: "🌾"
    },
    {
      question: "How Does The Garden Work?",
      answer: "Sign up free. Shop through The Garden with brands you already love. Every purchase earns you NCTR. Commit your NCTR with 360LOCK to level up your Crescendo status (Bronze through Diamond). Higher status unlocks better rewards and bigger earning opportunities. Invite friends and both earn 500 NCTR.",
      icon: "⚡"
    }
  ];

  return (
    <section className="py-24 md:py-32 relative overflow-hidden bg-[#F5F5F5]">
      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-16 animate-fade-in-up">
            <h2 className="text-5xl md:text-6xl font-bold text-[#323232] mb-6 leading-tight">
              Frequently Asked
              <br />
              Questions
            </h2>
            <div className="w-24 h-1 bg-[#323232] mx-auto rounded-full" />
          </div>
          
          {/* FAQ Cards */}
          <Accordion type="single" collapsible className="space-y-6">
            {faqs.map((faq, index) => (
              <AccordionItem 
                key={index} 
                value={`item-${index}`}
                className="border-0 bg-transparent animate-fade-in-up"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="relative group">
                  <div className="relative bg-white rounded-2xl shadow-soft hover:shadow-lg transition-all duration-500 border border-[#D9D9D9] overflow-hidden">
                    <AccordionTrigger className="px-8 py-6 text-left hover:bg-[#F5F5F5]/50 transition-all duration-300 hover:no-underline group/trigger">
                      <div className="flex items-center gap-4 w-full">
                        <div className="w-12 h-12 bg-[#F5F5F5] border border-[#D9D9D9] rounded-xl flex items-center justify-center shadow-sm group-hover/trigger:shadow-md transition-all duration-300 group-hover/trigger:scale-110">
                          <span className="text-xl">{faq.icon}</span>
                        </div>
                        
                        <span className="text-xl font-bold text-[#323232] group-hover/trigger:text-[#323232]/80 transition-colors duration-300 flex-1 text-left">
                          {faq.question}
                        </span>
                        
                        <div className="w-8 h-8 rounded-full bg-[#F5F5F5] flex items-center justify-center group-hover/trigger:bg-[#D9D9D9]/50 transition-all duration-300">
                          <svg 
                            className="w-4 h-4 text-[#5A5A58] group-hover/trigger:text-[#323232] transition-all duration-300 group-data-[state=open]/trigger:rotate-180" 
                            fill="none" 
                            stroke="currentColor" 
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </div>
                    </AccordionTrigger>
                    
                    <AccordionContent className="px-8 pb-6 text-[#5A5A58] leading-relaxed text-lg">
                      <div className="pl-16 border-l-2 border-[#D9D9D9] ml-6">
                        {index === 1 ? (
                          <>
                            <p className="mb-4">NCTR is what you earn by shopping and participating in The Garden. Think of NCTR like loyalty points — except they are real digital assets you own and control. Commit them with 360LOCK to build your Crescendo status and unlock better rewards. Your NCTR stays yours — it is never spent when committed, just set aside for a period.</p>
                            
                            <p className="mt-4 p-4 bg-[#F5F5F5] border-l-4 border-[#323232] rounded text-[#323232]">
                              <strong>⚠️ OFFICIAL CONTRACT ADDRESS:</strong> 0x973104fAa7F2B11787557e85953ECA6B4e262328
                              <br />
                              <br />
                              This is the ONLY official NCTR contract. Do not confuse with any other assets that may have the same name. Always verify the contract address before any transactions.
                            </p>
                          </>
                        ) : (
                          faq.answer
                        )}
                      </div>
                    </AccordionContent>
                  </div>
                </div>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
};

export default FAQ;
