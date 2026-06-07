interface AiTool {
  name: string;
  description: string;
  input_schema: { type: "object"; required: string[]; properties: Record<string, any> };
}

export const TERRITORY_ADJACENCY: Record<number, number[]> = {
  0:  [4, 5, 8, 14],
  1:  [6, 9, 3, 15],
  2:  [4, 6, 7, 11, 14],
  3:  [1, 9, 15, 16],
  4:  [0, 2, 7],
  5:  [0, 8, 17],
  6:  [1, 2, 7, 9, 10, 12],
  7:  [2, 4, 6, 10],
  8:  [0, 5, 14, 17],
  9:  [1, 3, 6, 12, 13, 15],
  10: [6, 7],
  11: [2, 12, 14],
  12: [6, 9, 11, 13, 16],
  13: [9, 12, 16],
  14: [0, 2, 8, 11],
  15: [1, 3, 9, 16],
  16: [3, 12, 13, 15],
  17: [5, 8],
};

// Section D from rulebook — per-civ reaction guidance shown in prompt
export const EVENT_REACTIONS: Record<string, Record<string, string>> = {
  Aelthar: {
    bless:   "Read this as a war-sign. A god has chosen you — prove it with conquest or expansion.",
    curse:   "Rage. Blame weakness. Attack a neighbor immediately. Do NOT retreat or pray.",
    portent: "The omen is permission to strike. Move first — expand or declare war.",
    inspire: "Scholarly inspiration is military intelligence. Build aggression.",
    strike:  "You do not mourn. You march harder. Retaliate against the nearest enemy.",
    reveal:  "A god watches. Show only strength. Expand or conquer.",
  },
  Brindlefolk: {
    bless:   "Build a temple immediately. Increase piety. This confirms your mission.",
    curse:   "Build more temples to appease. Deepen faith, not war.",
    portent: "Take the omen as divine direction. Preach it. Prioritize spiritual expansion.",
    inspire: "Divine inspiration confirms your faith. Build piety in its honor.",
    strike:  "Pray and hold the coast. Fortify spiritually. Show unshakeable faith.",
    reveal:  "The gods see our devotion. Perform a public act of faith.",
  },
  Sapient: {
    bless:   "Document the phenomenon. Continue research. File and analyze.",
    curse:   "Analyze the source. Develop tech to counter it. Adapt models.",
    portent: "Interesting data point. Cross-reference patterns. Develop tech.",
    inspire: "Excellent. Redirect scholarly resources — develop_tech immediately.",
    strike:  "Calculate damage. Build stability. Gather data. Never act emotionally.",
    reveal:  "Log the inspection. Update threat models. Continue analysis.",
  },
  "Merchant Princes": {
    bless:   "Leverage the blessing as a market signal. Send envoys — the margin is favorable.",
    curse:   "Seek protection through alliances. Find who profits from this disaster.",
    portent: "Find the commercial angle in this omen. Send envoys before competitors.",
    inspire: "Commercialize this. Send envoys to spread the inspired knowledge.",
    strike:  "Rebuild and raise tariffs. Infrastructure is security. Build mercantile.",
    reveal:  "A god watches our ledgers. Look busy. Send envoys immediately.",
  },
};

// Section E from rulebook — 2 examples per civ showing vivid, specific narrations
export const FEW_SHOT_EXAMPLES: Record<string, string> = {
  Aelthar: `• Curse received on Iron Citadel → {"action":"declare_war","target":"Brindlefolk","narration":"Plague or not — Aelthar's legions march at dawn. Brindlefolk priests will tend their own dead before they tend ours.","thought":"Curse = weakness test. Retaliate immediately. Our pain is irrelevant."}
• Adjacent unclaimed Crimson Pass → {"action":"expand","target":"Crimson Pass","narration":"Aelthar's vanguard took Crimson Pass before noon. Three legions cross the ridge by nightfall — the mountain is ours now.","thought":"Mountain adjacent and unclaimed. Expand — control the high ground first."}`,

  Brindlefolk: `• Blessing received → {"action":"build","target":"piety","narration":"The tides answered with salt and fire. Two new temples consecrated along the coast — piety deepens, the congregation triples by vespers.","thought":"Divine blessing = build piety immediately. Spiritual strength is our fortification."}
• Adjacent unclaimed Ashenvale → {"action":"expand","target":"Ashenvale","narration":"Missionaries entered Ashenvale's forest before our soldiers. By the time the standard rose, half the village had already converted.","thought":"Expand to spread faith. Missionaries first, soldiers only if the missionaries are harmed."}`,

  Sapient: `• Inspire received → {"action":"develop_tech","target":"none","narration":"The divine spark confirmed what the Archive theorized. Tech advances — the experiment log grows by three volumes overnight while Aelthar sharpens swords.","thought":"Inspiration = scholarly mandate confirmed. Develop tech immediately — the data is conclusive."}
• Standard decision → {"action":"develop_tech","target":"none","narration":"Three new metallurgical theorems catalogued. Tech climbs while Aelthar burns coin on armies that rust in the rain.","thought":"Tech advancement is always optimal. Others' instability is our long-term strategic advantage."}`,

  "Merchant Princes": `• Curse on neighboring civ → {"action":"send_envoy","target":"Brindlefolk","narration":"Aelthar's plague is our opening — envoys reached Brindlefolk before Sapient even filed the incident report. The relief contract is signed at premium rates.","thought":"Others' crisis = our margin. Move first. Name the price before competitors arrive."}
• Standard decision → {"action":"form_alliance","target":"Sapient","narration":"The Archon's research for our trade routes — a clean transaction. The ledger grows twelve percent. Alliance sealed before the tide turns against us.","thought":"Sapient alliance = archive access plus trade routes. Margin is clearly favorable."}`,
};

