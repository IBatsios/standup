-- Seed data for StandUp Dashboard
-- Sci-Fi Universe Edition: Star Trek | Star Wars | Battlestar Galactica
-- Password hashes (bcrypt, 10 rounds):
--   "admin"    = $2b$10$24belUZ8U/.4N6VG6X05l.Zt5oyr1tLd1/zaYf0WtLUjEFp7HqMAG
--   "password" = $2b$10$Tajzhj9y1U2yB1xs5Q/MReO/ZIDknvT8AHv.1HgpKa/vslG4usOtO

-- ============================================================
-- CLIENTS
-- ============================================================
INSERT INTO clients (id, name) VALUES
    ('lucasfilm',    'LucasFilm'),
    ('paramount',    'Paramount'),
    ('disney',       'Disney'),
    ('nbcuniversal', 'NBC Universal'),
    ('internal',     'Internal')
ON CONFLICT DO NOTHING;

-- ============================================================
-- TEAMS (stub first, foreign keys updated after users)
-- ============================================================
INSERT INTO teams (id, name) VALUES
    ('startrek',      'Star Trek'),
    ('starwars',      'Star Wars'),
    ('battlestar',    'Battlestar Galactica')
ON CONFLICT DO NOTHING;

-- ============================================================
-- USERS
-- ============================================================
-- "admin" hash: $2b$10$24belUZ8U/.4N6VG6X05l.Zt5oyr1tLd1/zaYf0WtLUjEFp7HqMAG
-- "password" hash: $2b$10$Tajzhj9y1U2yB1xs5Q/MReO/ZIDknvT8AHv.1HgpKa/vslG4usOtO

