-- devmultigroup.com — seed data (Türkçe). Idempotent via INSERT OR REPLACE.
-- Built from verified public sources (Kommunity, YouTube @devmultigroup, GitHub
-- Developer-MultiGroup, LinkedIn). Turkish apostrophes use ’ (U+2019) to avoid
-- SQL escaping.

-- retired: Kommunity link removed from the links page
DELETE FROM links WHERE id = 'lnk-kommunity';

-- ── settings ────────────────────────────────────────────────────────────────
INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES
  ('site_title', 'Developer MultiGroup', unixepoch()),
  ('site_tagline', 'Geliştiriciler birlikte gelişir', unixepoch()),
  ('site_description', 'Developer MultiGroup; iOS, web, veri ve yapay zekâ alanlarında odaklı toplulukları bir araya getiren gönüllü bir Türk yazılım topluluğu — buluşmalar, konferanslar ve akademisi MultiAcademy ile ücretsiz bootcamp’ler.', unixepoch()),
  ('ga_measurement_id', 'G-RG06NCJRPR', unixepoch()),
  ('gsc_verification', 'F5byYs0EoXAfSmcJvKPHHPmnwImpvdSsNbApjd7BLEc', unixepoch()),
  ('banner_enabled', '1', unixepoch()),
  ('stat_events', '100+', unixepoch()),
  ('stat_members', '15.000+', unixepoch()),
  ('stat_recordings', '17+', unixepoch()),
  ('stat_companies', '25+', unixepoch()),
  ('stat_cities', 'İstanbul', unixepoch());

