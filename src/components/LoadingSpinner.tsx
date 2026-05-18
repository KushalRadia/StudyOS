import { Loader2 } from "lucide-react";
import { motion } from "framer-motion";

export default function LoadingSpinner({
  message = "Calculating logic paths...",
}: {
  message?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center p-12 space-y-6">
      <div className="relative">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
          className="w-16 h-16 border-4 border-primary/10 border-t-primary rounded-full shadow-lg"
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <Loader2 className="w-6 h-6 text-primary/40 animate-pulse" />
        </div>
      </div>
      <div className="space-y-1 text-center">
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary animate-pulse">
          {message}
        </p>
        <p className="text-[9px] font-black uppercase tracking-[0.4em] text-on-surface-variant opacity-30">
          Synaptic Synchronization Active
        </p>
      </div>
    </div>
  );
}
