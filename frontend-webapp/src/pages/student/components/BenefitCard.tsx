
import React from 'react';

interface BenefitCardProps {
    icon: string;
    iconColor: string;
    title: string;
    subtitle: string;
}

const BenefitCard: React.FC<BenefitCardProps> = ({ icon, iconColor, title, subtitle }) => {
    return (
        <div className="flex cursor-default items-center gap-4 rounded-xl border border-border/70 bg-card p-4 transition-colors hover:bg-muted/20">
            <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg ${iconColor}`}>
                <span className="material-symbols-outlined text-[20px]">{icon}</span>
            </div>
            <div>
                <h3 className="text-sm font-semibold text-foreground">{title}</h3>
                <p className="text-xs text-muted-foreground">{subtitle}</p>
            </div>
        </div>
    );
};

export default BenefitCard;
