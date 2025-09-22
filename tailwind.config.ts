import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
          glow: "hsl(var(--primary-glow))",
          deep: "hsl(var(--primary-deep))",
          light: "hsl(var(--primary-light))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
          accent: "hsl(var(--secondary-accent))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
          light: "hsl(var(--accent-light))",
        },
        success: "hsl(var(--success))",
        warning: "hsl(var(--warning))",
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
      backgroundImage: {
        "gradient-hero": "var(--gradient-hero)",
        "gradient-premium": "var(--gradient-premium)",
        "gradient-card": "var(--gradient-card)",
        "gradient-accent": "var(--gradient-accent)",
        "gradient-depth": "var(--gradient-depth)",
        "gradient-glow": "var(--gradient-glow)",
        "gradient-page": "var(--gradient-page)",
        "gradient-holographic": "var(--gradient-holographic)",
      },
      boxShadow: {
        minimal: "var(--shadow-minimal)",
        soft: "var(--shadow-soft)",
        medium: "var(--shadow-medium)",
        large: "var(--shadow-large)",
        glow: "var(--shadow-glow)",
        "glow-intense": "var(--shadow-glow-intense)",
        inset: "var(--shadow-inset)",
      },
      transitionTimingFunction: {
        smooth: "var(--transition-smooth)",
        bounce: "var(--transition-bounce)",
        spring: "var(--transition-spring)",
        elegant: "var(--transition-elegant)",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0", opacity: "0" },
          to: { height: "var(--radix-accordion-content-height)", opacity: "1" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)", opacity: "1" },
          to: { height: "0", opacity: "0" },
        },
        
        // Premium fade animations
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        },
        "fade-in-up": {
          "0%": { opacity: "0", transform: "translateY(30px)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        },
        "fade-in-down": {
          "0%": { opacity: "0", transform: "translateY(-30px)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        },
        
        // 3D-inspired scale effects
        "scale-in": {
          "0%": { transform: "scale(0.9)", opacity: "0" },
          "100%": { transform: "scale(1)", opacity: "1" }
        },
        "scale-bounce": {
          "0%": { transform: "scale(0.3)", opacity: "0" },
          "50%": { transform: "scale(1.05)", opacity: "0.8" },
          "100%": { transform: "scale(1)", opacity: "1" }
        },
        
        // Floating effect for hero elements
        "float": {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-6px)" }
        },
        
        // Pulse glow effect - NCTR inspired
        "pulse-glow": {
          "0%, 100%": { 
            boxShadow: "0 0 20px hsl(var(--primary) / 0.2)",
            transform: "scale(1)"
          },
          "50%": { 
            boxShadow: "0 0 40px hsl(var(--primary) / 0.4)",
            transform: "scale(1.02)"
          }
        },
        
        // Holographic animation
        "holographic": {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" }
        },
        
        // Slide animations
        "slide-in-right": {
          "0%": { transform: "translateX(100%)", opacity: "0" },
          "100%": { transform: "translateX(0)", opacity: "1" }
        },
        "slide-in-left": {
          "0%": { transform: "translateX(-100%)", opacity: "0" },
          "100%": { transform: "translateX(0)", opacity: "1" }
        },
        
        // Sophisticated shimmer effect
        "shimmer": {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" }
        },
        
        // Gradient shift for premium effects
        "gradient-shift": {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" }
        },

        // NCTR glow pulse
        "nctr-glow": {
          "0%, 100%": { 
            textShadow: "0 0 10px hsl(var(--primary) / 0.4)",
            transform: "scale(1)"
          },
          "50%": { 
            textShadow: "0 0 20px hsl(var(--primary) / 0.8), 0 0 30px hsl(var(--primary) / 0.6)",
            transform: "scale(1.01)"
          }
        }
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        
        // Premium entrance animations
        "fade-in": "fade-in 0.6s cubic-bezier(0.23, 1, 0.320, 1)",
        "fade-in-up": "fade-in-up 0.8s cubic-bezier(0.23, 1, 0.320, 1)",
        "fade-in-down": "fade-in-down 0.8s cubic-bezier(0.23, 1, 0.320, 1)",
        "scale-in": "scale-in 0.5s cubic-bezier(0.23, 1, 0.320, 1)",
        "scale-bounce": "scale-bounce 0.8s cubic-bezier(0.68, -0.55, 0.265, 1.55)",
        
        // Continuous effects
        "float": "float 6s ease-in-out infinite",
        "pulse-glow": "pulse-glow 4s ease-in-out infinite",
        "holographic": "holographic 3s ease-in-out infinite",
        "shimmer": "shimmer 2.5s linear infinite",
        "gradient-shift": "gradient-shift 3s ease infinite",
        "nctr-glow": "nctr-glow 3s ease-in-out infinite",
        
        // Slide effects
        "slide-in-right": "slide-in-right 0.6s cubic-bezier(0.23, 1, 0.320, 1)",
        "slide-in-left": "slide-in-left 0.6s cubic-bezier(0.23, 1, 0.320, 1)",
        
        // Combined entrance effects
        "enter-premium": "fade-in-up 0.8s cubic-bezier(0.23, 1, 0.320, 1), scale-in 0.6s cubic-bezier(0.23, 1, 0.320, 1)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;