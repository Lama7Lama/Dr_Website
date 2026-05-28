import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { encodeFollowUpPlan, decodeFollowUpPlan, FollowUpPlanStatus, isFollowUpPlanMessage } from '../services/followUpPlan';
import { Message, User, UserRole } from '../types';

interface MessagesViewProps {
  currentUser: User;
  messages: Message[];
  users: User[];
  defaultRecipientId?: string;
  onSendMessage: (receiverId: string, subject: string, content: string) => Promise<void>;
  onMarkAsRead: (messageId: string) => Promise<void>;
  onDeleteMessage?: (message: Message) => Promise<void>;
}

interface EnrichedPlanMessage extends Message {
  counterpartyId: string;
  counterpartyName: string;
  plan: {
    description: string;
    nextFollowUpDate: string;
    status: FollowUpPlanStatus;
  };
}

const MessagesView: React.FC<MessagesViewProps> = ({
  currentUser,
  messages,
  users,
  defaultRecipientId,
  onSendMessage,
  onMarkAsRead,
  onDeleteMessage
}) => {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === 'ar';
  const isDoctor = currentUser.role === UserRole.DOCTOR;

  const userNameById = useMemo(() => {
    const map = new Map<string, string>();
    users.forEach((item) => map.set(item.id, item.name));
    map.set(currentUser.id, currentUser.name);
    return map;
  }, [currentUser.id, currentUser.name, users]);

  const recipientOptions = useMemo(() => {
    if (isDoctor) {
      return users.filter((item) => item.role === UserRole.PATIENT);
    }
    return users.filter((item) => item.role === UserRole.DOCTOR && (!currentUser.assignedDoctorId || item.id === currentUser.assignedDoctorId));
  }, [currentUser.assignedDoctorId, isDoctor, users]);

  const planMessages = useMemo<EnrichedPlanMessage[]>(() => {
    return messages
      .filter((item) => isFollowUpPlanMessage(item.content))
      .map((item) => {
        const plan = decodeFollowUpPlan(item.content);
        if (!plan) return null;

        const counterpartyId = item.senderId === currentUser.id ? item.receiverId : item.senderId;
        return {
          ...item,
          counterpartyId,
          counterpartyName: userNameById.get(counterpartyId) || item.senderName || counterpartyId,
          plan
        };
      })
      .filter((item): item is EnrichedPlanMessage => Boolean(item))
      .sort((left, right) => new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime());
  }, [currentUser.id, messages, userNameById]);

  const initialRecipientId = useMemo(() => {
    if (defaultRecipientId) return defaultRecipientId;
    if (planMessages[0]) return planMessages[0].counterpartyId;
    return recipientOptions[0]?.id || '';
  }, [defaultRecipientId, planMessages, recipientOptions]);

  const [recipientId, setRecipientId] = useState(initialRecipientId);
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [nextFollowUpDate, setNextFollowUpDate] = useState('');
  const [status, setStatus] = useState<FollowUpPlanStatus>('scheduled');
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [isPreviousOpen, setIsPreviousOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setRecipientId(initialRecipientId);
  }, [initialRecipientId]);

  const filteredPlans = useMemo(() => {
    if (!recipientId) return planMessages;
    return planMessages.filter((item) => item.counterpartyId === recipientId);
  }, [planMessages, recipientId]);

  useEffect(() => {
    if (!filteredPlans.length) {
      setSelectedPlanId('');
      return;
    }

    const hasSelected = filteredPlans.some((item) => item.id === selectedPlanId);
    if (!hasSelected) {
      setSelectedPlanId(filteredPlans[0].id);
    }
  }, [filteredPlans, selectedPlanId]);

  const selectedPlan = useMemo(() => {
    if (!selectedPlanId) return filteredPlans[0] || null;
    return filteredPlans.find((item) => item.id === selectedPlanId) || filteredPlans[0] || null;
  }, [filteredPlans, selectedPlanId]);

  const previousPlans = useMemo(() => {
    if (!selectedPlan) return filteredPlans;
    return filteredPlans.filter((item) => item.id !== selectedPlan.id);
  }, [filteredPlans, selectedPlan]);

  useEffect(() => {
    if (!selectedPlan || selectedPlan.isRead || selectedPlan.receiverId !== currentUser.id) return;
    void onMarkAsRead(selectedPlan.id);
  }, [currentUser.id, onMarkAsRead, selectedPlan]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!isDoctor || !recipientId || !subject.trim() || !description.trim() || !nextFollowUpDate) return;

    setIsSubmitting(true);
    try {
      await onSendMessage(
        recipientId,
        subject.trim(),
        encodeFollowUpPlan({
          description: description.trim(),
          nextFollowUpDate,
          status
        })
      );
      setSubject('');
      setDescription('');
      setNextFollowUpDate('');
      setStatus('scheduled');
    } finally {
      setIsSubmitting(false);
    }
  };

  const exportPlanPdf = (planMessage: EnrichedPlanMessage) => {
    const popup = window.open('', '_blank', 'width=960,height=720');
    if (!popup) return;

    const direction = isArabic ? 'rtl' : 'ltr';
    const translatedStatus = t(`messages.planStatuses.${planMessage.plan.status}`);
    const sentLabel = new Date(planMessage.timestamp).toLocaleString();
    const counterpartLabel = isDoctor ? t('messages.to') : t('messages.from');
    const html = `
      <!doctype html>
      <html lang="${i18n.language}" dir="${direction}">
        <head>
          <meta charset="utf-8" />
          <title>${escapeHtml(planMessage.subject)}</title>
          <style>
            body {
              margin: 0;
              padding: 40px;
              font-family: ${isArabic ? 'Calibri, sans-serif' : '"Bricolage Grotesque", sans-serif'};
              background: #fbf9f1;
              color: #071952;
            }
            .sheet {
              max-width: 900px;
              margin: 0 auto;
              background: #ffffff;
              border-radius: 24px;
              padding: 36px;
              box-shadow: 0 24px 60px rgba(7,25,82,0.08);
            }
            .kicker {
              font-size: 12px;
              letter-spacing: 0.18em;
              text-transform: uppercase;
              color: #176b87;
              margin-bottom: 10px;
              font-weight: 700;
            }
            h1 {
              font-size: 34px;
              margin: 0 0 18px;
            }
            .grid {
              display: grid;
              grid-template-columns: repeat(2, minmax(0, 1fr));
              gap: 16px;
              margin: 24px 0;
            }
            .card {
              background: #f6f8fc;
              border: 1px solid rgba(7,25,82,0.08);
              border-radius: 18px;
              padding: 18px;
            }
            .label {
              font-size: 12px;
              color: rgba(7,25,82,0.58);
              margin-bottom: 8px;
            }
            .value {
              font-size: 16px;
              font-weight: 700;
            }
            .description {
              white-space: pre-wrap;
              line-height: 1.9;
              font-size: 15px;
            }
            @media print {
              body {
                background: #ffffff;
                padding: 0;
              }
              .sheet {
                box-shadow: none;
                border-radius: 0;
              }
            }
          </style>
        </head>
        <body>
          <section class="sheet">
            <p class="kicker">${escapeHtml(t('messages.messageCenter'))}</p>
            <h1>${escapeHtml(planMessage.subject)}</h1>
            <div class="grid">
              <div class="card">
                <div class="label">${escapeHtml(counterpartLabel)}</div>
                <div class="value">${escapeHtml(planMessage.counterpartyName)}</div>
              </div>
              <div class="card">
                <div class="label">${escapeHtml(t('messages.planStatus'))}</div>
                <div class="value">${escapeHtml(translatedStatus)}</div>
              </div>
              <div class="card">
                <div class="label">${escapeHtml(t('messages.nextFollowUpDate'))}</div>
                <div class="value">${escapeHtml(formatDate(planMessage.plan.nextFollowUpDate, i18n.language))}</div>
              </div>
              <div class="card">
                <div class="label">${escapeHtml(t('messages.sent'))}</div>
                <div class="value">${escapeHtml(sentLabel)}</div>
              </div>
            </div>
            <div class="card">
              <div class="label">${escapeHtml(t('messages.planDescription'))}</div>
              <div class="description">${escapeHtml(planMessage.plan.description)}</div>
            </div>
          </section>
          <script>window.print();</script>
        </body>
      </html>
    `;

    popup.document.open();
    popup.document.write(html);
    popup.document.close();
  };

  const summaryCards = [
    {
      label: t('messages.previousPlans'),
      value: String(filteredPlans.length)
    },
    {
      label: t('messages.planStatus'),
      value: selectedPlan ? t(`messages.planStatuses.${selectedPlan.plan.status}`) : '-'
    },
    {
      label: t('messages.nextFollowUpDate'),
      value: selectedPlan ? formatDate(selectedPlan.plan.nextFollowUpDate, i18n.language) : '-'
    }
  ];

  const isNextFollowUpSoon = selectedPlan ? isDateWithinDays(selectedPlan.plan.nextFollowUpDate, 7) : false;

  return (
    <div className="space-y-6">
      <section className="premium-card surface-glow rounded-[34px] px-6 py-6 md:px-8 md:py-8">
        <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr] xl:items-end">
          <div>
            <p className="premium-kicker">{t('messages.messageCenter')}</p>
            <h3 className="premium-title mt-3 text-4xl md:text-5xl">{isDoctor ? t('layout.followUpPlan') : t('layout.followUpPlans')}</h3>
            <p className="premium-subtitle mt-4 max-w-3xl text-sm md:text-base">
              {isDoctor ? t('messages.emptyText') : t('patient.messageHint')}
            </p>
          </div>

          {isDoctor ? (
            <div className="grid gap-3 sm:grid-cols-3">
              {summaryCards.map((card) => (
                <div key={card.label} className="premium-card-soft rounded-[24px] px-4 py-4">
                  <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[rgba(8,6,22,0.42)]">{card.label}</p>
                  <p className="mt-3 text-sm font-semibold text-[#071952]">{card.value}</p>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </section>

      {isDoctor ? (
      <div className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
        <aside className="space-y-6">
          <section className="premium-card rounded-[30px] p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="premium-kicker">{isDoctor ? t('messages.recipient') : t('patient.assignedDoctor')}</p>
                <h4 className="premium-title mt-2 text-2xl">{isDoctor ? t('messages.selectRecipient') : t('layout.followUpPlans')}</h4>
              </div>
              <span className="premium-badge">{recipientOptions.length}</span>
            </div>

            <div className="space-y-3">
              {recipientOptions.map((item) => {
                const userPlans = planMessages.filter((plan) => plan.counterpartyId === item.id);
                const isSelected = item.id === recipientId;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setRecipientId(item.id)}
                    className={`w-full rounded-[22px] border px-4 py-4 text-start transition duration-200 ${
                      isSelected
                        ? 'border-[rgba(23,107,135,0.18)] bg-[linear-gradient(135deg,rgba(210,224,251,0.64),rgba(255,255,255,0.94))] shadow-[0_18px_42px_rgba(7,25,82,0.08)]'
                        : 'border-[rgba(7,25,82,0.08)] bg-white/70 hover:border-[rgba(23,107,135,0.16)] hover:bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-[#071952]">{item.name}</p>
                        <p className="mt-1 text-xs text-[rgba(8,6,22,0.5)]">{item.email}</p>
                      </div>
                      <span className="premium-badge">{userPlans.length}</span>
                    </div>
                  </button>
                );
              })}

              {recipientOptions.length === 0 && (
                <div className="premium-empty rounded-[22px] px-4 py-5 text-sm text-[rgba(8,6,22,0.5)]">
                  {t('messages.emptyText')}
                </div>
              )}
            </div>
          </section>

          {isDoctor && (
            <section className="premium-card rounded-[30px] p-5 md:p-6">
              <div className="mb-5">
                <p className="premium-kicker">{t('messages.newMessage')}</p>
                <h4 className="premium-title mt-2 text-2xl">{t('messages.newMessage')}</h4>
              </div>

              <form className="space-y-4" onSubmit={handleSubmit}>
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="space-y-2">
                    <span className="text-sm font-semibold text-[#071952]">{t('messages.subject')}</span>
                    <input
                      value={subject}
                      onChange={(event) => setSubject(event.target.value)}
                      className="premium-input"
                      placeholder={t('messages.subject')}
                    />
                  </label>

                  <label className="space-y-2">
                    <span className="text-sm font-semibold text-[#071952]">{t('messages.nextFollowUpDate')}</span>
                    <input
                      type="date"
                      value={nextFollowUpDate}
                      onChange={(event) => setNextFollowUpDate(event.target.value)}
                      className="premium-input"
                    />
                  </label>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <label className="space-y-2">
                    <span className="text-sm font-semibold text-[#071952]">{t('messages.selectRecipient')}</span>
                    <select
                      value={recipientId}
                      onChange={(event) => setRecipientId(event.target.value)}
                      className="premium-input"
                    >
                      <option value="">{t('messages.selectRecipient')}</option>
                      {recipientOptions.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="space-y-2">
                    <span className="text-sm font-semibold text-[#071952]">{t('messages.planStatus')}</span>
                    <select
                      value={status}
                      onChange={(event) => setStatus(event.target.value as FollowUpPlanStatus)}
                      className="premium-input"
                    >
                      <option value="scheduled">{t('messages.planStatuses.scheduled')}</option>
                      <option value="monitoring">{t('messages.planStatuses.monitoring')}</option>
                      <option value="completed">{t('messages.planStatuses.completed')}</option>
                      <option value="urgent">{t('messages.planStatuses.urgent')}</option>
                    </select>
                  </label>
                </div>

                <label className="space-y-2">
                  <span className="text-sm font-semibold text-[#071952]">{t('messages.planDescription')}</span>
                  <textarea
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    className="premium-input min-h-[150px] resize-y"
                    placeholder={t('messages.content')}
                  />
                </label>

                <button
                  type="submit"
                  disabled={isSubmitting || !recipientId || !subject.trim() || !description.trim() || !nextFollowUpDate}
                  className="premium-button-primary w-full px-5 py-3 text-sm disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting ? t('common.loading') : t('messages.send')}
                </button>
              </form>
            </section>
          )}
        </aside>

        <div className="space-y-6">
          <section className="premium-card rounded-[30px] p-5 md:p-6">
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="premium-kicker">{t('messages.planPreview')}</p>
                <h4 className="premium-title mt-2 text-2xl">{selectedPlan?.subject || t('messages.emptyTitle')}</h4>
                {selectedPlan ? (
                  <p className="mt-2 text-xs text-[rgba(8,6,22,0.48)]">
                    {t('messages.sent')} • {new Date(selectedPlan.timestamp).toLocaleString()}
                  </p>
                ) : null}
              </div>

              {selectedPlan ? (
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => exportPlanPdf(selectedPlan)}
                    className="premium-button-secondary px-4 py-3 text-xs"
                  >
                    {t('messages.downloadPdf')}
                  </button>
                  {onDeleteMessage ? (
                    <button
                      type="button"
                      onClick={() => void onDeleteMessage(selectedPlan)}
                      className="rounded-2xl border border-[rgba(239,68,68,0.16)] bg-[rgba(239,68,68,0.08)] px-4 py-3 text-xs font-semibold text-[#b42318] transition hover:bg-[rgba(239,68,68,0.12)]"
                    >
                      {t('common.delete')}
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>

            {selectedPlan ? (
              <div className="grid gap-4 md:grid-cols-2">
                <PlanMetaCard label={isDoctor ? t('messages.to') : t('messages.from')} value={selectedPlan.counterpartyName} />
                <PlanMetaCard label={t('messages.planStatus')} value={t(`messages.planStatuses.${selectedPlan.plan.status}`)} />
                <PlanMetaCard label={t('messages.nextFollowUpDate')} value={formatDate(selectedPlan.plan.nextFollowUpDate, i18n.language)} />
                <PlanMetaCard label={t('messages.recipientId')} value={selectedPlan.counterpartyId} />

                <div className="premium-card-soft rounded-[24px] p-5 md:col-span-2">
                  <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[rgba(8,6,22,0.42)]">{t('messages.planDescription')}</p>
                  <p className="mt-4 whitespace-pre-wrap text-sm leading-8 text-[rgba(8,6,22,0.72)]">
                    {selectedPlan.plan.description}
                  </p>
                </div>
              </div>
            ) : (
              <div className="premium-empty rounded-[24px] px-5 py-10 text-sm text-[rgba(8,6,22,0.52)]">
                {t('messages.emptyText')}
              </div>
            )}
          </section>

          <section className="premium-card rounded-[30px] p-5 md:p-6">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="premium-kicker">{t('messages.previousPlans')}</p>
                <h4 className="premium-title mt-2 text-2xl">{t('messages.previousPlans')}</h4>
              </div>
              <span className="premium-badge">{filteredPlans.length}</span>
            </div>

            <div className="grid gap-4">
              {filteredPlans.map((message) => {
                const isSelected = message.id === selectedPlan?.id;
                return (
                  <button
                    type="button"
                    key={message.id}
                    onClick={() => setSelectedPlanId(message.id)}
                    className={`rounded-[24px] border px-5 py-4 text-start transition duration-200 ${
                      isSelected
                        ? 'border-[rgba(23,107,135,0.18)] bg-[linear-gradient(135deg,rgba(210,224,251,0.56),rgba(255,255,255,0.96))] shadow-[0_18px_40px_rgba(7,25,82,0.08)]'
                        : 'border-[rgba(7,25,82,0.08)] bg-white/70 hover:border-[rgba(23,107,135,0.14)] hover:bg-white'
                    }`}
                  >
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-semibold text-[#071952]">{message.subject}</span>
                          {!message.isRead && message.receiverId === currentUser.id ? (
                            <span className="premium-badge">{t('messages.unread')}</span>
                          ) : null}
                        </div>
                        <p className="text-xs text-[rgba(8,6,22,0.5)]">{new Date(message.timestamp).toLocaleString()}</p>
                        <p className="line-clamp-2 text-sm leading-7 text-[rgba(8,6,22,0.66)]">{message.plan.description}</p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 md:justify-end">
                        <span className={statusBadgeClass(message.plan.status)}>
                          {t(`messages.planStatuses.${message.plan.status}`)}
                        </span>
                        <span className="premium-badge">{formatDate(message.plan.nextFollowUpDate, i18n.language)}</span>
                      </div>
                    </div>
                  </button>
                );
              })}

              {filteredPlans.length === 0 && (
                <div className="premium-empty rounded-[24px] px-5 py-10 text-sm text-[rgba(8,6,22,0.52)]">
                  {recipientId ? t('messages.emptyText') : t('messages.selectRecipient')}
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
      ) : (
        <div className="space-y-6" dir={isArabic ? 'rtl' : 'ltr'}>
          <section className="grid gap-3 md:grid-cols-3">
            <button
              type="button"
              onClick={() => setIsPreviousOpen((prev) => !prev)}
              className={`premium-card-soft rounded-[24px] px-4 py-4 text-start transition duration-200 hover:-translate-y-0.5 ${
                isPreviousOpen ? 'border border-[rgba(23,107,135,0.16)] bg-[rgba(210,224,251,0.42)] shadow-[0_16px_34px_rgba(7,25,82,0.08)]' : ''
              }`}
            >
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[rgba(8,6,22,0.42)]">{t('messages.previousPlans')}</p>
              <div className="mt-3 flex items-center justify-between gap-3">
                <span className="text-sm font-semibold text-[#071952]">{previousPlans.length}</span>
                <span className="premium-badge">{isPreviousOpen ? t('messages.collapse') : t('messages.expand')}</span>
              </div>
            </button>

            <div className="premium-card-soft rounded-[24px] px-4 py-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[rgba(8,6,22,0.42)]">{t('messages.planStatus')}</p>
              <div className="mt-3 flex items-center justify-between gap-3">
                <span className={statusBadgeClass(selectedPlan?.plan.status || 'scheduled')}>
                  {selectedPlan ? t(`messages.planStatuses.${selectedPlan.plan.status}`) : '-'}
                </span>
              </div>
            </div>

            <div className={`premium-card-soft rounded-[24px] px-4 py-4 ${isNextFollowUpSoon ? 'motion-safe:animate-pulse' : ''}`}>
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[rgba(8,6,22,0.42)]">{t('messages.nextFollowUpDate')}</p>
              <div className="mt-3 flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[rgba(23,107,135,0.1)] text-[#176B87]">
                  <CalendarGlyph />
                </span>
                <span className="text-sm font-semibold text-[#071952]">
                  {selectedPlan ? formatDate(selectedPlan.plan.nextFollowUpDate, i18n.language) : '-'}
                </span>
              </div>
            </div>
          </section>

          <section className="premium-card rounded-[30px] p-5 md:p-6">
            {selectedPlan ? (
              <div className="space-y-5">
                <div>
                  <p className="premium-kicker">{t('messages.planPreview')}</p>
                  <h4 className={`premium-title mt-2 text-3xl ${isArabic ? 'text-right' : ''}`}>{selectedPlan.subject}</h4>
                  <p className="mt-2 text-xs text-[rgba(8,6,22,0.48)]">
                    {t('messages.sent')} • {new Date(selectedPlan.timestamp).toLocaleString()}
                  </p>
                </div>

                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div className="premium-card-soft rounded-[22px] px-4 py-4">
                    <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[rgba(8,6,22,0.42)]">{t('messages.from')}</p>
                    <p className="mt-2 text-sm font-semibold text-[#071952]">{selectedPlan.counterpartyName}</p>
                  </div>
                  <span className={statusBadgeClass(selectedPlan.plan.status)}>
                    {t(`messages.planStatuses.${selectedPlan.plan.status}`)}
                  </span>
                </div>

                <div className={`rounded-[24px] border px-4 py-4 ${isNextFollowUpSoon ? 'border-[rgba(245,158,11,0.28)] bg-[rgba(245,158,11,0.08)]' : 'border-[rgba(23,107,135,0.12)] bg-[rgba(210,224,251,0.22)]'}`}>
                  <div className="flex items-center gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/78 text-[#176B87]">
                      <CalendarGlyph />
                    </span>
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[rgba(8,6,22,0.42)]">{t('messages.nextFollowUpDate')}</p>
                      <p className="mt-1 text-base font-bold text-[#071952]">{formatDate(selectedPlan.plan.nextFollowUpDate, i18n.language)}</p>
                    </div>
                  </div>
                </div>

                <div className="premium-card-soft rounded-[24px] p-5">
                  <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[rgba(8,6,22,0.42)]">{t('messages.planDescription')}</p>
                  <p className={`mt-4 whitespace-pre-wrap text-sm leading-8 text-[rgba(8,6,22,0.72)] ${isArabic ? 'text-right' : ''}`}>
                    {selectedPlan.plan.description}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => exportPlanPdf(selectedPlan)}
                  className="premium-button-primary w-full px-5 py-4 text-sm"
                >
                  {t('messages.downloadPdf')}
                </button>
              </div>
            ) : (
              <div className="premium-empty rounded-[24px] px-5 py-10 text-sm text-[rgba(8,6,22,0.52)]">
                {t('patient.noRecentMessages')}
              </div>
            )}
          </section>

          <section className="premium-card rounded-[30px] p-5 md:p-6">
            <button
              type="button"
              onClick={() => setIsPreviousOpen((prev) => !prev)}
              className="flex w-full items-center justify-between gap-3 text-start"
            >
              <div>
                <p className="premium-kicker">{t('messages.previousPlans')}</p>
                <h4 className="premium-title mt-2 text-2xl">
                  {t('messages.previousPlans')} ({previousPlans.length})
                </h4>
              </div>
              <span className="premium-badge">{isPreviousOpen ? t('messages.collapse') : t('messages.expand')}</span>
            </button>

            {isPreviousOpen ? (
              previousPlans.length > 0 ? (
                <div className="mt-6 space-y-4">
                  {previousPlans.map((message, index) => (
                    <div key={message.id} className={`relative ${isArabic ? 'pr-7' : 'pl-7'}`}>
                      <span className={`absolute top-2 h-3 w-3 rounded-full bg-[#176B87] ${isArabic ? 'right-0' : 'left-0'}`} />
                      {index !== previousPlans.length - 1 ? (
                        <span className={`absolute top-5 h-[calc(100%+12px)] w-px bg-[rgba(23,107,135,0.18)] ${isArabic ? 'right-[5px]' : 'left-[5px]'}`} />
                      ) : null}
                      <div className="premium-card-soft rounded-[22px] px-4 py-4">
                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                          <div className="space-y-2">
                            <p className="text-xs text-[rgba(8,6,22,0.48)]">{new Date(message.timestamp).toLocaleString()}</p>
                            <p className="text-sm font-semibold text-[#071952]">{message.counterpartyName}</p>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={statusBadgeClass(message.plan.status)}>
                              {t(`messages.planStatuses.${message.plan.status}`)}
                            </span>
                            <button
                              type="button"
                              onClick={() => setSelectedPlanId(message.id)}
                              className="premium-button-secondary px-4 py-2 text-xs"
                            >
                              {t('common.view')}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="premium-empty mt-6 rounded-[24px] px-5 py-10 text-sm text-[rgba(8,6,22,0.52)]">
                  {t('patient.noRecentMessages')}
                </div>
              )
            ) : null}
          </section>
        </div>
      )}
    </div>
  );
};

const PlanMetaCard: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="premium-card-soft rounded-[24px] p-5">
    <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[rgba(8,6,22,0.42)]">{label}</p>
    <p className="mt-4 text-sm font-semibold text-[#071952]">{value || '-'}</p>
  </div>
);

function formatDate(value: string, locale: string) {
  if (!value) return '-';
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-SA' : 'en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }).format(parsed);
}

function statusBadgeClass(status: FollowUpPlanStatus) {
  if (status === 'urgent') return 'rounded-full bg-[rgba(239,68,68,0.12)] px-3 py-1 text-xs font-semibold text-[#b42318]';
  if (status === 'completed') return 'rounded-full bg-[rgba(107,114,128,0.14)] px-3 py-1 text-xs font-semibold text-[#4b5563]';
  if (status === 'monitoring') return 'rounded-full bg-[rgba(245,158,11,0.14)] px-3 py-1 text-xs font-semibold text-[#b45309]';
  return 'rounded-full bg-[rgba(210,224,251,0.82)] px-3 py-1 text-xs font-semibold text-[#071952]';
}

function isDateWithinDays(value: string, days: number) {
  if (!value) return false;
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = parsed.getTime() - today.getTime();
  const diffDays = Math.ceil(diff / (1000 * 60 * 60 * 24));
  return diffDays >= 0 && diffDays <= days;
}

const CalendarGlyph: React.FC = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
    <rect x="3.5" y="5" width="17" height="15" rx="3" />
    <path d="M8 3.5v4" />
    <path d="M16 3.5v4" />
    <path d="M3.5 9.5h17" />
  </svg>
);

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export default MessagesView;