INSERT INTO users (id, name, role, team_id, password_hash) VALUES
    -- Owners (the creators)
    ('gene.roddenberry', 'Gene Roddenberry',  'owner', NULL, '$2b$10$24belUZ8U/.4N6VG6X05l.Zt5oyr1tLd1/zaYf0WtLUjEFp7HqMAG'),
    ('george.lucas',     'George Lucas',      'owner', NULL, '$2b$10$24belUZ8U/.4N6VG6X05l.Zt5oyr1tLd1/zaYf0WtLUjEFp7HqMAG'),
    ('ronald.moore',     'Ronald D. Moore',   'owner', NULL, '$2b$10$24belUZ8U/.4N6VG6X05l.Zt5oyr1tLd1/zaYf0WtLUjEFp7HqMAG'),

    -- Managers (the captains / heroes)
    ('james.kirk',    'James T. Kirk',   'manager', NULL, '$2b$10$Tajzhj9y1U2yB1xs5Q/MReO/ZIDknvT8AHv.1HgpKa/vslG4usOtO'),
    ('luke.skywalker','Luke Skywalker',  'manager', NULL, '$2b$10$Tajzhj9y1U2yB1xs5Q/MReO/ZIDknvT8AHv.1HgpKa/vslG4usOtO'),
    ('william.adama', 'William Adama',   'manager', NULL, '$2b$10$Tajzhj9y1U2yB1xs5Q/MReO/ZIDknvT8AHv.1HgpKa/vslG4usOtO'),

    -- Team Leads
    ('spock',         'Spock',           'team_lead', 'startrek',   '$2b$10$Tajzhj9y1U2yB1xs5Q/MReO/ZIDknvT8AHv.1HgpKa/vslG4usOtO'),
    ('han.solo',      'Han Solo',        'team_lead', 'starwars',   '$2b$10$Tajzhj9y1U2yB1xs5Q/MReO/ZIDknvT8AHv.1HgpKa/vslG4usOtO'),
    ('kara.thrace',   'Kara Thrace',     'team_lead', 'battlestar', '$2b$10$Tajzhj9y1U2yB1xs5Q/MReO/ZIDknvT8AHv.1HgpKa/vslG4usOtO'),

    -- Star Trek crew (employees)
    ('leonard.mccoy', 'Leonard McCoy',   'employee', 'startrek', '$2b$10$Tajzhj9y1U2yB1xs5Q/MReO/ZIDknvT8AHv.1HgpKa/vslG4usOtO'),
    ('montgomery.scott','Montgomery Scott','employee','startrek', '$2b$10$Tajzhj9y1U2yB1xs5Q/MReO/ZIDknvT8AHv.1HgpKa/vslG4usOtO'),
    ('nyota.uhura',   'Nyota Uhura',     'employee', 'startrek', '$2b$10$Tajzhj9y1U2yB1xs5Q/MReO/ZIDknvT8AHv.1HgpKa/vslG4usOtO'),
    ('hikaru.sulu',   'Hikaru Sulu',     'employee', 'startrek', '$2b$10$Tajzhj9y1U2yB1xs5Q/MReO/ZIDknvT8AHv.1HgpKa/vslG4usOtO'),

    -- Star Wars crew (employees)
    ('leia.organa',   'Leia Organa',     'employee', 'starwars', '$2b$10$Tajzhj9y1U2yB1xs5Q/MReO/ZIDknvT8AHv.1HgpKa/vslG4usOtO'),
    ('chewbacca',     'Chewbacca',       'employee', 'starwars', '$2b$10$Tajzhj9y1U2yB1xs5Q/MReO/ZIDknvT8AHv.1HgpKa/vslG4usOtO'),
    ('r2.d2',         'R2-D2',           'employee', 'starwars', '$2b$10$Tajzhj9y1U2yB1xs5Q/MReO/ZIDknvT8AHv.1HgpKa/vslG4usOtO'),
    ('lando.calrissian','Lando Calrissian','employee','starwars', '$2b$10$Tajzhj9y1U2yB1xs5Q/MReO/ZIDknvT8AHv.1HgpKa/vslG4usOtO'),

    -- BSG crew (employees)
    ('lee.adama',     'Lee Adama',       'employee', 'battlestar', '$2b$10$Tajzhj9y1U2yB1xs5Q/MReO/ZIDknvT8AHv.1HgpKa/vslG4usOtO'),
    ('gaius.baltar',  'Gaius Baltar',    'employee', 'battlestar', '$2b$10$Tajzhj9y1U2yB1xs5Q/MReO/ZIDknvT8AHv.1HgpKa/vslG4usOtO'),
    ('sharon.valerii','Sharon Valerii',  'employee', 'battlestar', '$2b$10$Tajzhj9y1U2yB1xs5Q/MReO/ZIDknvT8AHv.1HgpKa/vslG4usOtO'),
    ('galen.tyrol',   'Galen Tyrol',     'employee', 'battlestar', '$2b$10$Tajzhj9y1U2yB1xs5Q/MReO/ZIDknvT8AHv.1HgpKa/vslG4usOtO')
ON CONFLICT DO NOTHING;

-- ============================================================
-- UPDATE TEAMS with manager/lead references
-- ============================================================
UPDATE teams SET manager_id = 'james.kirk',    lead_id = 'spock'       WHERE id = 'startrek';
UPDATE teams SET manager_id = 'luke.skywalker', lead_id = 'han.solo'   WHERE id = 'starwars';
UPDATE teams SET manager_id = 'william.adama', lead_id = 'kara.thrace' WHERE id = 'battlestar';

-- ============================================================
-- TEAM MEMBERSHIPS (user_teams junction table)
-- ============================================================
INSERT INTO user_teams (user_id, team_id) VALUES
    -- Star Trek team
    ('spock',             'startrek'),
    ('leonard.mccoy',     'startrek'),
    ('montgomery.scott',  'startrek'),
    ('nyota.uhura',       'startrek'),
    ('hikaru.sulu',       'startrek'),

    -- Star Wars team
    ('han.solo',          'starwars'),
    ('leia.organa',       'starwars'),
    ('chewbacca',         'starwars'),
    ('r2.d2',             'starwars'),
    ('lando.calrissian',  'starwars'),

    -- Battlestar team
    ('kara.thrace',       'battlestar'),
    ('lee.adama',         'battlestar'),
    ('gaius.baltar',      'battlestar'),
    ('sharon.valerii',    'battlestar'),
    ('galen.tyrol',       'battlestar')
