import { Heart } from 'lucide-react';

interface FavoriteButtonProps {
    active: boolean;
    pending?: boolean;
    onClick: () => void;
}

export const FavoriteButton = ({ active, pending = false, onClick }: FavoriteButtonProps) => (
    <button
        type="button"
        onClick={onClick}
        disabled={pending}
        aria-label={active ? 'Убрать из избранного' : 'Добавить в избранное'}
        aria-pressed={active}
        className="absolute left-2 top-2 z-10 inline-flex h-8 w-8 items-center justify-center rounded-full border border-border/70 bg-card/90 text-muted-foreground shadow-sm backdrop-blur transition-colors hover:text-primary disabled:cursor-wait disabled:opacity-60"
    >
        <Heart className={active ? 'fill-primary text-primary' : ''} size={15} />
    </button>
);
