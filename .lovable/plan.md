# Social Hub — Unified Inbox and Activity

## What will change
- Replace the Inbox placeholder with Facebook and Instagram conversations and post comments, keeping the existing pages and design unchanged.
- Add platform, messages/comments, unread and search filters; show sender, timestamps, attachments, and conversation history.
- Allow authorized Social Hub staff to mark items read, resolve/reopen conversations, and reply when Meta permits it. Show actual sending failures rather than reporting false success.
- Upgrade Activity with platform/action filters, dated events, pagination and CSV export for social connection, incoming message/comment, reply and conversation-status events. Exclude tokens and private message bodies from audit details.

## Connecting live delivery
- Use the existing saved Facebook and Instagram tokens and Meta app credentials; validate account access and required permissions before enabling delivery.
- Add a secure Meta callback for new Facebook/Instagram messages and comments, with challenge verification, signed-request validation and duplicate protection.
- Provide administrator connection checks and subscribe the connected accounts to supported events. Any Meta Dashboard configuration or approval that cannot be completed from the app will be listed explicitly with the callback URL and required fields.
- Treat existing chats as a separate history sync only where Meta grants access; do not imply webhooks automatically import old messages.
- WhatsApp, post publishing and the content calendar are not part of this change.

## Access and privacy
- Restrict inbox access and replies to the Social Hub's existing super administrator, manager and receptionist roles, verified on the server. Reject suspended/disabled staff.
- Keep social messages separate from patient clinical records. Browser users cannot read access tokens or write incoming messages/audit events directly.
- Preserve provider event IDs and enforce idempotent processing so Meta retries do not duplicate messages or activity.

## Technical implementation
- Add dedicated social conversation, message/comment and social activity tables with explicit grants, RLS, indexes and server-only write permissions. Use consistent role checks without broadening the clinic-wide `is_staff` helper.
- Add Supabase Edge Functions for the signed public Meta webhook and authenticated inbox actions/subscription checks. Reuse existing Meta app secrets and tokens server-side; generate a dedicated webhook verification secret.
- Extract focused Inbox and Activity components from the existing Social Hub page. Load paginated data and refresh through subscriptions with cleanup where supported.
- Record the social data boundary and authorization rules in `AGENTS.md`; track implementation and any external setup blockers in `roadmap.md`.

## Verification
- Add and run tests for signature rejection, duplicate handling, Facebook/Instagram message and comment parsing, authorized roles and reply-window enforcement.
- Check database grants/RLS and the latest page error reports.
- Verify the signed-in inbox and activity screens and a real incoming-message/reply flow when the connected account permissions and Meta delivery configuration permit it. Report any unavailable authenticated or live-provider checks honestly.

## External prerequisites
Saved tokens are present for both accounts, but this does not confirm messaging permissions or webhook subscriptions. Live arrival may require an administrator to configure the callback and enable approved messaging/comment permissions in Meta. The app will distinguish configured, blocked and verified delivery states.