ON CONFLICT DO NOTHING;

-- ============================================================
-- TASKS — Star Trek crew
-- ============================================================

-- Spock (team lead, science officer)
INSERT INTO tasks (user_id, section, text, client_id, expected_time, actual_time, sort_order) VALUES
    ('spock', 'today', 'Completed sensor analysis of Neutral Zone anomaly — filed report to Starfleet Command', 'paramount', 90, 85, 0),
    ('spock', 'today', 'Recalibrated warp field equations after unexpected variance at Warp 7', 'internal', 60, 72, 1),
    ('spock', 'today', 'Assisted Dr. McCoy in identifying alien pathogen from landing party samples', 'paramount', 45, 45, 2),
    ('spock', 'tomorrow', 'Run probability simulations for approach to Klingon border', 'paramount', 120, NULL, 0),
    ('spock', 'tomorrow', 'Audit science station console firmware — 3 stations flagged', 'internal', 90, NULL, 1),
    ('spock', 'future', 'Compile 5-year mission data into Starfleet science archive', 'paramount', 480, NULL, 0),
    ('spock', 'future', 'Develop new universal translator module for uncharted species', 'paramount', 360, NULL, 1),
    ('spock', 'future', 'Document Vulcan nerve pinch training program for security team', 'internal', 120, NULL, 2)
ON CONFLICT DO NOTHING;

-- McCoy (medical)
INSERT INTO tasks (user_id, section, text, client_id, expected_time, actual_time, sort_order) VALUES
    ('leonard.mccoy', 'today', 'Treated 4 crew members for radiation exposure from Jefferies tube leak', 'internal', 60, 80, 0),
    ('leonard.mccoy', 'today', 'Synthesized antidote for Rigellian fever outbreak in Engineering', 'paramount', 120, 115, 1),
    ('leonard.mccoy', 'tomorrow', 'Conduct annual physicals for Alpha shift bridge crew', 'internal', 180, NULL, 0),
    ('leonard.mccoy', 'tomorrow', 'Review Starfleet medical database updates — new pathogen entries', 'paramount', 60, NULL, 1),
    ('leonard.mccoy', 'future', 'Write up Rigellian fever case study for Starfleet Medical Journal', 'paramount', 240, NULL, 0),
    ('leonard.mccoy', 'future', 'Upgrade sickbay biobed diagnostic software', 'internal', 180, NULL, 1)
ON CONFLICT DO NOTHING;

-- Scotty (engineering)
INSERT INTO tasks (user_id, section, text, client_id, expected_time, actual_time, sort_order) VALUES
    ('montgomery.scott', 'today', 'Repaired port nacelle plasma conduit — she cannae take much more', 'internal', 120, 195, 0),
    ('montgomery.scott', 'today', 'Boosted transporter range by 15% using pattern buffer trick', 'internal', 90, 60, 1),
    ('montgomery.scott', 'tomorrow', 'Rebuild EPS relay network on Deck 7 after power surge', 'internal', 240, NULL, 0),
    ('montgomery.scott', 'tomorrow', 'Test emergency warp containment failover procedures', 'internal', 120, NULL, 1),
    ('montgomery.scott', 'future', 'Design upgrade to dilithium crystal articulation frame', 'paramount', 480, NULL, 0),
    ('montgomery.scott', 'future', 'Document all non-standard Engineering workarounds for Starfleet R&D', 'paramount', 300, NULL, 1)
ON CONFLICT DO NOTHING;

