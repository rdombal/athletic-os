// Curated sources for each Pillar's "Go deeper" page, keyed by pillar number.
// Reviewed by Ryan (Hale Pillars Sources doc, Nov 2026). The AI summarizes from
// these and never writes its own citations, so add or remove sources here only.
// type: podcast | video | article | study

export const PILLAR_SOURCES = {
  1: [ // Sleep
    { type:'podcast', title:'Sleep Toolkit: Tools for Optimizing Sleep & Sleep-Wake Timing', from:'Andrew Huberman', url:'https://www.hubermanlab.com/episode/sleep-toolkit-tools-for-optimizing-sleep-and-sleep-wake-timing', why:'The practical playbook: morning light, room temperature, caffeine timing, a consistent wake time' },
    { type:'podcast', title:'Protocols to Improve Your Sleep', from:'Huberman with Matthew Walker', url:'https://hubermanlab.com/episode/guest-series-dr-matthew-walker-protocols-to-improve-your-sleep', why:"A sleep scientist's protocols; backs the consistent bedtime habit" },
    { type:'podcast', title:'#47 Matthew Walker on sleep, Part I', from:'Peter Attia with Matthew Walker', url:'https://peterattiamd.com/matthewwalker1/', why:'Why sleep drives long-term health' },
    { type:'study', title:'Recommended Amount of Sleep for a Healthy Adult (2015)', from:'Watson et al., Journal of Clinical Sleep Medicine', url:'https://pmc.ncbi.nlm.nih.gov/articles/PMC4434546/', why:'The expert consensus behind "7 or more hours"' },
    { type:'study', title:'Chronic lack of sleep is associated with increased sports injuries in adolescent athletes (2014)', from:'Milewski et al., Journal of Pediatric Orthopaedics', url:'https://pubmed.ncbi.nlm.nih.gov/25028798/', why:'Athletes who slept less got hurt more often' },
  ],
  2: [ // Protein
    { type:'podcast', title:'The Science of Eating for Health, Fat Loss & Lean Muscle', from:'Huberman with Layne Norton', url:'https://www.hubermanlab.com/episode/dr-layne-norton-the-science-of-eating-for-health-fat-loss-and-lean-muscle', why:'How much protein, how to spread it, and what is noise' },
    { type:'podcast', title:'#224 Dietary protein: amount needed, ideal timing, quality, and more', from:'Peter Attia with Don Layman', url:'https://peterattiamd.com/donlayman/', why:'Amount, per-meal doses and protein quality' },
    { type:'study', title:'Protein supplementation and resistance training gains: systematic review and meta-analysis (2018)', from:'Morton et al., British Journal of Sports Medicine', url:'https://pmc.ncbi.nlm.nih.gov/articles/PMC5867436/', why:'Gains level off around 1.6 g per kg a day, the basis for 0.7 to 1 g per pound' },
    { type:'study', title:'ISSN Position Stand: protein and exercise (2017)', from:'Jäger et al., Journal of the International Society of Sports Nutrition', url:'https://pmc.ncbi.nlm.nih.gov/articles/PMC5477153/', why:'The professional guideline for active people, including spreading protein across meals' },
  ],
  3: [ // Movement
    { type:'podcast', title:'#261 Training for the Centenarian Decathlon', from:'Peter Attia', url:'https://peterattiamd.com/training-for-the-centenarian-decathlon/', why:'Train for the life you want at 80; movement as a long game' },
    { type:'podcast', title:'How to Assess & Improve All Aspects of Your Fitness', from:'Huberman with Andy Galpin', url:'https://www.hubermanlab.com/episode/dr-andy-galpin-how-to-assess-improve-all-aspects-of-your-fitness', why:"Galpin's map of fitness and a simple weekly structure" },
    { type:'video', title:'Why VO2 Max Is a Powerful Longevity Marker', from:'Rhonda Patrick', url:'https://foundmyfitness.com/episodes/exercise-powerful-longevity-drug', why:'Exercise as the strongest lever for healthy aging' },
    { type:'podcast', title:'Why Runners Must Get Strong', from:'Tim DiFrancesco on The Strength Running Podcast', url:'https://strengthrunning.libsyn.com/189-former-la-lakers-strength-coach-tim-difrancesco-on-why-runners-must-get-strong', why:'The former Lakers strength coach on why anyone who moves should also lift' },
    { type:'study', title:'Daily steps and all-cause mortality: a meta-analysis of 15 international cohorts (2022)', from:'Paluch et al., The Lancet Public Health', url:'https://pmc.ncbi.nlm.nih.gov/articles/PMC9289978/', why:'More daily steps, lower risk of early death, leveling off well below 10,000 for older adults' },
  ],
  4: [ // Zone 2
    { type:'podcast', title:'#85 Zone 2 Training and Metabolic Health', from:'Peter Attia with Iñigo San-Millán', url:'https://peterattiamd.com/inigosanmillan/', why:'The researcher behind Zone 2 on what it does for your metabolism' },
    { type:'video', title:'How to find your Zone 2 without using a lactate meter', from:'Peter Attia with Iñigo San-Millán', url:'https://peterattiamd.com/how-to-find-your-zone-2-without-using-a-lactate-meter/', why:'The talk test: some effort, but you can still hold a conversation' },
    { type:'podcast', title:'How to Build Physical Endurance & Lose Fat', from:'Huberman with Andy Galpin', url:'https://www.hubermanlab.com/episode/dr-andy-galpin-how-to-build-physical-endurance-and-lose-fat', why:'How long, how often and how easy endurance work should be' },
    { type:'video', title:'How Norwegian 4x4 Intervals Improve VO2 Max', from:'Rhonda Patrick', url:'https://www.foundmyfitness.com/episodes/workout-to-increase-vo2-max', why:'The one hard session a week that complements easy Zone 2' },
  ],
  5: [ // Progressive overload
    { type:'podcast', title:'Optimal Protocols to Build Strength & Grow Muscles', from:'Huberman with Andy Galpin', url:'https://www.hubermanlab.com/episode/dr-andy-galpin-optimal-protocols-to-build-strength-and-grow-muscles', why:'Sets, reps and load for strength versus size' },
    { type:'podcast', title:'Training principles for mass and strength', from:'Layne Norton on The Peter Attia Drive', url:'https://biolayne.com/podcast/guest-spot/training-principles-for-mass-and-strength-changing-views-on-nutrition-creatine-supplementation-and-more-the-peter-attia-drive/', why:'How a powerlifter and scientist progresses, plus creatine' },
    { type:'article', title:'Progressive Overload Explained: How to Keep Getting Stronger', from:'NASM', url:'https://www.nasm.org/resource-center/blog/training/progressive-overload', why:'The plain-language version' },
    { type:'study', title:'Progressive overload without progressing load? (2022)', from:'Plotkin et al., PeerJ', url:'https://peerj.com/articles/14142', why:'Adding reps built about as much muscle as adding weight' },
    { type:'study', title:'Dose-response relationship between weekly resistance training volume and increases in muscle mass (2017)', from:'Schoenfeld et al., Journal of Sports Sciences', url:'https://pubmed.ncbi.nlm.nih.gov/27433992/', why:'More weekly sets build more muscle, up to a point' },
  ],
  6: [ // Recovery
    { type:'podcast', title:'Maximize Recovery to Achieve Fitness & Performance Goals', from:'Huberman with Andy Galpin', url:'https://www.hubermanlab.com/episode/guest-series-dr-andy-galpin-maximize-recovery-to-achieve-fitness-and-performance-goals', why:'How to tell whether you are recovered, and what speeds it up' },
    { type:'video', title:'How Dr. Rhonda Patrick Uses Sauna and Heat', from:'Rhonda Patrick', url:'https://foundmyfitness.com/episodes/sauna-routine-rhonda-medcram', why:'An optional heat routine: temperature, time, rehydration' },
    { type:'study', title:'Post-exercise cold water immersion attenuates long-term adaptations in muscle to strength training (2015)', from:'Roberts et al., Journal of Physiology', url:'https://pmc.ncbi.nlm.nih.gov/articles/PMC4594298/', why:'Ice baths right after lifting reduced muscle and strength gains' },
  ],
  7: [ // Stress and balance
    { type:'podcast', title:'Tools for Managing Stress & Anxiety', from:'Andrew Huberman', url:'https://www.hubermanlab.com/episode/tools-for-managing-stress-and-anxiety', why:'Tools that work in the moment, including the physiological sigh' },
    { type:'study', title:'Brief structured respiration practices enhance mood and reduce physiological arousal (2023)', from:'Balban, Huberman, Spiegel et al., Cell Reports Medicine', url:'https://pmc.ncbi.nlm.nih.gov/articles/PMC9873947/', why:'Five minutes of exhale-focused breathing a day lifted mood more than mindfulness meditation' },
    { type:'podcast', title:'#298 The impact of emotional health on longevity', from:'Peter Attia with Paul Conti', url:'https://peterattiamd.com/paulconti4/', why:'Why emotional health is part of physical health' },
  ],
  8: [ // Hydration
    { type:'article', title:'Optimize Your Water Quality and Intake for Health', from:'Andrew Huberman', url:'https://hubermanlab.com/newsletter/optimize-your-water-quality-and-intake-for-health', why:'A simple daily target spread across the first 10 waking hours' },
    { type:'podcast', title:'Optimal Nutrition & Supplementation for Fitness', from:'Huberman with Andy Galpin', url:'https://www.hubermanlab.com/episode/dr-andy-galpin-optimal-nutrition-and-supplementation-for-fitness', why:'How much to drink around training, plus electrolytes on hard days' },
    { type:'study', title:'Exercise and fluid replacement, ACSM position stand (2007)', from:'Sawka et al., Medicine & Science in Sports & Exercise', url:'https://pubmed.ncbi.nlm.nih.gov/17277604/', why:'The standard reference on fluids and electrolytes during exercise' },
  ],
}
