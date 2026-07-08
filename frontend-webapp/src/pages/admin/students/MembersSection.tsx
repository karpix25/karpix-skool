import type { Member } from './types';
import { MemberCard } from './MemberCard';

interface MembersSectionProps {
    members: Member[];
    title: string;
}

export const MembersSection = ({ members, title }: MembersSectionProps) => {
    if (members.length === 0) return null;

    return (
        <section className="space-y-5">
            <div className="px-1">
                <h2 className="text-sm font-semibold text-muted-foreground">
                    {title} ({members.length})
                </h2>
            </div>
            <div className="grid auto-rows-fr grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
                {members.map(member => (
                    <MemberCard key={member.id} member={member} />
                ))}
            </div>
        </section>
    );
};
