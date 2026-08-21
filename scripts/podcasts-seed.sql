-- Seeds the first podcast SHOW: Dataly Hollows – DataCast.
--
-- Direct D1 write → bump cv:podcasts / cv:home afterwards, or wait out the 600s
-- TTL (see CLAUDE.md, "Cache invalidation"). Everything below is editable at
-- /admin/podcasts; this file only gets the row in without a form round-trip.
--
-- Platform URLs are intentionally EMPTY: the feeds do not exist until the pilot
-- ships (26 Ağustos 2026, 08.00). The page lists them as "yayına alınıyor"
-- rather than linking nowhere. Paste them into /admin/podcasts when they're live.

DELETE FROM podcasts WHERE id = 'pod-datacast';
INSERT INTO podcasts
  (id, slug, title, show_name, kicker, lede, body_md, cover_image, host, host_slug,
   schedule, episode_length, spotify_url, apple_url, youtube_url, subscribe_url,
   highlights_json, audience_json, first_episode_at, is_soon, sort_order, is_active)
VALUES
  ('pod-datacast', 'datacast', 'DataCast', 'Dataly Hollows',
   'Every career has a story worth telling.',
   'Data ve teknoloji dünyasındaki kariyer hikâyelerini, deneyimleri ve günlük çalışma hayatını konuştuğumuz podcast serisi. Her bölümde farklı bir konuk; kariyer yolculuğundan bugün yaptığı işe, aldığı kararlardan işin dışarıdan pek görünmeyen tarafına.',
   'Data ve teknoloji dünyasındaki farklı kariyer hikâyelerini, deneyimleri ve günlük çalışma hayatını konuşacağımız podcast serimiz **Dataly Hollows – DataCast** başlıyor.

Her bölümde farklı bir konuğu ağırlayacak; kariyer yolculuğundan bugün yaptığı işe, aldığı kararlardan günlük çalışma hayatına kadar farklı başlıklara birlikte bakacağız.

Bazen bir role nasıl gelindiğini, bazen o rolün gerçekten nasıl olduğunu, bazen de işin dışarıdan pek görünmeyen taraflarını konuşacağız.',
   'podcasts/datacast.jpg', 'Zerrin Ayaz', 'zerrin-ayaz',
   'Her Çarşamba 08.00', '25–30 dk',
   '', '', '',
   'https://gathin.com/events/dataly-hollows-%E2%80%93-datacast-256',
   '[{"icon": "compass", "title": "Gerçek kariyer hikâyeleri", "text": "Kariyerin farklı noktalarındaki hikâyeler; alınan kararlar, yeni başlangıçlar ve bu süreçte yaşanan deneyimler — konuğun kendi ağzından."}, {"icon": "cpu", "title": "İşin gerçek hali", "text": "Bir title''ın arkasında gerçekten ne var? Günlük iş akışı nasıl, neler yapılıyor ve bir gün nasıl geçiyor?"}, {"icon": "quote", "title": "Konuğa özel sorular", "text": "Her bölümde aynı soruları tekrarlamak yerine, konuğun deneyimine ve hikâyesine göre şekillenen bir sohbet."}, {"icon": "layers", "title": "İşin görünmeyen tarafı", "text": "Bir işe dışarıdan bakınca göremediğimiz detaylar, deneyimler ve günlük hayatta karşılaşılan durumlar."}, {"icon": "play", "title": "25–30 dakikalık bölümler", "text": "Uzun anlatılara kaymadan, her bölümde tek bir hikâyeye ve konuya odaklandığımız keyifli sohbetler."}]',
   '[{"icon": "sparkles", "title": "Kariyerinin başında olanlar", "text": "Data ve teknoloji dünyasına yeni adım atan, alanını keşfetmeye çalışan veya ilk iş deneyimini arayanlar."}, {"icon": "sort-arrows", "title": "Alan değiştirmeyi düşünenler", "text": "Data ve teknoloji dünyasındaki farklı rollerin ve kariyer yollarının nasıl olduğunu merak edenler."}, {"icon": "search", "title": "Sektörü merak edenler", "text": "Bir title''ın arkasında gerçekten ne olduğunu, günlük işlerin nasıl ilerlediğini ve farklı rollerin nasıl çalıştığını merak edenler."}, {"icon": "users", "title": "Sadece merak edenler", "text": "Data ve teknoloji alanında çalışmasa da farklı kariyer hikâyelerini ve yapılan işleri dinlemek isteyen herkes."}]',
   1787720400, 1, 0, 1);
