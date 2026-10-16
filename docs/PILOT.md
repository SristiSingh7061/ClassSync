# ClassSync: Pilot plan (5-10 real users, 2-3 din)

## Goal
Real logon se check karna ki: (1) routine sahi dikhta hai, (2) cancel / shift / substitute ka alert turant pahunchta hai, (3) koi kuch samajh nahi paata to kahan.

## Kaun kaun
| Role | Kitne | Kaun |
|---|---|---|
| HOD | 1 | Dr. ya senior faculty (ya tum khud demo ke liye) |
| Teacher | 2-3 | Jo faculty tayyar ho |
| Student | 5-8 | Apne section ke classmates (alag-alag phone: Android / iPhone) |

## Pehle se taiyari (tum)
- [ ] App deploy ho chuka hai aur `/api/health` `ok` deta hai
- [ ] HOD login chalta hai, section, rooms, subjects, teachers bana diye
- [ ] Assign + Generate chala diya, routine dikh raha hai
- [ ] Teachers ko email + password diye (khud badalne ko bolo)
- [ ] Students ko link bheja (WhatsApp group)

## Tasks (har user ko ye script do)
| # | Role | Task | Kya dekhna hai |
|---|---|---|---|
| 1 | Student | Account banao, section chuno | 1 minute ke andar ho gaya? |
| 2 | Student | "Aaj ki agli class" kya hai batao | Bina poochhe mila? |
| 3 | Teacher | Kal ki ek class cancel karo (reason ke saath) | Student phone pe alert kitni der mein aaya? |
| 4 | Teacher | Ek class dusre period mein shift karo | Clash ka message samajh aaya? |
| 5 | Teacher | Kisi dusre teacher ko substitute maango, wo accept kare | Student ko "X ki jagah Y" dikha? |
| 6 | Teacher | Galti se cancel kiya, Undo karo | Class wapas normal? |
| 7 | HOD | Analytics aur Audit log kholo | Sab numbers samajh aaye? |

## Kya naapna hai
| Metric | Target |
|---|---|
| Cancel dabane se student ke screen pe alert | 3 second se kam |
| Task bina madad ke poora kiya | 80% se zyada |
| Koi crash / blank page | 0 |
| "Seedha samajh aaya" (1-5 rating) | 4 se upar |

## Feedback form (Google Form ke 6 sawal)
1. Aap kaun ho (student / teacher / HOD)?
2. Kaun sa kaam sabse aasan laga?
3. Kahan atak gaye?
4. Alert kitni jaldi mila? (turant / kuch second / der se / nahi mila)
5. WhatsApp PDF ke mukable kya better laga?
6. Ek cheez jo sabse pehle badalni chahiye?

## Bug log
| # | Kisne | Kya hua | Phone / browser | Gambhirta (high/med/low) | Fix hua? |
|---|---|---|---|---|---|

## Pilot ke baad
- [ ] High wale bugs fix karo, dobara 2 log se test
- [ ] Feedback ke top 3 points README ke "Known limits" mein ya agle version mein likho
- [ ] Final PPT ke liye: screenshots, alert ka time, user quotes
