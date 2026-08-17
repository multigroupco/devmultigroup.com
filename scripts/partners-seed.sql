-- Seeds `partners` from the content that used to be hardcoded in
-- src/pages/partnerships.astro.
--
-- Direct D1 write → bump cv:partners / cv:home afterwards, or wait out the 600s
-- TTL (see CLAUDE.md, "Cache invalidation").

DELETE FROM partners;
INSERT INTO partners
  (id, slug, name, kicker, lede, body_md, logo_url, hero_image, website, category, year_from, metrics_json, gallery_json, featured, sort_order, is_active)
VALUES
  ('partner-wite', 'wite', 'Wite', 'Android Workshop Serisi',
   'Üç oturumluk, uygulamalı bir ileri seviye Android programı — sonunda uygun öğrencileri doğrudan Wite ekibine yönlendiriyoruz.',
   'Wite ile kurduğumuz iş birliği tek bir etkinlik değil, uçtan uca bir program: ileri seviye Android geliştiricilerin gerçekten ihtiyaç duyduğu üç başlığı seçtik ve her birini ayrı bir oturuma böldük.

Program **mimari ve tasarım desenleriyle** açılıyor; ikinci oturumda **Kotlin''in derinlerine** iniyoruz; üçüncüde **Jetpack Compose ve erişilebilirlik** üzerine çalışıp günü networking ile kapatıyoruz.

Programın sonunda öne çıkan katılımcıları Wite ekibiyle tanıştırıyoruz — topluluğun öğrenme tarafıyla sektörün işe alım tarafını aynı masada buluşturan kısım tam olarak burası.',
   'companies/wite.png', 'partners/wite-1.jpg', '', 'Android', 1747267200,
   '[{"value":"3","label":"oturum"},{"value":"120+","label":"katılımcı"},{"value":"1","label":"kariyer köprüsü"}]',
   '[{"img":"partners/wite-1.jpg","title":"Architecture & Design Patterns","caption":"Oturum 1","href":"https://gathin.com/events/architecture-design-patterns-583"},{"img":"partners/wite-2.jpg","title":"Kotlin Deep Dive","caption":"Oturum 2","href":"https://gathin.com/events/kotlin-deep-dive-%E2%80%94-aadc-2-997"},{"img":"partners/wite-3.jpg","title":"Jetpack Compose & Accessibility","caption":"Oturum 3","href":"https://gathin.com/events/jetpack-compose-accessibility-community-networking-100"}]',
   1, 10, 1),

  ('partner-lodos', 'lodos', 'Lodos.io', 'Platform Geliştirme',
   'Üç platformu birlikte inşa ediyoruz: ToGather, SocialHive ve Achieve. Topluluk tarafını biz kuruyoruz.',
   'Lodos ile ilişkimiz sponsorluk değil, ortak ürün geliştirme. Üç platformun da topluluk tarafını biz kuruyoruz — yani insanları bir araya getiren ve toplulukları daha iyi araçlarla büyüten kısmı.

**ToGather** etkinlik tarafını taşıyor; kendi etkinliklerimizin kaydı da buradan geçiyor. **SocialHive** topluluk ve iletişim katmanı. **Achieve** ise sertifikasyon — bootcamp''lerini bitirenlerin elinde kalan şeyi kalıcı hâle getiriyor.

Bir aracı kullanan taraf olmakla, o aracın nasıl çalışması gerektiğini söyleyen taraf olmak arasındaki farkı bu iş birliği kapatıyor.',
   'companies/lodos.png', 'partners/lodos-gathin.jpg', 'https://lodos.io', 'Platform', 1704067200,
   '[{"value":"3","label":"platform"},{"value":"6 yıl","label":"topluluk deneyimi"}]',
   '[{"img":"partners/lodos-gathin.jpg","title":"ToGather","caption":"Etkinlik platformu · gathin.com","href":"https://gathin.com"},{"img":"partners/lodos-socialhive.jpg","title":"SocialHive","caption":"Topluluk & iletişim · socialhive.lodos.io","href":"https://socialhive.lodos.io"},{"img":"partners/lodos-achieve.jpg","title":"Achieve","caption":"Sertifikasyon · achieve.lodos.io","href":"https://achieve.lodos.io"}]',
   1, 20, 1),

  ('partner-google', 'google', 'Google', 'Build with AI',
   'Google for Developers ile yürüttüğümüz Build with AI sertifika programı — bugüne kadarki en geniş katılımlı iş birliğimiz.',
   'Build with AI, Google for Developers ile yürüttüğümüz sertifika programı. Amaç yapay zekâyı anlatmak değil, katılımcıların programın sonunda kendi ellerinde çalışan bir şey olmasıydı.

Program boyunca **oturumları partner topluluklarla paylaştık** — tek bir salonda değil, Türkiye''nin farklı şehirlerinde eş zamanlı ilerledi. Katılımcılar Gemini tabanlı projeler geliştirdi ve tamamlayanlar sertifikalarını aldı.

Bu iş birliği, topluluğun tek başına ulaşamayacağı ölçeğe partnerlikle nasıl ulaşılabileceğinin en net örneği.',
   'companies/google.png', 'partners/google-bwai.jpg', 'https://developers.google.com', 'AI', 1740787200,
   '[{"value":"1.5k","label":"katılımcı"},{"value":"30+","label":"partner etkinliği"},{"value":"10+","label":"oturum"}]',
   '[{"img":"partners/google-bwai.jpg","title":"Build with AI 2026","caption":"Sertifika programı","href":"https://gathin.com/events/build-with-ai-program-2026-649"}]',
   1, 30, 1);
