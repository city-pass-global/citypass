# Hotel pre-check-in

1. Sign in with Google; create a hotel profile. It is pending participation approval.
2. Owner/manager/receptionist creates a reservation reference, email, arrival/departure and guest count. A pending hotel can prepare its private workflow; public participation requires approval.
3. Generate an invitation. Reissuing revokes previous unconsumed links. Share manually via the hotel's existing channel; the app sends no messages.
4. Guest opens a fragment-bearing URL. The generic form does not fetch or display reservation PII. Submission requires both the high-entropy token and the matching reservation email. Passport registration is not required.
5. Guest explicitly consents to operational processing. No marketing opt-in or document upload is requested.
6. Submission consumes the invitation, persists minimal fields and changes the reservation to submitted atomically.
7. Assigned staff sees the submission and transitions submitted → reviewed → ready_for_arrival → completed. Active reservations may be cancelled, invalidating invitations.

Invitation expiry is the earlier of 72 hours and the UTC day after departure (conservative first implementation; align with destination checkout time in the pilot policy). Five failed email checks lock that link until staff reissues. All invalid/expired/replayed links produce the same public failure message. No reservation enumeration endpoint exists.

States opened and in_progress are intentionally not collected yet: anonymous draft persistence and tracking would require a separate secure session design. Number of guests comes from the reservation; configurable registration fields, imports, staff invitations and hotel guest guides are later work.

## Retention and legal review
Each submission receives a provisional retention_until of departure + 30 days. Retention is a proposed product default, not a legal assertion. The maintenance script is manual and must be scheduled only after applicable requirements are reviewed. Reservation emails also require deletion. No automated retention job is enabled yet. Hotel operator privacy contact and policy, lawful processing grounds, required registration fields, international data hosting and statutory retention remain pilot gates. Digital pre-check-in does not replace any required identity verification on arrival.
