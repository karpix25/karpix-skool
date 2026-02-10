import React from 'react';
import { Text } from '@telegram-apps/telegram-ui';

interface CharCounterProps {
    current: number;
    max: number;
}

export const CharCounter: React.FC<CharCounterProps> = ({ current, max }) => (
    <Text
        caps
        weight="3"
        style={{
            fontSize: 10,
            color: 'var(--tg-theme-hint-color)',
            textAlign: 'right',
            padding: '4px 8px'
        }}
    >
        {current} / {max}
    </Text>
);
