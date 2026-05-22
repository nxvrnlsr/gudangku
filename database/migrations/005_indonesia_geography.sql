-- ============================================================
-- Migration 005: Data Geografi Indonesia Lengkap
-- 38 Provinsi + Kota/Kabupaten Utama per Provinsi
-- ============================================================

-- Hapus data lama yang mungkin tidak lengkap, lalu isi ulang
-- Gunakan ON CONFLICT DO UPDATE agar idempotent

-- ── REGIONS (Provinsi) ────────────────────────────────────────
INSERT INTO regions (name, code) VALUES
  ('Aceh',                        'AC'),
  ('Sumatera Utara',              'SU'),
  ('Sumatera Barat',              'SB'),
  ('Riau',                        'RI'),
  ('Jambi',                       'JA'),
  ('Sumatera Selatan',            'SS'),
  ('Bengkulu',                    'BE'),
  ('Lampung',                     'LA'),
  ('Kepulauan Bangka Belitung',   'BB'),
  ('Kepulauan Riau',              'KR'),
  ('DKI Jakarta',                 'JK'),
  ('Jawa Barat',                  'JB'),
  ('Jawa Tengah',                 'JT'),
  ('DI Yogyakarta',               'YO'),
  ('Jawa Timur',                  'JI'),
  ('Banten',                      'BT'),
  ('Bali',                        'BA'),
  ('Nusa Tenggara Barat',         'NB'),
  ('Nusa Tenggara Timur',         'NT'),
  ('Kalimantan Barat',            'KB'),
  ('Kalimantan Tengah',           'KT'),
  ('Kalimantan Selatan',          'KS'),
  ('Kalimantan Timur',            'KI'),
  ('Kalimantan Utara',            'KU'),
  ('Sulawesi Utara',              'SA'),
  ('Sulawesi Tengah',             'ST'),
  ('Sulawesi Selatan',            'SN'),
  ('Sulawesi Tenggara',           'SG'),
  ('Gorontalo',                   'GO'),
  ('Sulawesi Barat',              'SR'),
  ('Maluku',                      'MA'),
  ('Maluku Utara',                'MU'),
  ('Papua Barat',                 'PB'),
  ('Papua',                       'PA'),
  ('Papua Selatan',               'PS'),
  ('Papua Tengah',                'PT'),
  ('Papua Pegunungan',            'PP'),
  ('Papua Barat Daya',            'PD')
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name;

