# ClassSync: Pilot plan (5-10 real users, 2-3 days)

## Goal
Test with real users to verify that: (1) the timetable displays correctly, (2) cancellation, rescheduling, and substitute alerts arrive promptly, and (3) users can identify anything that is unclear.

## Participants
| Role | Count | Who |
|---|---|---|
| HOD | 1 | A doctor or senior faculty member (or yourself for the demo) |
| Teacher | 2-3 | Any faculty members who are available |
| Student | 5-8 | Students from your section (use different phones: Android / iPhone) |

## Preparation
- [ ] The app is deployed and `/api/health` returns `ok`
- [ ] HOD login works; sections, rooms, subjects, and teachers have been created
- [ ] Assign and Generate have been run, and the timetable is visible
- [ ] Teachers have received their email and password (ask them to change the password)
- [ ] The app link has been shared with students (WhatsApp group)

## Tasks (give each user these instructions)
| # | Role | Task | What to observe |
|---|---|---|---|
| 1 | Student | Create an account and select a section | Did it take less than 1 minute? |
| 2 | Student | Find the next class today | Could they find it without help? |
| 3 | Teacher | Cancel a class for tomorrow and provide a reason | How long did the alert take to reach the student's phone? |
| 4 | Teacher | Reschedule a class to another period | Was the conflict message clear? |
| 5 | Teacher | Request a substitute from another teacher and have them accept | Did the student see "Y instead of X"? |
| 6 | Teacher | Cancel a class, then undo the cancellation | Did the class return to its normal state? |
| 7 | HOD | Open Analytics and the Audit log | Were all the numbers clear? |

## Metrics
| Metric | Target |
|---|---|
| Time from cancelling a class to the alert appearing on the student's screen | Under 3 seconds |
| Tasks completed without help | More than 80% |
| Crashes / blank pages | 0 |
| "It was easy to understand" rating (1-5) | Above 4 |

## Feedback form (6 Google Form questions)
1. What is your role (student / teacher / HOD)?
2. Which task was easiest?
3. Where did you get stuck?
4. How quickly did you receive the alert? (immediately / within seconds / late / not received)
5. What did you prefer over the WhatsApp PDF?
6. What is the first thing you would change?

## Bug log
| # | Reported by | What happened | Phone / browser | Severity (high/med/low) | Fixed? |
|---|---|---|---|---|---|

## After the pilot
- [ ] Fix high-priority bugs and test again with 2 users
- [ ] Add the top 3 feedback items to the README's "Known limits" or a future version
- [ ] For the final presentation: screenshots, alert timing, and user quotes
