import { WorkspaceAccess } from '@/components/workspace-access';
import { getTranslations } from 'next-intl/server';
import { session, createClient } from '@/lib/supabase/server';
import { getSelectedDestination } from '@/lib/destination-context/server';
import { checked, localizedText } from '@/lib/data';
import { destinationId } from '@/lib/catalog';
import { ActionForm } from '@/components/action-form';
export const metadata = { robots: { index: false, follow: false } };
export default async function Hotel({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const [t, user, selected] = await Promise.all([
    getTranslations(),
    session(),
    getSelectedDestination(),
  ]);
  if (!user)
    return (
      <WorkspaceAccess locale={locale} title={t('hotelTitle')} body={t('hotelBody')} kind="hotel" />
    );
  const db = await createClient();
  const orgs = checked(
    await db
      .from('organizations')
      .select('id,name,status')
      .eq('kind', 'hotel')
      .eq('destination_id', selected?.id ?? destinationId),
  );
  const [reservations, submissions, venues] = await Promise.all([
    db
      .from('hotel_reservations')
      .select('*')
      .in(
        'organization_id',
        orgs.map((org) => org.id),
      )
      .order('arrival'),
    db
      .from('precheckin_submissions')
      .select('*')
      .in(
        'organization_id',
        orgs.map((org) => org.id),
      ),
    db
      .from('venues')
      .select('id,name,organization_id,stamp_definitions(id,name)')
      .in(
        'organization_id',
        orgs.map((o) => o.id),
      ),
  ]);
  const rows = checked(reservations);
  const guests = checked(submissions);
  const places = checked(venues);
  return (
    <section className="section workspace-page">
      <div className="page-heading">
        <h1>{t('hotelTitle')}</h1>
        <p>{t('hotelBody')}</p>
        {selected ? (
          <p>
            {t('destinationContext.hotelScope', {
              destination: localizedText(selected.names, locale),
            })}
          </p>
        ) : null}
      </div>
      <details className="onboarding" open={!orgs.length}>
        <summary>{t('newHotel')}</summary>
        <ActionForm locale={locale} command="create_hotel" label={t('newHotel')}>
          <input type="hidden" name="destination_id" value={selected?.id ?? destinationId} />
          <label>
            {t('hotelName')}
            <input name="name" required minLength={2} maxLength={120} />
          </label>
        </ActionForm>
      </details>
      {orgs.map((org) => (
        <div className="hotel-section" key={org.id}>
          <h2>{org.name}</h2>
          {org.status === 'pending' && <p className="notice">{t('pendingApproval')}</p>}
          <details className="reservation-create">
            <summary>{t('newReservation')}</summary>
            <ActionForm locale={locale} command="create_reservation" label={t('newReservation')}>
              <input type="hidden" name="organization_id" value={org.id} />
              <div className="form-grid">
                <label>
                  {t('reference')}
                  <input name="reference" required minLength={2} maxLength={60} />
                </label>
                <label>
                  {t('fields.email')}
                  <input name="email" type="email" required maxLength={254} />
                </label>
                <label>
                  {t('arrival')}
                  <input name="arrival" type="date" required />
                </label>
                <label>
                  {t('departure')}
                  <input name="departure" type="date" required />
                </label>
                <label>
                  {t('guestCount')}
                  <input
                    name="guest_count"
                    type="number"
                    min={1}
                    max={20}
                    defaultValue={1}
                    required
                  />
                </label>
              </div>
            </ActionForm>
          </details>
          <h3>{t('arrivals')}</h3>
          {!rows.some((r) => r.organization_id === org.id) && <p>{t('noReservations')}</p>}
          {rows
            .filter((r) => r.organization_id === org.id)
            .map((r) => {
              const guest = guests.find((g) => g.reservation_id === r.id);
              const next: Record<string, string> = {
                submitted: 'reviewed',
                reviewed: 'ready_for_arrival',
                ready_for_arrival: 'completed',
              };
              const labels: Record<string, string> = {
                submitted: 'review',
                reviewed: 'ready',
                ready_for_arrival: 'complete',
              };
              return (
                <article className="reservation" key={r.id}>
                  <div className="reservation-title">
                    <h3>{r.reference}</h3>
                    <span className="tag">{t(`statuses.${r.status}`)}</span>
                  </div>
                  <p>
                    {new Intl.DateTimeFormat(locale, {
                      dateStyle: 'medium',
                      timeZone: 'UTC',
                    }).format(new Date(r.arrival + 'T12:00:00Z'))}{' '}
                    · {r.guest_count} {t('guestCount')}
                  </p>
                  <p>{r.guest_email}</p>
                  <div className="reservation-actions">
                    {r.status === 'invited' && (
                      <ActionForm locale={locale} command="issue_invitation" label={t('invite')}>
                        <input type="hidden" name="reservation_id" value={r.id} />
                      </ActionForm>
                    )}
                    {next[r.status] && (
                      <ActionForm
                        locale={locale}
                        command="review_reservation"
                        label={t(labels[r.status])}
                      >
                        <input type="hidden" name="reservation_id" value={r.id} />
                        <input type="hidden" name="status" value={next[r.status]} />
                      </ActionForm>
                    )}
                    {!['completed', 'cancelled'].includes(r.status) && (
                      <ActionForm locale={locale} command="review_reservation" label={t('cancel')}>
                        <input type="hidden" name="reservation_id" value={r.id} />
                        <input type="hidden" name="status" value="cancelled" />
                      </ActionForm>
                    )}
                  </div>
                  {guest && (
                    <details>
                      <summary>{t('guestDetails')}</summary>
                      <dl>
                        {(
                          [
                            'full_name',
                            'email',
                            'phone',
                            'nationality',
                            'residence',
                            'arrival_time',
                            'requests',
                          ] as const
                        ).map((k) => (
                          <div key={k}>
                            <dt>{t(`fields.${k}`)}</dt>
                            <dd>{guest[k]}</dd>
                          </div>
                        ))}
                      </dl>
                    </details>
                  )}
                </article>
              );
            })}
          {places
            .filter((p) => p.organization_id === org.id)
            .map((p) => (
              <div key={p.id}>
                <h3>
                  {t('qrManagement')}: {p.name}
                </h3>
                {p.stamp_definitions.map((s) => (
                  <div key={s.id} className="inline-actions">
                    <ActionForm locale={locale} command="issue_qr" label={t('issueQr')}>
                      <input type="hidden" name="stamp_id" value={s.id} />
                    </ActionForm>
                    <ActionForm locale={locale} command="revoke_qr" label={t('revokeQr')}>
                      <input type="hidden" name="stamp_id" value={s.id} />
                    </ActionForm>
                  </div>
                ))}
              </div>
            ))}
        </div>
      ))}
    </section>
  );
}
