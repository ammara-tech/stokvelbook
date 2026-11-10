# StokvelBook

**Your stokvel's book, on everyone's phone.** Every member sees who has paid, whose turn is next and what was
decided, in a shared history nobody can quietly change.

**Live site:** add your Vercel address here once it's deployed

Built by Ammara Badat as part of my portfolio. It uses Firebase, like PaperTrail, TickList, Rememba, ShiftBoard and
HireTrack, so it syncs between phones and keeps working with no signal.

## Who it's for
Stokvels: groups of friends, family, neighbours or colleagues who save together every month. Millions of South
Africans belong to one. Most keep their records in a notebook or a WhatsApp chat, and then everything depends on
the treasurer: members can't easily check who has paid, and a mistake (or worse) is hard to spot. StokvelBook puts
the book where every member can see it, and makes it impossible to change an entry without everyone seeing.

**StokvelBook keeps records only. It never holds, sends or receives money.** Members pay the way they always do
(cash, EFT), and the treasurer records it.

## What it does

**The group**
- **Four types of stokvel:** rotating (one member gets the pot each month, in turn), savings (shared out at year
  end), grocery (a big shop at year end) and burial society (pays out when a member's family has a funeral).
- **Invite members with a link** shared on WhatsApp. Anyone with the link can join as a member; the chairperson can
  make a new link, which stops the old one working.
- **Roles:** the **chairperson** runs the group (settings, members, roles, the payout order); the **treasurer**
  keeps the money book; **members** see everything and vote. A group always keeps a chairperson.
- **Members without the app:** the chairperson adds them by name (a gogo without a smartphone), and the treasurer
  records their payments like anyone else's.

**The money**
- **Home:** this month at a glance: your own status and balance, money in hand, how many have paid, the next
  payout, and everyone's status (Paid, Part paid, Late, Due).
- **Contributions:** every member and every month in one table, like a treasurer's book. Officers press a month to
  record a payment.
- **Late payments and fines:** late months are flagged, and if the group has a late fine, the treasurer adds it in
  one press. Fines are added to what the member owes.
- **Turns** (rotating stokvels): the payout order with each turn's month and pot. The chairperson moves people up
  and down; officers record each payout.
- **Year end** (savings and grocery): each member's share so far: what they paid in, plus an equal share of the fines.
- **Claims** (burial societies): the claims paid out, and what's in hand for the next one.

**Trust**
- **A history nobody can change:** every payment, payout, fine and change to the group shows who made it and when.
  Nobody can edit or delete an entry, not even the chairperson. A mistake is cancelled with a correction and a
  reason, and both stay visible (crossed out) for everyone.
- **Votes:** officers ask a question with 2 to 4 answers; each member votes once and can change their vote until it
  closes. Everyone sees the count as it happens.
- **Meeting notes:** who came and what was agreed.
- **Statements:** any member's payments, fines and payouts, to print or save as a PDF, or download as a spreadsheet.
  The whole book downloads as a spreadsheet too.

**Everyday**
- **Remind on WhatsApp:** opens WhatsApp with a polite reminder already written ("your contribution for November was
  due on 5 Nov, you're R 550 behind"). Free, with no paid messaging service, and it comes from someone the member knows.
- **Live updates:** "Thabo recorded your R 500 for November" pops up as it happens.
- **Try the demo** with no account: a made-up rotating stokvel of eight, four months in, with a late member, a fine,
  a cancelled mistake, a meeting and an open vote.
- **Works offline** (a badge shows Live, Syncing or Offline), **installable** ("Add to Home screen"), light and dark
  mode, and works on a phone and a laptop.

## Design
A stokvel's savings book, kept carefully: warm paper, deep green ink for money in and buttons, gold for payouts,
and red for late payments and deleting. The statuses have their own colours (Paid green, Part paid gold, Late red,
Due blue), and each also has a word or symbol, so colour is never the only clue. Text colours pass WCAG AA contrast
in both themes.

## Tech stack
Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, Firebase Authentication and Cloud Firestore,
Vitest, GitHub Actions, Vercel.

## Project structure
```
app/              Pages: Home (/), Contributions (/money), Turns, Year end or Claims (/payouts), History,
                  Meetings, Group, a statement (/statement?member=…), joining (/join?code=…), starting another
                  stokvel (/new), the app manifest, icons and the light/dark script
components/       The sign-in screen, the header, the welcome screen, the settings form, the forms for recording
                  money and cancelling a mistake, pop-up windows, status labels, toasts and icons
lib/              The money book (ledger.ts), months and days (months.ts), roles and settings (group.ts), votes
                  (votes.ts), WhatsApp reminders (reminders.ts), statements and spreadsheets (statement.ts),
                  reading data safely (read.ts), invite codes (invite.ts), rand amounts (money.ts), the live
                  store (store.ts), every change to the database (actions.ts) and the demo (demo.ts)
tests/            Unit tests for everything in lib/ that doesn't need Firebase
firestore.rules   The security rules (paste them into Firebase)
```

## How the important parts work

**A book that's only added to** (`lib/ledger.ts`). Payments, payouts, fines and corrections are all "entries" in one
list. Entries are never changed or deleted: a correction is a new entry pointing at the one it cancels.
`effectiveEntries()` leaves out corrections and the entries they cancel, and every total is worked out from that, so
the history and the totals always agree. Because entries are never changed, the security rules can simply refuse
every edit and delete.

**Where each member stands.** A member is expected to pay the contribution for every month whose due date has passed.
What they owe is that, plus any fines; `memberBalance()` compares it with what they paid to show how far behind or
ahead they are. Each month's status (`monthStatus()`) comes from the payments recorded for that month.

**Turns** (`rotation()`). The payout order is a list of members. Turn 1 is the first month of the cycle, turn 2 the
next month, and so on. A turn is done when a payout was recorded for that member in that month. The pot is the
contribution times the number of members.

**Members added by name** have an ID starting with `x-`, so it can never be mistaken for an account. People who leave
are kept in the list, marked as left, so the history still shows their name.

**Months and days** (`lib/months.ts`) are text like "2026-11" and "2026-11-10". Text like this sorts in date order,
means the same day on every phone, and is easy for the security rules to check.

**Statements** print cleanly: the app's bars and buttons are hidden when printing (`.no-print`), and the browser's
Print window can save the page as a PDF, so no PDF library is needed.

**Live updates** (`lib/store.ts`). The app listens to your profile, the group and its entries, history, meetings and
votes. Changes show straight away, even offline, and Firestore sends them when it can.

## Security rules
`firestore.rules` runs on Google's servers and checks every read and write, whatever the app sends:
- only a group's members can see it, and only you can see your profile
- only officers (the chairperson and treasurer) can add to the money book, always in their own name and with the
  real time; **nobody can change or delete an entry**
- a correction must give a reason and point at a real entry for the same member and amount
- only the chairperson changes the settings, the members, roles and payout order; a group always keeps a chairperson
- you can change only your own name and phone number, and only your own vote
- joining needs a real invite code and adds only yourself, as a member; leaving removes only yourself
- a group can be deleted only by a chairperson, after it's marked as being deleted (only then can its book be cleared)
- invite codes can be looked up one at a time, but never listed
- anything else is refused

## Tests
`npm test` runs the unit tests in `tests/` with Vitest: months across years and due dates, the money book
(corrections, statuses, balances with fines, group totals, who's behind), turns and the payout order, year-end
shares, what entries say and the live messages, settings and roles, WhatsApp numbers and reminders, votes and ties,
statements and spreadsheets (including protection against spreadsheet formulas), invite codes, rand amounts, and
reading broken data safely. GitHub runs them on every push (`.github/workflows/tests.yml`).

## Setup (run it yourself)
1. **Firebase:** create a project at [console.firebase.google.com](https://console.firebase.google.com).
   - Authentication → Get started → turn on **Email/Password**, **Google** and **Anonymous** (for Try the demo).
   - Firestore Database → Create database (production mode).
   - Firestore Database → **Rules**: paste in `firestore.rules` and press **Publish**.
   - Project settings → General → Your apps → add a **Web app** to get its settings.
2. **Settings:** copy `.env.example` to `.env.local` and fill in the four values from step 1.
3. **Run it:** `npm install`, then `npm run dev`, and open http://localhost:3000.
4. **Deploy on Vercel:** import the GitHub repo, add the same four settings under
   Settings → Environment Variables, and deploy. Then, in Firebase, add the Vercel address under
   Authentication → Settings → **Authorized domains**, so Google sign-in works there.

## Environment variables
Names only; the values are in `.env.local` (never committed) and in Vercel.

| Name | What it is |
|---|---|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | The web app's API key |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | e.g. `your-project.firebaseapp.com` |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | The Firebase project's ID |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | The web app's ID |

These are public by design: they say which Firebase project to use, they don't unlock anything. What protects
each group's book is `firestore.rules`.

## Known gaps
- **The security rules aren't in the automatic tests.** They'd need the Firebase emulator; they're tested by hand.
- **Records only.** StokvelBook doesn't connect to a bank, so the treasurer records each payment by hand.
- **Reminders only go when someone presses Remind.** There are no automatic messages or push notifications.
- **People added by name can't be linked to an account later.** If they join with the app, the chairperson removes
  the added-by-name entry; their old payments stay in the history under that name.
- **One cycle at a time.** At the end of a cycle, the chairperson changes the months for the next one, and the
  history carries on.
- **A guest who closes the tab** without ending the demo leaves their example group in the database.
- **English only.**

## Use of AI
I built StokvelBook with Claude (by Anthropic) as my AI pair programmer:

1. **I chose what to build** from ideas we discussed, and chose its features: all four types of stokvel, roles,
   a history nobody can change, meetings and votes, statements and WhatsApp reminders.
2. **Claude wrote the code**, starting from my other Firebase apps' sign-in, offline saving, invite links and live
   updates, explained how it works, and made the app icons.
3. **I set up Firebase and Vercel, added the code to my project**, ran it, tested it on my laptop and phone,
   committed it and deployed it, and reported anything that broke or looked wrong so we could fix it.
