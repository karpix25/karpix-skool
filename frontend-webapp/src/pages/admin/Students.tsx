import React, { useCallback, useEffect, useMemo, useState } from 'react';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { MembersSection } from './students/MembersSection';
import { StudentsEmptyState } from './students/StudentsEmptyState';
import { StudentsHeader } from './students/StudentsHeader';
import { StudentsLoadingGrid } from './students/StudentsLoadingGrid';
import { StudentsStats } from './students/StudentsStats';
import { isManagementRole } from './students/studentRoles';
import type { Member } from './students/types';

export const Students: React.FC = () => {
    const [members, setMembers] = useState<Member[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const { activeTenantId, tenant, membership } = useAuth();
    const tenantId = activeTenantId || tenant?.id || membership?.tenant_id || null;

    const fetchMembers = useCallback(async () => {
        if (!tenantId) {
            setMembers([]);
            return;
        }

        setIsLoading(true);
        try {
            const res = await api.get<Member[]>(`/tenants/${tenantId}/members`);
            setMembers(Array.isArray(res.data) ? res.data : []);
        } catch (err) {
            console.error('Failed to fetch members:', err);
            setMembers([]);
        } finally {
            setIsLoading(false);
        }
    }, [tenantId]);

    useEffect(() => {
        void fetchMembers();
    }, [fetchMembers]);

    const filteredMembers = useMemo(() => {
        const normalizedSearch = searchTerm.trim().toLowerCase();
        if (!normalizedSearch) return members;

        return members.filter(member =>
            (member.username || '').toLowerCase().includes(normalizedSearch)
        );
    }, [members, searchTerm]);

    const adminMembers = useMemo(
        () => filteredMembers.filter(member => isManagementRole(member.role)),
        [filteredMembers],
    );
    const studentMembers = useMemo(
        () => filteredMembers.filter(member => !isManagementRole(member.role)),
        [filteredMembers],
    );
    const adminsCount = useMemo(
        () => members.filter(member => isManagementRole(member.role)).length,
        [members],
    );

    return (
        <div className="mx-auto w-full max-w-7xl space-y-8 px-5 pb-24 pt-6 animate-in fade-in duration-500 sm:px-6 md:px-10 md:pb-12 lg:space-y-10 lg:pt-10">
            <StudentsHeader searchTerm={searchTerm} onSearchTermChange={setSearchTerm} />
            <StudentsStats total={members.length} admins={adminsCount} />

            <div className="space-y-12">
                {isLoading ? (
                    <StudentsLoadingGrid />
                ) : (
                    <>
                        <MembersSection title="Админы" members={adminMembers} />
                        <MembersSection title="Студенты" members={studentMembers} />
                        {filteredMembers.length === 0 && <StudentsEmptyState />}
                    </>
                )}
            </div>
        </div>
    );
};
