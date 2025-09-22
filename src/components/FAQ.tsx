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
      answer: "The Garden is a revolutionary platform that democratizes cryptocurrency by allowing you to earn NCTR tokens through everyday activities like shopping. We remove the financial barriers and risks traditionally associated with crypto investing.",
      icon: "🌱"
    },
    {
      question: "What is NCTR?",
      answer: "NCTR (Nectar) is the primary token you earn by participating in opportunities curated in The Garden. You can stack NCTR in different commitment levels (90LOCK or 360LOCK) to unlock more opportunities and benefits across the crypto universe. Unlocked NCTR is yours to do with as you please, you can trade it for any other crypto you want, cash out or re-lock your NCTR to unlock more future earning and experiential opportunities.",
      icon: "🌾"
    },
    {
      question: "How Does The Garden Work?",
      answer: "Simply sign up, complete your profile, and start earning NCTR through various activities. Shop with our brand partners, invite friends, and participate in community activities. The more you engage, the more you earn, and the more opportunities unlock for you.",
      icon: "⚡"
    }
  ];

  return (
    <section className="py-32 relative overflow-hidden">
      {/* Premium Background with Organic Shapes */}
      <div className="absolute inset-0 bg-gradient-to-br from-muted/20 via-background to-secondary/10" />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary-glow/5 rounded-full blur-3xl animate-float" />
      <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-accent/8 rounded-full blur-3xl animate-float [animation-delay:3s]" />
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-4xl mx-auto">
          {/* Premium Header */}
          <div className="text-center mb-20 animate-fade-in-up">
            <h2 className="text-5xl md:text-6xl font-bold text-foreground mb-6 leading-tight">
              <span className="bg-gradient-premium bg-clip-text text-transparent animate-gradient-shift bg-[length:200%_200%]">
                Frequently Asked
              </span>
              <br />
              <span className="text-foreground">Questions</span>
            </h2>
            <div className="w-24 h-1 bg-gradient-hero mx-auto rounded-full" />
          </div>
          
          {/* 3D-Styled FAQ Cards */}
          <Accordion type="single" collapsible className="space-y-6">
            {faqs.map((faq, index) => (
              <AccordionItem 
                key={index} 
                value={`item-${index}`}
                className="border-0 bg-transparent animate-fade-in-up"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="relative group">
                  {/* 3D Card Effect */}
                  <div className="absolute inset-0 bg-gradient-premium opacity-5 rounded-2xl transform rotate-1 group-hover:rotate-0 transition-transform duration-500" />
                  <div className="relative bg-card/90 backdrop-blur-md rounded-2xl shadow-large hover:shadow-glow-intense transition-all duration-500 border border-border/50 overflow-hidden">
                    <AccordionTrigger className="px-8 py-6 text-left hover:bg-gradient-glow/10 transition-all duration-300 hover:no-underline group/trigger">
                      <div className="flex items-center gap-4 w-full">
                        {/* Premium Icon */}
                        <div className="w-12 h-12 bg-gradient-hero rounded-xl flex items-center justify-center shadow-soft group-hover/trigger:shadow-glow transition-all duration-300 group-hover/trigger:scale-110">
                          <span className="text-xl">{faq.icon}</span>
                        </div>
                        
                        {/* Question Text */}
                        <span className="text-xl font-bold text-foreground group-hover/trigger:text-primary-glow transition-colors duration-300 flex-1 text-left">
                          {faq.question}
                        </span>
                        
                        {/* Premium Arrow */}
                        <div className="w-8 h-8 rounded-full bg-muted/50 flex items-center justify-center group-hover/trigger:bg-primary-glow/20 transition-all duration-300">
                          <svg 
                            className="w-4 h-4 text-muted-foreground group-hover/trigger:text-primary-glow transition-all duration-300 group-data-[state=open]/trigger:rotate-180" 
                            fill="none" 
                            stroke="currentColor" 
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </div>
                    </AccordionTrigger>
                    
                    <AccordionContent className="px-8 pb-6 text-muted-foreground leading-relaxed text-lg">
                      <div className="pl-16 border-l-2 border-gradient-hero/20 ml-6">
                        {faq.answer}
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