-- Uhura (comms)
INSERT INTO tasks (user_id, section, text, client_id, expected_time, actual_time, sort_order) VALUES
    ('nyota.uhura', 'today', 'Decoded encrypted Romulan transmission — flagged for Spock review', 'paramount', 75, 90, 0),
    ('nyota.uhura', 'today', 'Re-established subspace comms with Starbase 11 after ion storm', 'paramount', 45, 35, 1),
    ('nyota.uhura', 'tomorrow', 'Calibrate long-range antenna array for deep space frequencies', 'internal', 60, NULL, 0),
    ('nyota.uhura', 'future', 'Build new comm protocol for first contact scenarios', 'paramount', 300, NULL, 0)
ON CONFLICT DO NOTHING;

-- Sulu (helm)
INSERT INTO tasks (user_id, section, text, client_id, expected_time, actual_time, sort_order) VALUES
    ('hikaru.sulu', 'today', 'Executed evasive maneuver Gamma-7 during Klingon encounter — logged results', 'paramount', 30, 30, 0),
    ('hikaru.sulu', 'today', 'Plotted course corrections around unstable pulsar at coordinates 347-mark-6', 'internal', 45, 50, 1),
    ('hikaru.sulu', 'tomorrow', 'Run helm control response drills with junior officers', 'internal', 90, NULL, 0),
    ('hikaru.sulu', 'future', 'Chart new approach vectors through the Mutara Nebula', 'paramount', 180, NULL, 0)
ON CONFLICT DO NOTHING;

-- ============================================================
-- TASKS — Star Wars crew
-- ============================================================

-- Han Solo (team lead, smuggler/pilot)
INSERT INTO tasks (user_id, section, text, client_id, expected_time, actual_time, sort_order) VALUES
    ('han.solo', 'today', 'Completed Kessel Run calibration — Falcon hyperdrive back to 12 parsecs', 'lucasfilm', 120, 95, 0),
    ('han.solo', 'today', 'Negotiated supply drop with Jabba''s intermediary — avoided incident', 'lucasfilm', 60, 90, 1),
    ('han.solo', 'today', 'Debriefed Rebel Alliance on Imperial patrol patterns near Hoth', 'disney', 45, 45, 2),
    ('han.solo', 'tomorrow', 'Coordinate Millennium Falcon pre-jump maintenance with Chewie', 'internal', 90, NULL, 0),
    ('han.solo', 'tomorrow', 'Review Rebel evacuation route options for Hoth base', 'disney', 60, NULL, 1),
    ('han.solo', 'future', 'Source tibanna gas resupply through Lando''s Cloud City contact', 'lucasfilm', 180, NULL, 0),
    ('han.solo', 'future', 'Map Imperial blockade gaps in the Outer Rim', 'disney', 240, NULL, 1),
    ('han.solo', 'future', 'Train junior pilots on evasive asteroid field navigation', 'internal', 120, NULL, 2)
ON CONFLICT DO NOTHING;

-- Leia (leadership/comms)
INSERT INTO tasks (user_id, section, text, client_id, expected_time, actual_time, sort_order) VALUES
    ('leia.organa', 'today', 'Transmitted Death Star plans to Alliance High Command — confirmed receipt', 'disney', 30, 25, 0),
    ('leia.organa', 'today', 'Coordinated diplomatic outreach to Mon Calamari fleet admirals', 'disney', 90, 100, 1),
    ('leia.organa', 'tomorrow', 'Draft Alliance briefing on Imperial garrison strength at Endor', 'disney', 120, NULL, 0),
    ('leia.organa', 'tomorrow', 'Meet with Ewok village council re: ground support coordination', 'disney', 60, NULL, 1),
    ('leia.organa', 'future', 'Establish encrypted comms network across all Rebel cells', 'disney', 360, NULL, 0),
    ('leia.organa', 'future', 'Write post-battle after-action report for Battle of Yavin', 'lucasfilm', 180, NULL, 1)
ON CONFLICT DO NOTHING;