-- ── recordings (YouTube playlist’leri — gerçek id’ler) ───────────────────────
INSERT OR REPLACE INTO recordings (id, title, description, youtube_url, playlist_id, cover_image, category, video_count, sort_order, is_active) VALUES
  ('rec-modern-ios', 'Modern iOS Programming Course', 'Swift ve SwiftUI’yı kapsayan eksiksiz bir iOS geliştirme kursu.', 'https://www.youtube.com/playlist?list=PLQvJkakaBRKetW7Jezk3NOPWkZuVCxYmL', 'PLQvJkakaBRKetW7Jezk3NOPWkZuVCxYmL', '', 'bootcamp', 16, 10, 1),
  ('rec-genai-gemini', 'GenAI Fundamentals with Gemini', 'Google Gemini etrafında kurgulanmış üretken yapay zekâ temelleri.', 'https://www.youtube.com/playlist?list=PLQvJkakaBRKcEf3tq169jkNvoyiQN2XzN', 'PLQvJkakaBRKcEf3tq169jkNvoyiQN2XzN', '', 'bootcamp', 16, 20, 1),
  ('rec-frontend-foundation', 'Foundation Frontend Web Development Course', 'Sıfırdan frontend web geliştirme.', 'https://www.youtube.com/playlist?list=PLQvJkakaBRKdcsPly1CW1lxgovGMf-kDS', 'PLQvJkakaBRKdcsPly1CW1lxgovGMf-kDS', '', 'bootcamp', 15, 30, 1),
  ('rec-zero2end-ml', 'Zero2End ML Course', 'Uçtan uca makine öğrenmesi kurs serisi.', 'https://www.youtube.com/playlist?list=PLQvJkakaBRKe5IU_UxyfGQrLm3Ue5e-Jo', 'PLQvJkakaBRKe5IU_UxyfGQrLm3Ue5e-Jo', '', 'bootcamp', 13, 40, 1),
  ('rec-build-with-ai', 'Build With AI — Google Sertifika Kursu', 'Google iş birliğiyle “Build With AI” sertifika kursu.', 'https://www.youtube.com/playlist?list=PLQvJkakaBRKdFM5xratmxXh65IKc66d1E', 'PLQvJkakaBRKdFM5xratmxXh65IKc66d1E', '', 'bootcamp', 6, 50, 1),
  ('rec-powerbi', 'Practical Power BI for Data Analysis', 'Veri analizi için Power BI sertifika kursu.', 'https://www.youtube.com/playlist?list=PLQvJkakaBRKdL45ciARETGgAOhZV-XNi-', 'PLQvJkakaBRKdL45ciARETGgAOhZV-XNi-', '', 'bootcamp', 8, 60, 1),
  ('rec-android-blastoff', 'Android Blast Off Bootcamp', 'Jetpack Compose ile modern Android.', 'https://www.youtube.com/playlist?list=PLQvJkakaBRKexol1EmBoauAoqiys4i8TH', 'PLQvJkakaBRKexol1EmBoauAoqiys4i8TH', '', 'bootcamp', 8, 70, 1),
  ('rec-android12', 'Android 12 Bootcamp — Etap 1', 'Android 12 bootcamp’inin ilk etabı.', 'https://www.youtube.com/playlist?list=PLQvJkakaBRKch5Ioyb-iGc2fOmseeCadq', 'PLQvJkakaBRKch5Ioyb-iGc2fOmseeCadq', '', 'bootcamp', 10, 80, 1),
  ('rec-web-dev-conf-25', 'Web Developer Conference 2025', 'Web Developer Conference 2025 kayıtları.', 'https://www.youtube.com/playlist?list=PLQvJkakaBRKc_BLNIXtkH0i3yoVm32cTK', 'PLQvJkakaBRKc_BLNIXtkH0i3yoVm32cTK', '', 'event', 6, 90, 1),
  ('rec-data-conf-25', 'Data Science Conference ’25', 'Data Science Conference 2025 kayıtları.', 'https://www.youtube.com/playlist?list=PLQvJkakaBRKeVO2olL9wmrzj4Yhx5Pc9A', 'PLQvJkakaBRKeVO2olL9wmrzj4Yhx5Pc9A', '', 'event', 6, 100, 1),
  ('rec-data-summit-25', 'Data Science Summit 2025', 'Data Science Summit 2025 kayıtları.', 'https://www.youtube.com/playlist?list=PLQvJkakaBRKc5tKHO1vbTOFovn6JF-8Qe', 'PLQvJkakaBRKc5tKHO1vbTOFovn6JF-8Qe', '', 'event', 3, 110, 1),
  ('rec-datacommit', 'DataCommit', 'Uzmanlarla veri odaklı soru-cevap serisi.', 'https://www.youtube.com/playlist?list=PLQvJkakaBRKcsi8mySTkgLvnrz0dSyIRF', 'PLQvJkakaBRKcsi8mySTkgLvnrz0dSyIRF', '', 'series', 8, 120, 1),
  ('rec-hr-break', 'HR Break', 'Kariyer ve İK odaklı konuşma serisi.', 'https://www.youtube.com/playlist?list=PLQvJkakaBRKcXckoA66Tvnr6tq7UrGEz-', 'PLQvJkakaBRKcXckoA66Tvnr6tq7UrGEz-', '', 'series', 8, 130, 1),
  ('rec-sohbet-24', 'Sohbet Muhabbet ’24', 'Sektör ve yazılım kariyeri üzerine samimi sohbetler, 2024.', 'https://www.youtube.com/playlist?list=PLQvJkakaBRKdP2WOhT-IQjmAnBmtSV63B', 'PLQvJkakaBRKdP2WOhT-IQjmAnBmtSV63B', '', 'talk', 9, 140, 1),
  ('rec-sohbet-23', 'Sohbet Muhabbet ’23', 'Sektör ve yazılım kariyeri üzerine samimi sohbetler, 2023.', 'https://www.youtube.com/playlist?list=PLQvJkakaBRKcq0UXHZoWXW3eWtk-gStv0', 'PLQvJkakaBRKcq0UXHZoWXW3eWtk-gStv0', '', 'talk', 4, 150, 1),
  ('rec-powertech-girls', 'PowerTech Girls', 'Teknolojide kadın odaklı içerik serisi.', 'https://www.youtube.com/playlist?list=PLQvJkakaBRKfIhxzT0gikU5iW5NzgaO1G', 'PLQvJkakaBRKfIhxzT0gikU5iW5NzgaO1G', '', 'series', 2, 160, 1),
  ('rec-dev-oluyorum-ios', 'Developer Oluyorum: iOS', '“Developer Oluyorum” serisi — iOS yolu.', 'https://www.youtube.com/playlist?list=PLQvJkakaBRKdqwVuWVqYrrtkiKppm4oO3', 'PLQvJkakaBRKdqwVuWVqYrrtkiKppm4oO3', '', 'series', 2, 170, 1);

