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
      answer: "The Garden is a revolutionary platform that democratizes cryptocurrency by allowing you to earn NCTR tokens through everyday activities like shopping. We remove the financial barriers and risks traditionally associated with crypto investing."
    },
    {
      question: "What is NCTR?",
      answer: "NCTR (Nectar) is the primary token you earn by participating in opportunities curated in The Garden. You can stack NCTR in different commitment levels (90LOCK or 360LOCK) to unlock more opportunities and benefits across the crypto universe. Unlocked NCTR is yours to do with as you please, you can trade it for any other crypto you want, cash out or re-lock your NCTR to unlock more future earning and experiential opportunities."
    },
    {
      question: "How Does The Garden Work?",
      answer: "Simply sign up, complete your profile, and start earning NCTR through various activities. Shop with our brand partners, invite friends, and participate in community activities. The more you engage, the more you earn, and the more opportunities unlock for you."
    }
  ];

  return (
    <section className="py-24 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold text-center text-foreground mb-12">
            Frequently Asked Questions
          </h2>
          
          <Accordion type="single" collapsible className="space-y-4">
            {faqs.map((faq, index) => (
              <AccordionItem 
                key={index} 
                value={`item-${index}`}
                className="bg-card rounded-lg shadow-soft border border-border overflow-hidden"
              >
                <AccordionTrigger className="px-6 py-4 text-left text-lg font-semibold text-foreground hover:bg-muted/50 transition-colors">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-4 text-muted-foreground leading-relaxed">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
};

export default FAQ;