import { DEFAULT_FIELD_AGENTS, type InvestigationCaseDraft } from "./types";

/**
 * Entirely original fictional sample cases.
 * No Mentalist / Red John / show characters, titles, or motifs.
 * No real people as suspects or guilty parties.
 */
export const SAMPLE_INVESTIGATION_CASES: InvestigationCaseDraft[] = [
  {
    slug: "glass-harbor-ledger",
    title: "The Glass Harbor Ledger",
    teaser:
      "A pier accountant is found in a locked night office. The books balance — someone else does not.",
    victims: ["Ellis Marrow"],
    location: "Glass Harbor marina district",
    discoveryReport:
      "Night security found Ellis Marrow slumped at his desk in Pier Office 3 shortly after 01:10. The door was locked from inside; a narrow vent window stood ajar. The pier ledger for berth fees was open to last night’s page.",
    weapon: { name: "Brass letter opener", trait: "engraved with a looping H" },
    darkerTheme: false,
    fieldAgents: DEFAULT_FIELD_AGENTS,
    locations: [
      {
        id: "loc-office",
        name: "Pier Office 3",
        clue: "A brass letter opener engraved with a looping H lies under the desk, wiped but still sticky at the tip.",
      },
      {
        id: "loc-walkway",
        name: "North walkway cameras",
        clue: "Camera request logs show a 12-minute blind window starting 00:48 — maintenance ticket filed by harbor ops, not security.",
      },
      {
        id: "loc-skiff",
        name: "Skiff rack B",
        clue: "Wet boot prints size 9 lead from the skiff rack toward Pier Office 3, then stop at a hose bib.",
      },
      {
        id: "loc-cafe",
        name: "Night cafe till",
        clue: "Till receipt shows berth clerk Tamsin Holt paid for two coffees at 00:35 — one black, one with oat milk.",
      },
      {
        id: "loc-locker",
        name: "Staff locker corridor",
        clue: "Locker 14 (assigned to harbor ops) contains a spare vent-window key tagged “PO3” and a glove with faint brass polish.",
      },
    ],
    suspects: [
      {
        id: "s-holt",
        name: "Tamsin Holt",
        role: "Berth clerk",
        personality: "Crisp, helpful, slightly over-explains timelines",
        motive: "Feared Marrow would report her skimming late berth fees",
        background: "Three years at Glass Harbor; prior write-ups for till mismatches that were later cleared.",
        alibi: "Buying coffee at the night cafe around 00:35, then inventorying keys until 01:00",
        statement:
          "Ellis was tense about the ledger. I brought him coffee sometimes. I was at the cafe, then back counting keys. I never went into Office 3 after midnight.",
        isGuilty: false,
        evidenceTitle: "Cafe receipt",
        evidenceDetail: "Receipt corroborates Holt’s cafe stop; oat milk cup found near the walkway, not the office.",
      },
      {
        id: "s-reed",
        name: "Jonah Reed",
        role: "Harbor operations tech",
        personality: "Dry, defensive about procedures, jokes when pressed",
        motive: "Marrow discovered Reed’s side deals selling after-hours berth access",
        background: "Handles maintenance tickets and spare keys; recently argued with Marrow about unauthorized night launches.",
        alibi: "Home asleep after filing a camera maintenance ticket remotely from his couch",
        statement:
          "I filed a camera ticket because the north bank flickers. I was home. Marrow liked locking people out of their own shortcuts — that was his whole personality.",
        isGuilty: true,
        evidenceTitle: "Vent key + camera blind",
        evidenceDetail:
          "Reed filed the camera blind window, kept the PO3 vent key in locker 14, and used the letter opener engraved with H from the Harbor Ops desk set. Wet prints from the skiff rack match his route after a staged “maintenance” check.",
      },
      {
        id: "s-vale",
        name: "Priya Vale",
        role: "Night security lead",
        personality: "Formal, protective of her team, hates speculation",
        motive: "None strong — professional friction only",
        background: "Ex-municipal guard; wrote Marrow up twice for after-hours access without escort.",
        alibi: "Walking the south pier loop on a timed patrol from 00:40 to 01:05",
        statement:
          "I found him. Door locked, vent cracked. I do not invent killers for convenience. Check the cameras — if they were down, that is ops, not security.",
        isGuilty: false,
        evidenceTitle: "Patrol log",
        evidenceDetail: "South loop checkpoints pinged on schedule; Vale could not have reached Office 3 before 01:08.",
      },
      {
        id: "s-cho",
        name: "Marcus Quinn",
        role: "Boat owner (Berth 19)",
        personality: "Charming, impatient, money-forward",
        motive: "Owed Marrow a disputed fee Marrow threatened to escalate",
        background: "Keeps a racing skiff; argued loudly at dusk about late fees.",
        alibi: "Dinner across town until 00:50, rideshare drop at the gate at 01:02",
        statement:
          "I argued about fees, sure. I was not sneaking through vents. Check my rideshare. I wanted him alive so he could reverse the charge.",
        isGuilty: false,
        evidenceTitle: "Rideshare ping",
        evidenceDetail: "Drop timestamp places Quinn at the gate after discovery was already radioed.",
      },
    ],
  },
  {
    slug: "emberline-observatory",
    title: "Emberline Observatory",
    teaser:
      "A visiting astronomer dies under a dome that should have been empty. The star charts were rearranged.",
    victims: ["Dr. Lena Orth"],
    location: "Emberline ridge observatory",
    discoveryReport:
      "At 03:22, junior tech Arlo Finch found Dr. Lena Orth unresponsive on the dome catwalk. The primary shutter was half-open. A cold chisel with a blue tape wrap lay two meters away. Night log claims the dome was sealed for calibration.",
    weapon: { name: "Cold chisel", trait: "blue electrical tape wrap on the handle" },
    darkerTheme: true,
    hasTwist: true,
    twistNote:
      "The killer rearranged charts to frame a rival grant team — the real dispute was stolen calibration time, not research credit.",
    fieldAgents: DEFAULT_FIELD_AGENTS,
    locations: [
      {
        id: "loc-dome",
        name: "Main dome catwalk",
        clue: "Blue electrical tape fibers match the chisel wrap and snag on a catwalk bolt near Orth’s hand.",
      },
      {
        id: "loc-chart",
        name: "Chart room",
        clue: "Star charts were reordered to highlight the rival grant’s target field — a sticky note in Orth’s handwriting says “who moved these?”",
      },
      {
        id: "loc-server",
        name: "Calibration server closet",
        clue: "Access log shows badge override by facilities at 02:55 — badge cloned from a lost spare, not the owner’s live card.",
      },
      {
        id: "loc-dorm",
        name: "Visitor dorm kitchen",
        clue: "Kettle still warm; two mugs — one with Orth’s preferred ginger tea, one untouched chamomile.",
      },
      {
        id: "loc-tool",
        name: "Facilities tool cage",
        clue: "Cold chisel inventory tag missing; blue tape roll half-used sits on the cage shelf reserved for night facilities.",
      },
      {
        id: "loc-lot",
        name: "Ridge parking lot",
        clue: "Tire tracks show a short outbound trip at 03:05 that returned by 03:18 — vehicle registered to facilities lead.",
      },
    ],
    suspects: [
      {
        id: "s-finch",
        name: "Arlo Finch",
        role: "Junior tech",
        personality: "Nervous, eager, overshares technical detail",
        motive: "None — feared blame for an unlocked dome",
        background: "New hire; discovered the body while starting early calibration.",
        alibi: "In the server closet running diagnostics from 02:40, then walking the catwalk at 03:20",
        statement:
          "I found her. I was checking calibration drift. Someone moved the charts — that is not me. I do not even own blue tape.",
        isGuilty: false,
        evidenceTitle: "Server session",
        evidenceDetail: "Interactive session from Finch’s account ran continuously until 03:18.",
      },
      {
        id: "s-brook",
        name: "Sable Brook",
        role: "Rival grant astronomer",
        personality: "Sharp, competitive, precise with wording",
        motive: "Wanted Orth’s observing slots; public feud over credit",
        background: "Visiting from another institute; argued with Orth at dinner about schedule theft.",
        alibi: "Asleep in visitor dorm after tea; phone shows no movement until the alarm",
        statement:
          "We fought about slots, not survival. I drank tea and slept. Framing me with chart order is cute and wrong.",
        isGuilty: false,
        evidenceTitle: "Phone stillness",
        evidenceDetail: "Accelerometer idle in dorm; chamomile mug matches Brook’s habit, unused because she fell asleep first.",
      },
      {
        id: "s-keene",
        name: "Harlan Keene",
        role: "Facilities lead",
        personality: "Calm, procedural, becomes cold when accused",
        motive:
          "Orth threatened to expose Keene selling after-hours calibration blocks to outside teams",
        background: "Controls tool cage and spare badges; vehicle on ridge lot.",
        alibi: "Drove to the valley depot for a parts run and returned after 03:30",
        statement:
          "I left for parts. Calibration sales are a rumor from people who cannot book time fairly. Check the depot cameras.",
        isGuilty: true,
        evidenceTitle: "Cloned badge + short trip",
        evidenceDetail:
          "Keene’s lot tracks show a short outbound bluff, not a valley run. He used a cloned facilities badge at 02:55, took the blue-taped chisel from the tool cage, and staged chart disorder to point at Brook.",
      },
      {
        id: "s-nguyen",
        name: "Ivy Nguyen",
        role: "Observatory director",
        personality: "Diplomatic, exhausted, deflects to policy",
        motive: "Wanted the scandal buried, not Orth dead",
        background: "Mediated the Orth/Brook dispute; signed Keene’s overtime.",
        alibi: "Video call with the board finance chair from home until 03:00",
        statement:
          "I was on a call. Lena was valuable alive. If facilities shortcuts killed her, that is on the ridge — not my living room.",
        isGuilty: false,
        evidenceTitle: "Board call log",
        evidenceDetail: "Call ended 03:01 from Nguyen’s home IP; cannot place her on the ridge before discovery.",
      },
    ],
  },
  {
    slug: "saltway-atelier",
    title: "Saltway Atelier",
    teaser:
      "A textile conservator is killed among drying screens. The dye recipe book is missing one page.",
    victims: ["Noor Alvi"],
    location: "Saltway coastal atelier",
    discoveryReport:
      "Morning apprentice found Noor Alvi behind the drying racks at 07:40. A ceramic glaze knife with a hairline crack along the spine was on the floor. The dye recipe book’s “indigo set B” page was torn out.",
    weapon: { name: "Ceramic glaze knife", trait: "hairline crack along the spine" },
    darkerTheme: false,
    fieldAgents: DEFAULT_FIELD_AGENTS,
    locations: [
      {
        id: "loc-racks",
        name: "Drying racks",
        clue: "Indigo-stained footprint arcs from the racks to the vault door — size matches the guest artist’s stamped clogs.",
      },
      {
        id: "loc-vault",
        name: "Pigment vault",
        clue: "Torn recipe page corner remains in the binding; the missing sheet’s indigo formula notes a toxic substitute batch.",
      },
      {
        id: "loc-kiln",
        name: "Kiln annex",
        clue: "Ceramic glaze knife with a hairline spine crack is logged as checked out to guest artist booth C last night.",
      },
      {
        id: "loc-courtyard",
        name: "Courtyard cameras",
        clue: "Footage shows the apprentice locking the front gate at 22:10 and not re-entering until morning.",
      },
      {
        id: "loc-loft",
        name: "Conservator loft",
        clue: "Noor’s tablet draft email (unsent) begins: “The substitute indigo is not archival — if shipped, I will notify—”",
      },
    ],
    suspects: [
      {
        id: "s-pereira",
        name: "Diego Pereira",
        role: "Guest artist",
        personality: "Warm public face, brittle when craft is challenged",
        motive: "Noor planned to expose his toxic substitute indigo before a gallery shipment",
        background: "Booth C resident for two weeks; checked out the cracked glaze knife.",
        alibi: "Sleeping at the seaside inn; night clerk saw him return at 21:50",
        statement:
          "I left before ten. My clogs stay at the atelier — anyone could wear them. Noor and I disagreed about recipes, not about living.",
        isGuilty: true,
        evidenceTitle: "Knife checkout + clog prints",
        evidenceDetail:
          "Pereira checked out the cracked glaze knife, used his stamped clogs for the indigo path to the vault, tore the incriminating recipe page, and slipped back after the clerk’s shift change — the inn camera gap covers 23:40–00:20.",
      },
      {
        id: "s-moss",
        name: "Eden Moss",
        role: "Apprentice",
        personality: "Soft-spoken, loyal to Noor, literal",
        motive: "None beyond grief",
        background: "Locked the gate at 22:10; found the body at 07:40.",
        alibi: "Home after locking up; courtyard camera confirms no re-entry",
        statement:
          "I locked the gate. I loved learning from Noor. I would not touch the vault recipes.",
        isGuilty: false,
        evidenceTitle: "Gate lock footage",
        evidenceDetail: "Moss leaves and does not return until morning discovery.",
      },
      {
        id: "s-choi",
        name: "Hana Choi",
        role: "Gallery liaison",
        personality: "Polished, schedule-obsessed",
        motive: "Shipment delay would embarrass the gallery — pressure, not murder",
        background: "Pushed Noor to approve Pereira’s batch; left town meeting at 21:00",
        alibi: "Hotel across the bay; keycard and minibar charge at 23:10",
        statement:
          "I wanted the shipment. Dead conservators do not sign approvals. Check the hotel.",
        isGuilty: false,
        evidenceTitle: "Hotel keycard",
        evidenceDetail: "Choi remained across the bay through the night.",
      },
      {
        id: "s-briggs",
        name: "Owen Briggs",
        role: "Building caretaker",
        personality: "Gruff, territorial about keys",
        motive: "None financial — disliked night guests",
        background: "Holds master keys; argued about after-hours kiln use.",
        alibi: "Card game at the pier pub until 00:30 with three regulars",
        statement:
          "I was at the pub. If someone used the vault, they already had access. I do not cut people over kilns.",
        isGuilty: false,
        evidenceTitle: "Pub witnesses",
        evidenceDetail: "Three regulars confirm Briggs stayed until last call.",
      },
    ],
  },
];

export function getSampleCaseBySlug(
  slug: string,
): InvestigationCaseDraft | undefined {
  return SAMPLE_INVESTIGATION_CASES.find((c) => c.slug === slug);
}