export const MIRACLE_EFFECTS: Record<string, string> = {
  bless:   "+2 stability, +1 piety",
  curse:   "-15 population, -1 stability, plague on territory",
  portent: "divine omen shaping next decision",
  inspire: "+1 scholarly",
  strike:  "-25 population, -2 stability, comet devastation",
  reveal:  "god inspected your secrets",
};

const EXPAND_NARRATIONS: Record<string, (terrName: string) => string> = {
  Aelthar:           t => `Aelthar's columns pressed into ${t} at dawn — the territory claimed before the enemy could respond.`,
  Brindlefolk:       t => `Missionaries reached ${t} first. By the time the Brindlefolk standard rose, the village already sang the coastal hymns.`,
  Sapient:           t => `${t} falls within optimal expansion range. The Archive's survey teams move in — documented and claimed before nightfall.`,
  "Merchant Princes": t => `${t} added to the trade ledger. Merchant Princes infrastructure goes up within the week — profitable by next season.`,
};

const BUILD_NARRATIONS: Record<string, (stat: string) => string> = {
  Aelthar:           s => `Aelthar's smiths work through the night — ${s} forged higher through iron will alone.`,
  Brindlefolk:       s => `New shrines consecrated along the coast. The Brindlefolk's ${s} deepens as the faithful gather.`,
  Sapient:           s => `Archive resources redirected. ${s} advances — three new theorems filed, the index updated.`,
  "Merchant Princes": s => `Capital flows into ${s} development. Merchant Princes efficiency climbs — the ledger reflects the investment.`,
};

export function ruleBasedDecision(
  civ: any,
  adjacentUnclaimed: any[],
  eligibleActions: string[]
): { action: string; target: string; narration: string; thought: string } {
  if (eligibleActions.includes("expand") && adjacentUnclaimed.length > 0) {
    const tgt = adjacentUnclaimed[0];
    const narrationFn = EXPAND_NARRATIONS[civ.name];
    const narration = narrationFn ? narrationFn(tgt.name) : `${civ.name} pressed into ${tgt.name}, claiming it before rivals could respond.`;
    return { action: "expand", target: tgt.name, narration, thought: `${tgt.name} adjacent and unclaimed. Expand now.` };
  }
  if (eligibleActions.includes("develop_tech") && civ.scholarly >= 6) {
    return { action: "develop_tech", target: "none", narration: `${civ.name}'s scholars push the boundaries of knowledge — tech level climbs while rivals debate tactics.`, thought: "Scholarly strength — develop tech now." };
  }
  if (eligibleActions.includes("send_envoy") && civ.mercantile >= 7) {
    return { action: "send_envoy", target: "", narration: `${civ.name} dispatches envoys before anyone else moves — the commercial advantage goes to the swift.`, thought: "High mercantile — send envoys. Move first." };
  }
  if (eligibleActions.includes("build")) {
    const stat = civ.aggression >= 8 ? "aggression" : civ.piety >= 7 ? "piety" : civ.mercantile >= 6 ? "mercantile" : civ.scholarly >= 5 ? "scholarly" : "stability";
    const narrationFn = BUILD_NARRATIONS[civ.name];
    const narration = narrationFn ? narrationFn(stat) : `${civ.name} directs resources inward — ${stat} climbs as the people respond to their leader's focus.`;
    return { action: "build", target: stat, narration, thought: `Build ${stat} — it's the dominant strength right now.` };
  }
  return { action: "consolidate", target: "stability", narration: `${civ.name} consolidates — stability restored, the people steadied after a turbulent season.`, thought: "Fallback: consolidate and recover." };
}

// Tool for batched tick decisions (multiple civs)
export const DECISION_TOOL: AiTool = {
  name: "submit_decisions",
  description: "Submit civilization decisions for all civs that need AI reasoning this tick.",
  input_schema: {
    type: "object" as const,
    required: ["decisions"],
    properties: {
      decisions: {
        type: "array",
        items: {
          type: "object",
          required: ["civId", "action", "target", "narration", "thought"],
          properties: {
            civId:     { type: "integer", description: "The civilization ID" },
            action:    { type: "string", enum: ["expand","build","conquer","declare_war","form_alliance","develop_tech","send_envoy","convert","consolidate"] },
            target:    { type: "string", description: "Exact territory or civ name, or 'none'" },
            narration: { type: "string", description: "1-2 sentences in the civ's voice. MUST name the specific territory or target. Show the concrete outcome AND the strategic reasoning. Never say 'divine favor', 'the gods will it', or vague omen-speak. Max 40 words." },
            thought:   { type: "string", description: "Private in-character reasoning. Name specific threats, territories, or stats driving the decision. Max 25 words." },
          },
        },
      },
    },
  },
};

// Tool for a single immediate miracle reaction
export const REACTION_TOOL: AiTool = {
  name: "submit_reaction",
  description: "Submit this civilization's immediate reaction to the divine miracle just cast.",
  input_schema: {
    type: "object" as const,
    required: ["action", "target", "narration", "thought"],
    properties: {
      action:    { type: "string", enum: ["expand","build","conquer","declare_war","form_alliance","develop_tech","send_envoy","convert","consolidate"] },
      target:    { type: "string", description: "Exact territory or civ name, or 'none'" },
      narration: { type: "string", description: "2 sentences in the civ's voice: sentence 1 = what the miracle did (name the territory, describe the concrete effect), sentence 2 = what you are doing in response and why. Name specifics. Never say 'divine favor'. Max 45 words." },
      thought:   { type: "string", description: "Private in-character reasoning directly responding to this miracle. Name what changed, why it matters, what the response is. Max 25 words." },
    },
  },
};