-- ── links (linktree yerine) ──────────────────────────────────────────────────
INSERT OR REPLACE INTO links (id, label, url, description, icon, group_name, accent, sort_order, is_active) VALUES
  ('lnk-events', 'Yaklaşan Etkinlikler', 'https://gathin.com/communities/multigroup-community-34813861558366504236', 'Sırada ne var, kayıt ol', 'calendar', 'primary', 'iris', 10, 1),
  ('lnk-academy', 'MultiAcademy', 'https://gathin.com/communities/multiacademy-community-94761667282726876508', 'Ücretsiz bootcamp’ler ve kurslar', 'book-open', 'academy', 'lime', 30, 1),
  ('lnk-blog', 'Blog’umuzu Oku', '/blog', 'Notlar, rehberler ve özetler', 'pen', 'communities', 'magenta', 40, 1),
  ('lnk-recordings', 'Etkinlik Kayıtları', '/recordings', 'Konuşmaları ve bootcamp’leri izle', 'play', 'communities', 'amber', 50, 1),
  ('lnk-github', 'GitHub', 'https://github.com/multigroupco', 'Açık kaynak ve kaynaklar', 'github', 'communities', 'violet', 60, 1),
  ('lnk-ig', 'Instagram', 'https://www.instagram.com/devmultigroup/', '@devmultigroup', 'instagram', 'social', 'magenta', 70, 1),
  ('lnk-x', 'X (Twitter)', 'https://twitter.com/devmultigroup', '@devmultigroup', 'twitter', 'social', 'iris', 80, 1),
  ('lnk-linkedin', 'LinkedIn', 'https://www.linkedin.com/company/developermultigroup', 'Developer MultiGroup', 'linkedin', 'social', 'cyan', 90, 1),
  ('lnk-youtube', 'YouTube', 'https://www.youtube.com/@devmultigroup', 'Konuşmalar ve bootcamp kayıtları', 'youtube', 'social', 'coral', 100, 1),
  ('lnk-ds-awesome', 'Data Science Awesome', 'https://github.com/Developer-MultiGroup/DMG-Data-Science-Awesome', 'Seçilmiş veri bilimi kaynakları', 'layers', 'resources', 'cyan', 110, 1);

-- ── team (role = membership title; team = active area; bios/socials boş, sonra) ─
DELETE FROM team_members;
INSERT OR REPLACE INTO team_members (id, name, role, team, bio, avatar_url, community, socials, sort_order, is_active) VALUES
  ('team-01', 'Serkan Alç', 'Partner Manager', 'Communities · DevRel', '', '', 'multigroup', '{}', 10, 1),
  ('team-02', 'Furkan Ünsalan', 'Executive Member', 'Web Development Team', '', '', 'multigroup', '{}', 20, 1),
  ('team-03', 'Batuhan Yalçın', 'Executive Member', 'QA', '', '', 'multigroup', '{}', 30, 1),
  ('team-04', 'Zerrin Ayaz', 'Associate Member', 'Operation Team', '', '', 'multigroup', '{}', 40, 1),
  ('team-05', 'Alptuğ Gürler', 'Associate Member', 'Mobile Development Team', '', '', 'multigroup', '{}', 50, 1),
  ('team-06', 'Azra Çalışkan', 'Pioneer Member', 'Social Media Team', '', '', 'multigroup', '{}', 60, 1),
  ('team-07', 'Seda Savaş', 'Pioneer Member', '', '', '', 'multigroup', '{}', 70, 1),
  ('team-08', 'Gizem Arpay', 'Pioneer Member', 'Web Development Team', '', '', 'multigroup', '{}', 80, 1),
  ('team-09', 'Mutlu Ozkurt', 'Pioneer Member', 'Data Science Team', '', '', 'multigroup', '{}', 90, 1),
  ('team-10', 'Dalida Dikici', 'Pioneer Member', 'Data Science Team', '', '', 'multigroup', '{}', 100, 1),
  ('team-11', 'Nuriye Dezcan', 'Pioneer Member', 'Data Science Team', '', '', 'multigroup', '{}', 110, 1),
  ('team-12', 'Evren Ozkip', 'Pioneer Member', 'Data Science Team', '', '', 'multigroup', '{}', 120, 1),
  ('team-13', 'Bilgihan Takım', 'Pioneer Member', 'Luminary Community', '', '', 'multigroup', '{}', 130, 1),
  ('team-14', 'Burcu Aydın', 'Pioneer Member', 'Luminary Community', '', '', 'multigroup', '{}', 140, 1),
  ('team-15', 'Hatice Rana Yamaç', 'Pioneer Member', 'Data Science Team', '', '', 'multigroup', '{}', 150, 1),
  ('team-16', 'Sarp Can Karaman', 'Pioneer Member', 'Data Science Team', '', '', 'multigroup', '{}', 160, 1),
  ('team-17', 'Olivia Üzümcü', 'Initiate Member', 'Mobile Development Team', '', '', 'multigroup', '{}', 170, 1),
  ('team-18', 'Tamer Usta', 'Initiate Member', 'Web Development Team', '', '', 'multigroup', '{}', 180, 1),
  ('team-19', 'Koralp Selçuk', 'Initiate Member', 'Web Development Team', '', '', 'multigroup', '{}', 190, 1),
  ('team-20', 'Nurhan Uzun', 'Initiate Member', 'Data Science Team', '', '', 'multigroup', '{}', 200, 1),
  ('team-21', 'Selin Su Özdemir', 'Initiate Member', 'Design Team', '', '', 'multigroup', '{}', 210, 1),
  ('team-22', 'Eray Keskinbaş', 'Initiate Member', 'Data Science Team', '', '', 'multigroup', '{}', 220, 1),
  ('team-23', 'Asya Yayla', 'Initiate Member', 'Data Science Team', '', '', 'multigroup', '{}', 230, 1),
  ('team-24', 'Emirhan Kurt', 'Initiate Member', 'Data Science Team', '', '', 'multigroup', '{}', 240, 1),
  ('team-25', 'Ilgın Sel Balta', 'Veteran Member', 'Design Team', '', '', 'multigroup', '{}', 250, 1),
  ('team-26', 'Göker Güner', 'Veteran Member', 'Data Science Team', '', '', 'multigroup', '{}', 260, 1),
  ('team-27', 'Bilal Durnagöl', 'Veteran Member', 'Mobile Development Team', '', '', 'multigroup', '{}', 270, 1),
  ('team-28', 'Selin Çıldam', 'Veteran Member', 'Data Science Team', '', '', 'multigroup', '{}', 280, 1);

