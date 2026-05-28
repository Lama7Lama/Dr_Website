import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { User, UserRole } from '../../types';

interface UserManagementViewProps {
  users: User[];
  doctors: User[];
  onToggleStatus: (id: string) => void | Promise<void>;
  onDelete: (id: string) => void | Promise<void>;
  onAdd: (user: User) => void | Promise<void>;
  onAssignDoctor: (patientId: string, doctorId: string | null) => void | Promise<void>;
}

const UserManagementView: React.FC<UserManagementViewProps> = ({
  users,
  doctors,
  onToggleStatus,
  onDelete,
  onAdd,
  onAssignDoctor
}) => {
  const { t } = useTranslation();
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<Partial<User>>({ role: UserRole.PATIENT, assignedDoctorId: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.role) return;
    await onAdd({
      id: `tmp-${Date.now()}`,
      name: formData.name,
      email: formData.email,
      role: formData.role,
      status: 'Active',
      registrationDate: new Date().toISOString().slice(0, 10),
      assignedDoctorId: formData.role === UserRole.PATIENT ? formData.assignedDoctorId || undefined : undefined
    });
    setShowForm(false);
    setFormData({ role: UserRole.PATIENT, assignedDoctorId: '' });
  };

  const doctorNameById = new Map(doctors.map((doctor) => [doctor.id, doctor.name]));

  return (
    <div className="space-y-6">
      <section className="premium-card surface-glow rounded-[32px] px-6 py-6 md:px-8">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="premium-kicker">{t('admin.usersTitle')}</p>
            <h3 className="premium-title mt-3 text-4xl md:text-5xl">{t('admin.usersTitle')}</h3>
          </div>
          <button onClick={() => setShowForm(true)} className="premium-button-primary px-5 py-3 text-sm">
            {t('admin.newUser')}
          </button>
        </div>
      </section>

      <div className="premium-card rounded-[30px] p-3 md:p-4">
        <div className="overflow-auto">
          <table className="premium-table min-w-full text-left">
            <thead>
              <tr>
                <th>{t('admin.fullName')}</th>
                <th>{t('admin.role')}</th>
                <th>{t('admin.assignedDoctor')}</th>
                <th>{t('common.status')}</th>
                <th>{t('admin.registration')}</th>
                <th className="text-right">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>
                    <p className="text-sm font-bold text-[#071952]">{u.name}</p>
                    <p className="mt-1 text-[11px] text-[rgba(8,6,22,0.42)]">{u.email}</p>
                  </td>
                  <td className="text-sm font-semibold text-[#071952]">{t(`roles.${u.role}`)}</td>
                  <td>
                    {u.role === UserRole.PATIENT ? (
                      <select
                        value={u.assignedDoctorId || ''}
                        className="premium-select min-w-[180px] py-2 text-xs"
                        onChange={(e) => onAssignDoctor(u.id, e.target.value || null)}
                      >
                        <option value="">{t('admin.unassigned')}</option>
                        {doctors.map((doctor) => (
                          <option key={doctor.id} value={doctor.id}>
                            {doctor.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className="text-sm text-[rgba(8,6,22,0.42)]">-</span>
                    )}
                    {u.role === UserRole.PATIENT && u.assignedDoctorId && (
                      <p className="mt-2 text-[11px] text-[rgba(8,6,22,0.42)]">
                        {doctorNameById.get(u.assignedDoctorId) || t('admin.unassigned')}
                      </p>
                    )}
                  </td>
                  <td>
                    <button
                      onClick={() => onToggleStatus(u.id)}
                      className={`rounded-full px-3 py-1 text-[11px] font-bold ${
                        u.status === 'Active' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                      }`}
                    >
                      {u.status}
                    </button>
                  </td>
                  <td className="text-sm text-[rgba(8,6,22,0.48)]">{u.registrationDate}</td>
                  <td className="text-right">
                    <button onClick={() => onDelete(u.id)} className="rounded-[16px] border border-red-100 bg-red-50 px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-100">
                      {t('common.delete')}
                    </button>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-[rgba(8,6,22,0.42)]">{t('common.noData')}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/35 p-4 backdrop-blur-sm md:p-6">
          <div className="flex min-h-full items-center justify-center">
            <form onSubmit={handleSubmit} className="premium-card max-h-[88vh] w-full max-w-md overflow-y-auto rounded-[30px] p-7">
            <p className="premium-kicker">{t('admin.createUser')}</p>
            <h3 className="premium-title mt-2 text-3xl">{t('admin.createUser')}</h3>
            <div className="mt-5 space-y-3">
              <input
                required
                placeholder={t('admin.fullName')}
                className="premium-input"
                value={formData.name || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
              <input
                required
                type="email"
                placeholder={t('admin.email')}
                className="premium-input"
                value={formData.email || ''}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
              <select
                value={formData.role}
                className="premium-select"
                onChange={(e) => setFormData({
                  ...formData,
                  role: e.target.value as UserRole,
                  assignedDoctorId: e.target.value === UserRole.PATIENT ? formData.assignedDoctorId || '' : ''
                })}
              >
                <option value={UserRole.PATIENT}>{t('roles.PATIENT')}</option>
                <option value={UserRole.DOCTOR}>{t('roles.DOCTOR')}</option>
                <option value={UserRole.ADMIN}>{t('roles.ADMIN')}</option>
              </select>
              {formData.role === UserRole.PATIENT && (
                <select
                  value={formData.assignedDoctorId || ''}
                  className="premium-select"
                  onChange={(e) => setFormData({ ...formData, assignedDoctorId: e.target.value })}
                >
                  <option value="">{t('admin.unassigned')}</option>
                  {doctors.map((doctor) => (
                    <option key={doctor.id} value={doctor.id}>
                      {doctor.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button type="button" onClick={() => setShowForm(false)} className="premium-button-secondary flex-1 py-3 text-sm">
                {t('common.cancel')}
              </button>
              <button type="submit" className="premium-button-primary flex-1 py-3 text-sm">
                {t('admin.createAccount')}
              </button>
            </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagementView;
