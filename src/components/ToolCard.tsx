import { LucideIcon, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "../lib/utils";

interface ToolCardProps {
  title: string;
  description: string;
  icon: string;
  path: string;
  colorClass?: string;
  count?: number;
}

export default function ToolCard({
  title,
  description,
  icon,
  path,
  count,
}: ToolCardProps) {
  return (
    <Link
      to={path}
      className="bg-surface-container-lowest p-4 rounded-xl border border-outline-variant hover:border-primary hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
    >
      <div>
        <div className="bg-primary-container/10 w-12 h-12 rounded-lg flex items-center justify-center mb-3 group-hover:bg-primary-container transition-all shadow-sm">
          <span className="material-symbols-outlined text-primary group-hover:text-on-primary-container transition-colors">
            {icon}
          </span>
        </div>
        <h4 className="font-label-md text-label-md text-on-surface mb-1 font-bold">
          {title}
        </h4>
        <p className="font-body-sm text-body-sm text-on-surface-variant mb-4 line-clamp-1">
          {description}
        </p>
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-outline-variant/30 mt-auto">
        <span className="text-[10px] font-bold text-secondary uppercase tracking-wider bg-secondary-container/20 px-2.5 py-1 rounded-full">
          Used {count || 0}x
        </span>
        <span className="material-symbols-outlined text-[18px] text-on-surface-variant group-hover:translate-x-1 group-hover:text-primary transition-all">
          arrow_forward
        </span>
      </div>
    </Link>
  );
}
