import React from 'react';

import { AuthorsTab } from './super-admin/AuthorsTab';
import { BroadcastDialog } from './super-admin/BroadcastDialog';
import { DeleteSchoolDialog } from './super-admin/DeleteSchoolDialog';
import { GlobalTab } from './super-admin/GlobalTab';
import { LeadsTab } from './super-admin/LeadsTab';
import { MySchoolTab } from './super-admin/MySchoolTab';
import { NotebookLmAuthModal } from './super-admin/NotebookLmAuthModal';
import { SuperAdminHeader } from './super-admin/SuperAdminHeader';
import { SuperAdminLoading } from './super-admin/SuperAdminLoading';
import { TerminalTab } from './super-admin/TerminalTab';
import { Tab } from './super-admin/types';
import { useSuperAdmin } from './super-admin/useSuperAdmin';

export const SuperAdmin: React.FC = () => {
    const admin = useSuperAdmin();

    if (admin.isLoading) return <SuperAdminLoading />;

    return (
        <div className="min-h-dvh overflow-x-clip bg-background text-foreground selection:bg-primary/20">
            <SuperAdminHeader
                activeTab={admin.activeTab}
                onTabChange={admin.setActiveTab}
                onBroadcastOpen={() => admin.setBroadcastModal(true)}
            />

            <main className="mx-auto w-full max-w-6xl px-4 py-4 pb-28 sm:px-5 md:px-8 md:py-6">
                {admin.activeTab === Tab.TERMINAL && (
                    <TerminalTab
                        tenants={admin.tenants}
                        users={admin.users}
                        applications={admin.leads}
                        activity={admin.activity}
                        isActivityLoading={admin.isActivityLoading}
                        activityError={admin.activityError}
                        onRefreshActivity={admin.fetchActivity}
                        time={admin.time}
                    />
                )}
                {admin.activeTab === Tab.LEADS && (
                    <LeadsTab
                        leads={admin.leads}
                        isLoading={admin.isLeadsLoading}
                        error={admin.leadsError}
                        onRefresh={admin.fetchLeads}
                        onUpdateStatus={admin.updateLeadStatus}
                    />
                )}
                {admin.activeTab === Tab.GLOBAL && (
                    <GlobalTab
                        tenants={admin.filteredTenants}
                        activeTenantId={admin.activeTenantId}
                        search={admin.search}
                        onSearchChange={admin.setSearch}
                        onSelectTenant={admin.setActiveTenantId}
                        onDeleteTenant={(tenant) => admin.setDeleteModal({ show: true, tenant })}
                        generationSettings={admin.generationSettings}
                        isGenerationSettingsSaving={admin.isGenerationSettingsSaving}
                        isNotebookLmAuthLoading={admin.isNotebookLmAuthLoading}
                        generationSettingsError={admin.generationSettingsError}
                        onGenerationProviderChange={admin.updateGenerationProvider}
                        onNotebookLmAuthOpen={() => admin.openNotebookLmAuthModal(false)}
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
                {admin.activeTab === Tab.MY_SCHOOL && (
                    <MySchoolTab
                        school={admin.selectedTenant}
                        tenants={admin.tenants}
                        selectedTenantId={admin.activeTenantId}
                        onSelectTenant={admin.setActiveTenantId}
                        activity={admin.activity}
                        isActivityLoading={admin.isActivityLoading}
                        activityError={admin.activityError}
                        onRefreshActivity={admin.fetchActivity}
                    />
                )}
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

            <NotebookLmAuthModal
                open={admin.notebookLmAuthModalOpen}
                authState={admin.generationSettings?.google_notebooklm_auth}
                isLoading={admin.isNotebookLmAuthLoading}
                isProviderSaving={admin.isGenerationSettingsSaving}
                error={admin.notebookLmAuthError}
                shouldSwitchProviderAfterAuth={admin.pendingNotebookLmProviderSwitch}
                onOpenChange={admin.handleNotebookLmAuthModalOpenChange}
                onLogin={admin.loginNotebookLmAuthStatus}
                onRefresh={admin.refreshNotebookLmAuthStatus}
            />
        </div>
    );
};