-- ── blog (açılış içeriği) ────────────────────────────────────────────────────
INSERT OR REPLACE INTO posts (id, slug, title, excerpt, body_md, cover_image, author, tags, category, reading_minutes, status, featured, published_at, seo_title, seo_description) VALUES
  ('post-welcome', 'welcome-to-the-new-devmultigroup', 'Yeni devmultigroup.com yayında', 'Topluluğun yeni evi — etkinlikler, kayıtlar, blog, galeri ve tüm bağlantılar tek yerde.', '## Tüm topluluk için tek bir ev

Developer MultiGroup yıllardır Kommunity, YouTube, Instagram ve onlarca bağlantıya dağılmış halde yaşadı. Bugün hepsi tek bir yerde buluşuyor.

Yeni **devmultigroup.com** sana şunları getiriyor:

- **Etkinlikler** — geçmiş ve yaklaşan tüm buluşmalar, konferanslar ve bootcamp’ler. Kayıtlar yine Gathin üzerinden.
- **Kayıtlar** — seriler ve bootcamp’lere göre düzenlenmiş tam YouTube arşivimiz.
- **Blog** — notlar, rehberler ve etkinlik özetleri (ilkini okuyorsun).
- **Galeri** — topluluktan anlar.
- **Bağlantılar** — tüm resmi bağlantılar tek dokunuşla.

Bu site hızlı, açık ve topluluk öncelikli olacak şekilde tasarlandı. Dahası yolda — bir sonraki etkinlikte görüşürüz.', '', 'Developer MultiGroup', 'duyuru,topluluk', 'news', 2, 'published', 1, unixepoch('2026-06-19 09:00:00'), '', 'Yeni devmultigroup.com yayında — Developer MultiGroup topluluğu için etkinlikler, kayıtlar, blog, galeri ve bağlantılar.'),
  ('post-what-is-dmg', 'what-is-developer-multigroup', 'Developer MultiGroup nedir?', 'iOS, Android, web, veri ve yapay zekâ alanlarında toplulukların çatısı — ve merakı zanaata dönüştüren ücretsiz bir akademi.', '## Tek topluluk, birçok alan

Developer MultiGroup (MultiGroup), İstanbul merkezli **gönüllü bir yazılım topluluğudur**. Mobil, web, veri ve yapay zekâ alanlarında odaklı grupların çatısıyız — hepsini basit bir fikir birleştiriyor: *geliştiriciler birlikte daha hızlı gelişir.*

### Neler yapıyoruz

- **Buluşmalar & konferanslar** — Mobile Developer Conference’dan Web Developer Summit ve Data Science Summit’e.
- **MultiAcademy** — öğrenme kolumuz ücretsiz, yoğun bootcamp’ler düzenliyor: Modern iOS, Android Blast Off (Jetpack Compose), GenAI Fundamentals with Gemini ve Foundations of Web Development.
- **Seriler** — DataCommit, Sohbet Muhabbet, HR Break ve daha fazlası, hepsi YouTube’da kayıtlı.

### Birlikte gelişelim

İster yeni başlıyor ol ister kariyerinde yıllar geçmiş olsun, burada sana göre bir yer var. Bir etkinliğe gel, bir konuşma izle ya da doğrudan topluluğa katıl.', '', 'Developer MultiGroup', 'topluluk,hakkımızda', 'community', 3, 'published', 0, unixepoch('2026-06-18 09:00:00'), '', 'Developer MultiGroup; iOS, Android, web, veri ve yapay zekâ alanlarında gönüllü bir Türk yazılım topluluğu ve ücretsiz bootcamp’ler düzenleyen akademisi.');

-- ── social posts (curated — no API; admin değiştirebilir) ────────────────────
DELETE FROM social_posts;
INSERT OR REPLACE INTO social_posts (id, platform, account, post_url, embed_html, thumbnail, caption, posted_at, sort_order, is_active) VALUES
  ('soc-ig-1', 'instagram', 'multigroup', 'https://www.instagram.com/reel/DF0cmZ7N8FU/', '', '', '', unixepoch('2025-02-03 12:00:00'), 10, 1),
  ('soc-ig-2', 'instagram', 'multigroup', 'https://www.instagram.com/p/DFx7MJ7AXG_/', '', '', '', unixepoch('2025-02-02 12:00:00'), 20, 1),
  ('soc-ig-3', 'instagram', 'multigroup', 'https://www.instagram.com/p/DFkzMkHtASf/', '', '', '', unixepoch('2025-02-01 12:00:00'), 30, 1),
  ('soc-x-1', 'twitter', 'multigroup', 'https://x.com/devmultigroup/status/1923423216942354652', '', '', '', unixepoch('2025-05-16 12:00:00'), 40, 1);

-- ── partner communities (ecosystem; logo/instagram admin'den eklenebilir) ────
DELETE FROM communities;
INSERT OR REPLACE INTO communities (id, name, slug, ecosystem, city, logo_url, instagram, url, sort_order, is_active) VALUES
  ('com-01', 'GDG Kocaeli', 'gdg-kocaeli', 'Google', 'Kocaeli', '', '', '', 10, 1),
  ('com-02', 'GDG Hatay', 'gdg-hatay', 'Google', 'Hatay', '', '', '', 20, 1),
  ('com-03', 'GDG Kırklareli', 'gdg-kirklareli', 'Google', 'Kırklareli', '', '', '', 30, 1),
  ('com-04', 'GDG Çanakkale', 'gdg-canakkale', 'Google', 'Çanakkale', '', '', '', 40, 1),
  ('com-05', 'Düzce Üniversitesi Kalite Topluluğu', 'duzce-universitesi-kalite-toplulugu', 'Independent', 'Düzce', '', '', '', 50, 1),
  ('com-06', 'Marmara MACSEC', 'marmara-macsec', 'Independent', 'İstanbul', '', '', '', 60, 1),
  ('com-07', 'GoCampus Namık Kemal Üniversitesi', 'gocampus-namik-kemal-universitesi', 'Google', 'Tekirdağ', '', '', '', 70, 1),
  ('com-08', 'GoCampus Haliç Üniversitesi', 'gocampus-halic-universitesi', 'Google', 'İstanbul', '', '', '', 80, 1),
  ('com-09', 'Akdeniz Veri Topluluğu', 'akdeniz-veri-toplulugu', 'Independent', 'Antalya', '', '', '', 90, 1),
  ('com-10', 'İTÜ Veri Bilimi Kulübü', 'itu-veri-bilimi-kulubu', 'Independent', 'İstanbul', '', '', '', 100, 1),
  ('com-11', 'GDG on Campus Galatasaray Üniversitesi', 'gdg-on-campus-galatasaray-universitesi', 'Google', 'İstanbul', '', '', '', 110, 1),
  ('com-12', 'Yıldız Teknik Üniversitesi Veri Bilimi Topluluğu', 'yildiz-teknik-universitesi-veri-bilimi-toplulugu', 'Independent', 'İstanbul', '', '', '', 120, 1),
  ('com-13', 'GDG on Campus Üsküdar Üniversitesi', 'gdg-on-campus-uskudar-universitesi', 'Google', 'İstanbul', '', '', '', 130, 1),
  ('com-14', 'Karaelmas Yapay Zeka Topluluğu', 'karaelmas-yapay-zeka-toplulugu', 'Independent', 'Zonguldak', '', '', '', 140, 1),
  ('com-15', 'GDG on Campus BEUN', 'gdg-on-campus-beun', 'Google', 'Zonguldak', '', '', '', 150, 1),
  ('com-16', 'HSD MEF Üniversitesi', 'hsd-mef-universitesi', 'Huawei', 'İstanbul', '', '', '', 160, 1),
  ('com-17', 'HSD Kültür Üniversitesi', 'hsd-kultur-universitesi', 'Huawei', 'İstanbul', '', '', '', 170, 1),
  ('com-18', 'AWS Cloud Club Kültür Üniversitesi', 'aws-cloud-club-kultur-universitesi', 'Amazon', 'İstanbul', '', '', '', 180, 1),
  ('com-19', 'Swift Buddies Community', 'swift-buddies-community', 'Independent', 'İstanbul', '', '', '', 190, 1),
  ('com-20', 'Erciyes Üniversitesi Mühendislik Topluluğu', 'erciyes-universitesi-muhendislik-toplulugu', 'Independent', 'Kayseri', '', '', '', 200, 1),
  ('com-21', 'Sakarya Üniversitesi Bilişim Sistemleri Topluluğu', 'sakarya-universitesi-bilisim-sistemleri-toplulugu', 'Independent', 'Sakarya', '', '', '', 210, 1),
  ('com-22', 'HSD Bahçeşehir Üniversitesi', 'hsd-bahcesehir-universitesi', 'Huawei', 'İstanbul', '', '', '', 220, 1),
  ('com-23', 'HSD Sakarya Üniversitesi', 'hsd-sakarya-universitesi', 'Huawei', 'Sakarya', '', '', '', 230, 1),
  ('com-24', 'İstanbul Topkapı Üniversitesi Yapay Zeka Kulübü', 'istanbul-topkapi-universitesi-yapay-zeka-kulubu', 'Independent', 'İstanbul', '', '', '', 240, 1),
  ('com-25', 'GDG on Campus Bursa Teknik Üniversitesi', 'gdg-on-campus-bursa-teknik-universitesi', 'Google', 'Bursa', '', '', '', 250, 1),
  ('com-26', 'IEEE İzmir Demokrasi Üniversitesi Öğrenci Kolu', 'ieee-izmir-demokrasi-universitesi-ogrenci-kolu', 'IEEE', 'İzmir', '', '', '', 260, 1),
  ('com-27', 'OstimTech Pandora AI Kulübü', 'ostimtech-pandora-ai-kulubu', 'Independent', 'Ankara', '', '', '', 270, 1),
  ('com-28', 'Türkiye Veri Topluluğu', 'turkiye-veri-toplulugu', 'Independent', 'İstanbul', '', '', '', 280, 1),
  ('com-29', 'Gebze Teknik Üniversitesi Bilgisayar Topluluğu', 'gebze-teknik-universitesi-bilgisayar-toplulugu', 'Independent', 'Kocaeli', '', '', '', 290, 1),
  ('com-30', 'İstanbul Veri Topluluğu', 'istanbul-veri-toplulugu', 'Independent', 'İstanbul', '', '', '', 300, 1),
  ('com-31', 'Namık Kemal Üniversitesi', 'unit-namik-kemal-universitesi', 'MultiGroup UNIT', 'Tekirdağ', '', '', '', 310, 1),
  ('com-32', 'Haliç Üniversitesi', 'unit-halic-universitesi', 'MultiGroup UNIT', 'İstanbul', '', '', '', 320, 1),
  ('com-33', 'Marmara Üniversitesi', 'unit-marmara-universitesi', 'MultiGroup UNIT', 'İstanbul', '', '', '', 330, 1),
  ('com-34', 'İstanbul Aydın Üniversitesi', 'unit-istanbul-aydin-universitesi', 'MultiGroup UNIT', 'İstanbul', '', '', '', 340, 1),
  ('com-35', 'Erciyes Üniversitesi', 'unit-erciyes-universitesi', 'MultiGroup UNIT', 'Kayseri', '', '', '', 350, 1);
