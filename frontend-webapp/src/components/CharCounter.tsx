import React from 'react';

interface CharCounterProps {
    current: number;
    max: number;
}

export const CharCounter: React.FC<CharCounterProps> = ({ current, max }) => (
    <div className="text-[10px] font-bold text-muted-foreground text-right px-2 py-1 opacity-60">
        {current} / {max}
    </div>
);