-- Chewbacca (engineering/co-pilot)
INSERT INTO tasks (user_id, section, text, client_id, expected_time, actual_time, sort_order) VALUES
    ('chewbacca', 'today', 'Rewired Falcon''s ion flux stabilizer — resolved navigation dropout issue', 'internal', 150, 140, 0),
    ('chewbacca', 'today', 'Repaired C-3PO after ambush on Cloud City — all 6 million parts accounted for', 'internal', 90, 120, 1),
    ('chewbacca', 'tomorrow', 'Full weapons systems diagnostic on Falcon turrets', 'internal', 60, NULL, 0),
    ('chewbacca', 'future', 'Retrofit Falcon with salvaged Imperial shield generator', 'lucasfilm', 480, NULL, 0)
ON CONFLICT DO NOTHING;

-- R2-D2 (systems/data)
INSERT INTO tasks (user_id, section, text, client_id, expected_time, actual_time, sort_order) VALUES
    ('r2.d2', 'today', 'Interfaced with Death Star network — extracted cell block detention records', 'disney', 15, 8, 0),
    ('r2.d2', 'today', 'Patched X-Wing targeting computer firmware before Battle of Yavin', 'lucasfilm', 30, 22, 1),
    ('r2.d2', 'tomorrow', 'Backup and encrypt all stolen Imperial data cylinders', 'disney', 45, NULL, 0),
    ('r2.d2', 'tomorrow', 'Diagnostic sweep of rebel base computer systems', 'disney', 60, NULL, 1),
    ('r2.d2', 'future', 'Compile full galactic navigation database update', 'lucasfilm', 240, NULL, 0)
ON CONFLICT DO NOTHING;

-- Lando (operations)
INSERT INTO tasks (user_id, section, text, client_id, expected_time, actual_time, sort_order) VALUES
    ('lando.calrissian', 'today', 'Managed Cloud City administrator duties — processed 47 permits', 'lucasfilm', 120, 110, 0),
    ('lando.calrissian', 'today', 'Coordinated Rebel fleet positioning for second Death Star assault', 'disney', 90, 95, 1),
    ('lando.calrissian', 'tomorrow', 'Debrief surviving Gold Squadron pilots from Endor engagement', 'disney', 60, NULL, 0),
    ('lando.calrissian', 'future', 'Rebuild Bespin tibanna gas export operation post-Imperial occupation', 'lucasfilm', 360, NULL, 0),
    ('lando.calrissian', 'future', 'Document lessons learned from Cloud City Imperial deal gone wrong', 'internal', 120, NULL, 1)
ON CONFLICT DO NOTHING;

-- ============================================================
-- TASKS — Battlestar Galactica crew
-- ============================================================

-- Kara "Starbuck" Thrace (team lead, CAG)
INSERT INTO tasks (user_id, section, text, client_id, expected_time, actual_time, sort_order) VALUES
    ('kara.thrace', 'today', 'Led CAP patrol — logged 2 Cylon Raider contacts, both neutralized', 'nbcuniversal', 90, 105, 0),
    ('kara.thrace', 'today', 'Debriefed Viper pilots after skirmish at Ragnar Anchorage', 'nbcuniversal', 60, 55, 1),
    ('kara.thrace', 'today', 'Submitted incident report for unauthorized use of Admiral''s Viper', 'internal', 30, 45, 2),
    ('kara.thrace', 'tomorrow', 'Run combat flight sims with nugget pilots — 4 trainees', 'internal', 180, NULL, 0),
    ('kara.thrace', 'tomorrow', 'Review Jump coordinates from Leoben''s intel — verify or discard', 'nbcuniversal', 90, NULL, 1),
    ('kara.thrace', 'future', 'Develop new anti-Cylon intercept tactics for Raider formation attacks', 'nbcuniversal', 300, NULL, 0),
    ('kara.thrace', 'future', 'Locate Arrow of Apollo on Caprica — solo recon mission', 'nbcuniversal', 480, NULL, 1),
    ('kara.thrace', 'future', 'Document Viper Mark VII vs Mark II performance delta under combat conditions', 'internal', 120, NULL, 2)
ON CONFLICT DO NOTHING;

