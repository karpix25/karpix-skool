
import React from 'react';

interface BenefitCardProps {
  icon: string;
  iconColor: string;
  title: string;
  subtitle: string;
}

const BenefitCard: React.FC<BenefitCardProps> = ({ icon, iconColor, title, subtitle }) => {
  return (
    <div className="benefit-card p-4 rounded-xl flex items-center gap-4 hover:bg-white/[0.05] transition-colors cursor-default">
      <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${iconColor}`}>
        <span className="material-symbols-outlined">{icon}</span>
      </div>
      <div>
        <h3 className="text-sm font-semibold text-white">{title}</h3>
        <p className="text-xs text-slate-500">{subtitle}</p>
      </div>
    </div>
  );
};

export default BenefitCard;
