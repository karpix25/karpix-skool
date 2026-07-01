import React from 'react';

import { AuthorsTab } from './super-admin/AuthorsTab';
import { BroadcastDialog } from './super-admin/BroadcastDialog';
import { DeleteSchoolDialog } from './super-admin/DeleteSchoolDialog';
import { GlobalTab } from './super-admin/GlobalTab';
import { MySchoolTab } from './super-admin/MySchoolTab';
import { SuperAdminHeader } from './super-admin/SuperAdminHeader';
import { SuperAdminLoading } from './super-admin/SuperAdminLoading';
import { TerminalTab } from './super-admin/TerminalTab';
import { Tab } from './super-admin/types';
import { useSuperAdmin } from './super-admin/useSuperAdmin';

export const SuperAdmin: React.FC = () => {
    const admin = useSuperAdmin();

    if (admin.isLoading) return <SuperAdminLoading />;

    return (
        <div className="min-h-screen bg-background-dark text-slate-100 font-display selection:bg-primary/30 pb-32 overflow-x-hidden">
            <SuperAdminHeader
                activeTab={admin.activeTab}
                onTabChange={admin.setActiveTab}
                onBroadcastOpen={() => admin.setBroadcastModal(true)}
            />

            <main className="max-w-7xl mx-auto px-4 md:px-12 py-6">
                {admin.activeTab === Tab.TERMINAL && (
                    <TerminalTab tenants={admin.tenants} users={admin.users} feed={admin.feed} time={admin.time} />
                )}
                {admin.activeTab === Tab.GLOBAL && (
                    <GlobalTab
                        tenants={admin.filteredTenants}
                        search={admin.search}
                        onSearchChange={admin.setSearch}
                        onToggleStatus={admin.toggleStatus}
                        onDeleteTenant={(tenant) => admin.setDeleteModal({ show: true, tenant })}
                    />
                )}
                {admin.activeTab === Tab.AUTHORS && (
                    <AuthorsTab
                        users={admin.users}
                        userSearch={admin.userSearch}
                        userFilter={admin.userFilter}
                        onUserSearchChange={admin.setUserSearch}
                        onUserFilterChange={admin.setUserFilter}
                        onUpdateUserStatus={admin.updateUserStatus}
                    />
                )}
                {admin.activeTab === Tab.MY_SCHOOL && <MySchoolTab school={admin.mySchool} />}
            </main>

            <DeleteSchoolDialog
                open={admin.deleteModal.show}
                tenant={admin.deleteModal.tenant}
                confirmName={admin.deleteConfirmName}
                isDeleting={admin.isDeleting}
                onOpenChange={() => admin.setDeleteModal({ show: false, tenant: null })}
                onConfirmNameChange={admin.setDeleteConfirmName}
                onConfirm={admin.handleDeleteConfirm}
            />

            <BroadcastDialog open={admin.broadcastModal} onOpenChange={admin.setBroadcastModal} />
        </div>
    );
};
