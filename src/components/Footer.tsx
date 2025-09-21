const Footer = () => {
  return (
    <footer className="bg-foreground text-background py-16">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="flex items-center justify-center space-x-2 mb-8">
            <div className="w-10 h-10 bg-gradient-hero rounded-lg flex items-center justify-center">
              <span className="text-primary-foreground font-bold">🌱</span>
            </div>
            <span className="text-2xl font-bold">The Garden</span>
          </div>
          
          <p className="text-lg text-background/80 leading-relaxed mb-8 max-w-3xl mx-auto">
            The Garden is an innovation from Project Butterfly. Project Butterfly is a blockchain 
            initiative creating an ecosystem to harness our buying power and influence to make a 
            positive impact on our lives and the world.
          </p>
          
          <div className="border-t border-background/20 pt-8">
            <p className="text-background/60">
              © 2024 The Garden. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;