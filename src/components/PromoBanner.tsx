import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles, ArrowRight, X } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

type Promotion = {
  id: string;
  title: string;
  description: string;
  offer_text: string | null;
  discount_percentage: number | null;
  cta_text: string;
  cta_link: string;
  bg_image: string | null;
  active: boolean;
};

const PromoBanner = () => {
  const [dismissed, setDismissed] = useState<string[]>([]);

  const { data: promotions } = useQuery({
    queryKey: ["promotions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("promotions")
        .select("*")
        .order("display_order", { ascending: true });
      if (error) throw error;
      return data as unknown as Promotion[];
    },
  });

  const visiblePromos = promotions?.filter((p) => !dismissed.includes(p.id));

  if (!visiblePromos || visiblePromos.length === 0) return null;

  return (
    <>
      <AnimatePresence>
        {visiblePromos.map((promo) => (
          <motion.div
            key={promo.id}
            className="relative group mb-8 overflow-hidden"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20, height: 0 }}
            transition={{ duration: 0.5 }}
          >
            {/* Animated glow border */}
            <div className="absolute -inset-0.5 bg-gradient-to-r from-[hsl(var(--primary))] via-[hsl(var(--accent))] to-[hsl(var(--secondary))] rounded-2xl blur-md opacity-40 group-hover:opacity-70 transition-opacity duration-500 promo-glow" />

            <div
              className="relative overflow-hidden rounded-2xl border border-border bg-card"
              style={
                promo.bg_image
                  ? {
                      backgroundImage: `linear-gradient(135deg, hsl(var(--card) / 0.92), hsl(var(--card) / 0.85)), url(${promo.bg_image})`,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                    }
                  : undefined
              }
            >
              {/* Animated grid */}
              <div className="absolute inset-0 promo-grid-bg opacity-5" />
              <div className="absolute inset-0 bg-gradient-to-br from-[hsl(var(--primary)/0.08)] via-transparent to-[hsl(var(--accent)/0.08)]" />

              {/* Close */}
              <button
                onClick={() => setDismissed((prev) => [...prev, promo.id])}
                className="absolute top-3 right-3 z-20 p-1.5 rounded-full bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                aria-label="Dismiss"
              >
                <X size={14} />
              </button>

              <div className="relative z-10 p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center gap-5">
                <div className="flex items-center gap-4 shrink-0">
                  <motion.div
                    className="w-12 h-12 rounded-xl bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(var(--accent))] flex items-center justify-center shadow-lg shadow-[hsl(var(--primary)/0.3)]"
                    animate={{ rotate: [0, 5, -5, 0] }}
                    transition={{ duration: 4, repeat: Infinity }}
                  >
                    <Sparkles className="w-6 h-6 text-primary-foreground" />
                  </motion.div>

                  {(promo.discount_percentage || promo.offer_text) && (
                    <div className="px-3 py-1.5 rounded-full bg-gradient-to-r from-[hsl(var(--primary))] to-[hsl(var(--accent))] text-primary-foreground text-xs font-bold uppercase tracking-wider animate-pulse">
                      {promo.discount_percentage
                        ? `${promo.discount_percentage}% OFF`
                        : promo.offer_text}
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="text-lg md:text-xl font-bold text-foreground mb-1">{promo.title}</h3>
                  <p className="text-muted-foreground text-sm md:text-base leading-relaxed">{promo.description}</p>
                </div>

                <motion.a
                  href={promo.cta_link}
                  className="shrink-0 inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-[hsl(var(--primary))] to-[hsl(var(--secondary))] text-primary-foreground font-semibold text-sm transition-all duration-300"
                  whileHover={{ scale: 1.05, boxShadow: '0 0 25px hsl(var(--primary) / 0.4)', y: -2 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {promo.cta_text}
                  <ArrowRight size={16} />
                </motion.a>
              </div>

              <div className="h-0.5 bg-gradient-to-r from-transparent via-[hsl(var(--primary))] to-transparent" />
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </>
  );
};

export default PromoBanner;