-- Lee "Apollo" Adama
INSERT INTO tasks (user_id, section, text, client_id, expected_time, actual_time, sort_order) VALUES
    ('lee.adama', 'today', 'Commanded Viper escort for civilian fleet tylium ship resupply', 'nbcuniversal', 120, 110, 0),
    ('lee.adama', 'today', 'Reviewed and approved 12 pilot readiness certifications', 'internal', 60, 65, 1),
    ('lee.adama', 'tomorrow', 'Coordinate fleet-wide jump sequence drill with CIC', 'nbcuniversal', 90, NULL, 0),
    ('lee.adama', 'tomorrow', 'Meet with President Roslin re: Quorum of Twelve security briefing', 'nbcuniversal', 60, NULL, 1),
    ('lee.adama', 'future', 'Write updated rules of engagement for Cylon contact scenarios', 'nbcuniversal', 240, NULL, 0),
    ('lee.adama', 'future', 'Advocate for civilian representation in military operational planning', 'internal', 180, NULL, 1)
ON CONFLICT DO NOTHING;

-- Gaius Baltar (science/systems)
INSERT INTO tasks (user_id, section, text, client_id, expected_time, actual_time, sort_order) VALUES
    ('gaius.baltar', 'today', 'Ran Cylon detection test on 200 crew members — results inconclusive', 'nbcuniversal', 240, 260, 0),
    ('gaius.baltar', 'today', 'Patched CNP backdoor vulnerability in navigation computer — classified', 'internal', 180, 150, 1),
    ('gaius.baltar', 'tomorrow', 'Present new Cylon biological marker research to Admiral Adama', 'nbcuniversal', 90, NULL, 0),
    ('gaius.baltar', 'tomorrow', 'Continue tylium refinery efficiency calculations', 'nbcuniversal', 120, NULL, 1),
    ('gaius.baltar', 'future', 'Complete full CNP audit across all Colonial ship systems in the fleet', 'nbcuniversal', 600, NULL, 0),
    ('gaius.baltar', 'future', 'Develop reliable Cylon identification protocol — high priority', 'nbcuniversal', 480, NULL, 1)
ON CONFLICT DO NOTHING;

-- Sharon "Boomer" Valerii
INSERT INTO tasks (user_id, section, text, client_id, expected_time, actual_time, sort_order) VALUES
    ('sharon.valerii', 'today', 'Completed recon flight over Cylon-occupied Caprica — photos transmitted', 'nbcuniversal', 90, 85, 0),
    ('sharon.valerii', 'today', 'Filed anomalous memory gap report with Dr. Baltar — awaiting psych eval', 'internal', 30, 40, 1),
    ('sharon.valerii', 'tomorrow', 'Transport supply run to Zephyr — 0600 launch', 'nbcuniversal', 60, NULL, 0),
    ('sharon.valerii', 'future', 'Investigate origin of unexplained skill set: Cylon network intrusion proficiency', 'internal', 300, NULL, 0)
ON CONFLICT DO NOTHING;

-- Galen Tyrol (deck chief / maintenance)
INSERT INTO tasks (user_id, section, text, client_id, expected_time, actual_time, sort_order) VALUES
    ('galen.tyrol', 'today', 'Completed battle damage repairs on 6 Vipers after Ragnar engagement', 'internal', 240, 300, 0),
    ('galen.tyrol', 'today', 'Sourced replacement tylium injectors from Rising Star — logged manifest', 'nbcuniversal', 60, 55, 1),
    ('galen.tyrol', 'tomorrow', 'Perform full structural inspection on Raptor 312 after hard landing', 'internal', 180, NULL, 0),
    ('galen.tyrol', 'tomorrow', 'Cross-train 3 deck crew on Viper Mark VII fuel system differences', 'internal', 120, NULL, 1),
    ('galen.tyrol', 'future', 'Design improvised FTL drive from salvaged parts for disabled civilian ship', 'nbcuniversal', 480, NULL, 0),
    ('galen.tyrol', 'future', 'Catalog all spare parts inventory across 20 civilian ships in fleet', 'internal', 360, NULL, 1)
ON CONFLICT DO NOTHING;