-- ── CITIES (Kota/Kabupaten utama per Provinsi) ────────────────
INSERT INTO cities (region_id, name, code)
SELECT r.id, c.city_name, c.city_code
FROM (VALUES
  -- Aceh
  ('AC', 'Banda Aceh',         'AC-BNA'),
  ('AC', 'Lhokseumawe',        'AC-LSW'),
  ('AC', 'Langsa',             'AC-LGS'),
  ('AC', 'Sabang',             'AC-SBG'),
  -- Sumatera Utara
  ('SU', 'Medan',              'SU-MDN'),
  ('SU', 'Binjai',             'SU-BNJ'),
  ('SU', 'Pematangsiantar',    'SU-PST'),
  ('SU', 'Tebing Tinggi',      'SU-TBT'),
  ('SU', 'Padangsidimpuan',    'SU-PDG'),
  -- Sumatera Barat
  ('SB', 'Padang',             'SB-PDG'),
  ('SB', 'Bukittinggi',        'SB-BKT'),
  ('SB', 'Solok',              'SB-SLK'),
  ('SB', 'Payakumbuh',         'SB-PKB'),
  -- Riau
  ('RI', 'Pekanbaru',          'RI-PKU'),
  ('RI', 'Dumai',              'RI-DUM'),
  -- Jambi
  ('JA', 'Jambi',              'JA-JBI'),
  ('JA', 'Sungai Penuh',       'JA-SPH'),
  -- Sumatera Selatan
  ('SS', 'Palembang',          'SS-PLM'),
  ('SS', 'Prabumulih',         'SS-PBM'),
  ('SS', 'Lubuklinggau',       'SS-LLG'),
  ('SS', 'Pagar Alam',         'SS-PAL'),
  -- Bengkulu
  ('BE', 'Bengkulu',           'BE-BKL'),
  -- Lampung
  ('LA', 'Bandar Lampung',     'LA-BDL'),
  ('LA', 'Metro',              'LA-MET'),
  -- Kepulauan Bangka Belitung
  ('BB', 'Pangkalpinang',      'BB-PKP'),
  -- Kepulauan Riau
  ('KR', 'Batam',              'KR-BTM'),
  ('KR', 'Tanjungpinang',      'KR-TJP'),
  -- DKI Jakarta
  ('JK', 'Jakarta Pusat',      'JK-JKP'),
  ('JK', 'Jakarta Utara',      'JK-JKU'),
  ('JK', 'Jakarta Barat',      'JK-JKB'),
  ('JK', 'Jakarta Selatan',    'JK-JKS'),
  ('JK', 'Jakarta Timur',      'JK-JKT'),
  -- Jawa Barat
  ('JB', 'Bandung',            'JB-BDG'),
  ('JB', 'Bekasi',             'JB-BEK'),
  ('JB', 'Depok',              'JB-DPK'),
  ('JB', 'Bogor',              'JB-BGR'),
  ('JB', 'Cimahi',             'JB-CMH'),
  ('JB', 'Cirebon',            'JB-CRB'),
  ('JB', 'Sukabumi',           'JB-SKB'),
  ('JB', 'Tasikmalaya',        'JB-TSM'),
  -- Jawa Tengah
  ('JT', 'Semarang',           'JT-SMG'),
  ('JT', 'Surakarta',          'JT-SKA'),
  ('JT', 'Salatiga',           'JT-SLT'),
  ('JT', 'Magelang',           'JT-MGL'),
  ('JT', 'Pekalongan',         'JT-PKL'),
  ('JT', 'Tegal',              'JT-TGL'),
  -- DI Yogyakarta
  ('YO', 'Yogyakarta',         'YO-YGY'),
  -- Jawa Timur
  ('JI', 'Surabaya',           'JI-SBY'),
  ('JI', 'Malang',             'JI-MLG'),
  ('JI', 'Batu',               'JI-BTU'),
  ('JI', 'Blitar',             'JI-BLT'),
  ('JI', 'Kediri',             'JI-KDR'),
  ('JI', 'Madiun',             'JI-MDN'),
  ('JI', 'Mojokerto',          'JI-MJK'),
  ('JI', 'Pasuruan',           'JI-PSR'),
  ('JI', 'Probolinggo',        'JI-PRB'),
  -- Banten
  ('BT', 'Serang',             'BT-SRG'),
  ('BT', 'Tangerang',          'BT-TNG'),
  ('BT', 'Tangerang Selatan',  'BT-TGS'),
  ('BT', 'Cilegon',            'BT-CLG'),
  -- Bali
  ('BA', 'Denpasar',           'BA-DPS'),
  -- Nusa Tenggara Barat
  ('NB', 'Mataram',            'NB-MTR'),
  ('NB', 'Bima',               'NB-BIM'),
  -- Nusa Tenggara Timur
  ('NT', 'Kupang',             'NT-KPG'),
  -- Kalimantan Barat
  ('KB', 'Pontianak',          'KB-PTK'),
  ('KB', 'Singkawang',         'KB-SKW'),
  -- Kalimantan Tengah
  ('KT', 'Palangka Raya',      'KT-PKY'),
  -- Kalimantan Selatan
  ('KS', 'Banjarmasin',        'KS-BJM'),
  ('KS', 'Banjarbaru',         'KS-BJB'),
  -- Kalimantan Timur
  ('KI', 'Samarinda',          'KI-SMD'),
  ('KI', 'Balikpapan',         'KI-BPN'),
  ('KI', 'Bontang',            'KI-BTG'),
  -- Kalimantan Utara
  ('KU', 'Tarakan',            'KU-TRK'),
  ('KU', 'Nunukan',            'KU-NNK'),
  -- Sulawesi Utara
  ('SA', 'Manado',             'SA-MND'),
  ('SA', 'Bitung',             'SA-BTG'),
  ('SA', 'Tomohon',            'SA-TMH'),
  ('SA', 'Kotamobagu',         'SA-KTM'),
  -- Sulawesi Tengah
  ('ST', 'Palu',               'ST-PLU'),
  -- Sulawesi Selatan
  ('SN', 'Makassar',           'SN-MKS'),
  ('SN', 'Parepare',           'SN-PPR'),
  ('SN', 'Palopo',             'SN-PLP'),
  -- Sulawesi Tenggara
  ('SG', 'Kendari',            'SG-KDR'),
  ('SG', 'Baubau',             'SG-BBU'),
  -- Gorontalo
  ('GO', 'Gorontalo',          'GO-GTO'),
  -- Sulawesi Barat
  ('SR', 'Mamuju',             'SR-MMJ'),
  -- Maluku
  ('MA', 'Ambon',              'MA-AMB'),
  ('MA', 'Tual',               'MA-TUL'),
  -- Maluku Utara
  ('MU', 'Ternate',            'MU-TTE'),
  ('MU', 'Tidore Kepulauan',   'MU-TDR'),
  -- Papua Barat
  ('PB', 'Manokwari',          'PB-MKW'),
  ('PB', 'Sorong',             'PB-SOQ'),
  -- Papua
  ('PA', 'Jayapura',           'PA-DJJ'),
  ('PA', 'Merauke',            'PA-MKQ'),
  -- Papua Selatan
  ('PS', 'Merauke',            'PS-MRK'),
  -- Papua Tengah
  ('PT', 'Nabire',             'PT-NBR'),
  -- Papua Pegunungan
  ('PP', 'Wamena',             'PP-WMN'),
  -- Papua Barat Daya
  ('PD', 'Sorong',             'PD-SRG')
) AS c(region_code, city_name, city_code)
JOIN regions r ON r.code = c.region_code
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, region_id = EXCLUDED.region_id;
