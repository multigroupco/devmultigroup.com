# DMG — KVKK / Gizlilik Karar Günlüğü

> **Amaç:** Aldığımız uyum kararlarını soru–cevap olarak kayda geçmek; ileride bir KVKK/ETK uzmanı avukatla görüşürken referans olması.
> **Bu dosya hukuki danışmanlık değildir.** "Avukat" işaretli maddeler onaya tabidir.
> İlgili: [ANALIZ.md](./ANALIZ.md) (tam uyum analizi, 11 ajanlı araştırma+denetim).
> Veri sorumlusu: **Furkan Ünsalan**. Son güncelleme: **2026-06-22**.

---

## Alınan Kararlar

### K-001 — Veri sorumlusu kim? (tüzel kişilik yok)
- **Soru:** Tüzel kişiliğimiz olmadığından (şirket/dernek/vakıf yok), topluluk adına "veri sorumlusu" olacak gerçek kişi + başvuru e-postası kim?
- **Karar:** Veri sorumlusu = **Furkan Ünsalan** (gerçek kişi). Başvuru kanalı: **kvkk@devmultigroup.com** (açılacak).
- **Gerekçe/risk:** KVKK m.3'e göre veri sorumlusu gerçek kişi olabilir. Tüzel kişilik kalkanı olmadığından şahsi/sınırsız sorumluluk söz konusu.
- **AVUKAT:** Evet — tek mi/ortak (müşterek) sorumlu mu; şahsi sorumluluğun kapsamı; topluluk büyürse dernek/şirket gerekliliği.
- **Durum:** ✅ Karar verildi → tüm metinlere işlenecek.

### K-002 — Bülten/e-postalar "ticari elektronik ileti" mi? (ETK/İYS)
- **Soru:** Göndereceğimiz e-postalar ETK 6563 / İYS açısından ticari ileti mi, bilgilendirme mi?
- **Karar:** **Saf bilgilendirme / ücretsiz etkinlik duyurusu** kabul → şimdilik **İYS dışı** varsayıyoruz.
- **Gerekçe/risk (gri alan):** Sponsor / store / indirim / ticari öğe girer girmez "ticari elektronik ileti"ye döner → açık onay + İYS kaydı + her iletide ret zorunlu olur. O noktada **yeniden değerlendirilecek.** Not: bu karar İYS'yi düşürür ama **KVKK aydınlatma + (e-posta toplama için) açık rıza yine gerekir.**
- **AVUKAT:** Evet — ileti niteliği + İYS muafiyeti.
- **Durum:** ✅ Karar verildi (koşullu/geçici).

### K-003 — PostHog session replay & IP
- **Soru:** Replay açık + maskelemesiz + IP anonim değil halde duruyor (henüz veri yok). Ne yapalım?
- **Karar:** **Session replay KAPATILDI** + **IP anonimleştirme AÇILDI.**
- **Uygulandı:** 2026-06-22, PostHog MCP ile proje **MultiGroup Web (480740)** → `session_recording_opt_in: false`, `anonymize_ips: true`. Doğrulandı. (O an `ingested_event: false` — hiç veri toplanmamıştı, temiz başlangıç.)
- **Durum:** ✅ UYGULANDI.

### K-004 — Hukuki bağımlılığı olmayan güvenli düzeltmeler şimdi yapılsın mı?
- **Karar:** Evet; kalan büyük maddeler **teker teker** sorulacak.
- **Bu turda yapılanlar:** (bkz. aşağıdaki "Bu turda uygulananlar")
- **Durum:** ✅ Uygulandı.

### K-005 — Web çerez/analitik rıza mimarisi
- **Soru:** KVKK analitik çerezler için opt-in istiyor; şu an opt-out. Ne yapalım?
- **Karar:** **Tam opt-in CMP.** GA/PostHog rıza verilene kadar yüklenmez; banner'da eşit "Kabul / Reddet / Tercihleri Yönet"; footer'da kalıcı geri-alma. Apex cutover öncesi go-live blocker.
- **Durum:** Karar verildi → uygulanacak (kod).

### K-006 — Bülten kayıt formu (aydınlatma + rıza)
- **Karar:** Form altında aydınlatma metnine link + **ön-işaretsiz açık rıza kutusu** + DB'ye **rıza kaydı** (zaman + kaynak/kanal). Ticari değil dense de KVKK aydınlatma+rıza gerekli.
- **Durum:** Karar verildi → uygulanacak.

### K-007 — Mailing tıklama (/r) takibi
- **Karar:** Açık tut + **aydınlatmada açıkça belirt** ("tıklamaları ölçüyoruz") + saklama sınırı (X ay sonra anonimleştir; süre K-013'te).
- **AVUKAT:** Meşru menfaat dayanağı (denge testi).
- **Durum:** Karar verildi.

### K-008 — Mailing silme (erasure) endpoint
- **Karar:** **Anonimleştir + suppression koru** — kişisel veriyi sil/anonimleştir; `unsubscribes`'ta e-postanın **HASH'ini** tut ki tekrar eklenip mail gönderilmesin.
- **Durum:** Karar verildi → endpoint eklenecek (kod).

### K-009 — Analitik yığını / GA4
- **Karar:** **GA4 + PostHog + Sentry — üçü de kalsın.** GA için ayrı data stream. **NOT:** ileride GA4'ü çıkarma/sadeleştirme (yurt dışı + çerez yükü nedeniyle) yeniden değerlendirilebilir.
- **Durum:** Karar verildi (revizyona açık).

### K-010 — PostHog bölge
- **Karar:** PostHog'u **EU Cloud'a taşı** (eu.posthog.com), yeni EU projesi. Mevcut veri yok → temiz taşıma. Yeni proje key'i `.com settings` + mailing'e güncellenecek.
- **Durum:** Karar verildi → uygulanacak.

### K-011 — PostHog'a e-posta
- **Karar:** distinct_id olarak ham e-posta yerine **SHA-256 hash** gönder (yurt dışına ham PII gitmez).
- **Durum:** Karar verildi → `analytics-server` + mailing capture'da uygulanacak.

### K-012 — Yurt dışı aktarım zemini (m.9)
- **Karar:** **Açık rıza temelli ilerle**; aydınlatma/rızada yurt dışı aktarımı (GA/Resend → ABD; PostHog/Sentry → AB) açıkça belirt. Nihai zemin (açık rıza vs standart sözleşme + Kurum bildirimi) **AVUKATLA** netleştirilecek; cutover öncesi oturtulmalı.
- **AVUKAT:** Evet.
- **Durum:** Geçici karar.

### K-013 — Saklama süreleri
- **Karar (önerilen defaultlar onaylandı):** Newsletter e-posta: *abonelikten çıkana kadar* · Store siparişleri: *yasal süre (VUK/TTK ~10 yıl) sonra sil* · İletişim formu: *2 yıl* · Mailing tıklama/davranış: *12 ay sonra anonimleştir* · Analitik (PostHog/GA): *14 ay*.
- **AVUKAT:** VUK/TTK kesin süre teyidi.
- **Durum:** Karar verildi.

### K-014 — VERBİS / özel nitelikli veri
- **Karar:** Özel nitelikli veri (din/sağlık/üyelik/biyometrik vb.) **toplamıyoruz** — sadece ad/e-posta/mesaj/sipariş → VERBİS ekonomik istisna varsayımı.
- **AVUKAT:** Teyit.
- **Durum:** Karar verildi.

### K-015 — Mailing analitik yapısı
- **Karar:** Ayrı proje YOK; **tek proje + tagging + iyi yapılandırılmış dashboard'lar** yeterli (PostHog tek EU projesi + `source:'mailing'` property; Sentry tek proje + `environment`/tag). Sunucu-ağırlıklı capture, açılma pixel'i YOK.
- **Durum:** Karar verildi.

### K-016 — Türkçe hukuki metin taslakları
- **Karar:** Üç metin (aydınlatma metni, çerez politikası, e-posta bülten onay/aydınlatma) **TASLAK** olarak yazıldı → `docs/kvkk/taslaklar/`. Commit yok, yayında değil. Yayın öncesi **avukat + kullanıcı onayı**.
- **Durum:** Taslaklar yazıldı (bu turda).

---

## Kalan İşler (uygulama + avukat)
- **Uygulama (kod):** opt-in CMP (web), bülten formuna aydınlatma+rıza kutusu+rıza kaydı, mailing erasure endpoint (anonimleştir+hash suppression), PostHog EU'ya taşıma + e-posta SHA-256 hash, GA4 ayrı data stream, mailing analitik motoru (tek proje + tagging).
- **Avukat onayı:** veri sorumlusu statüsü/sorumluluk, yurt dışı aktarım zemini, meşru menfaat (tıklama), saklama süreleri (VUK/TTK), VERBİS muafiyeti, üç metnin nihai hali.
- **Ertelendi:** Store ödeme verisi + iyzico/PayTR aktarımı (store canlıya geçince metne eklenecek).

---

## Doğrulanan Gerçekler (denetim — 2026-06-22)
- **Henüz hiçbir veri toplanmıyor:** Site analitiği "apex-only" kapısıyla inert (apex henüz Astro worker'a geçmedi), PostHog `ingested_event: false`. → temiz sayfa; yanlış kurulumu yayına almadan düzeltme şansı.
- **CF Access:** `mailing.devmultigroup.com` PII endpoint'leri (`/api/gdpr/export`, `/api/unsubscribes`) **Cloudflare Access ile korumalı** (login'e yönlendiriyor); `/unsubscribe` public (alıcılar için). → "middleware.ts yok" bulgusu pratikte düşük risk; koruma Access katmanında. Doc düzeltildi.
- **UNSUBSCRIBE_SECRET:** main + queue-consumer worker'larının ikisinde de **set** → prod'da dev-fallback kullanılmıyor.
- **PostHog client IP:** proje düzeyinde artık `anonymize_ips: true` (yukarıda).

## Bu turda uygulanan güvenli düzeltmeler (kod/doküman)
- PostHog replay kapatıldı + IP anonimleştirildi (K-003).
- `mail-template-generator/lib/email/unsubscribe.ts`: prod'da secret yoksa dev-fallback'i reddeden guard eklendi.
- `mail-template-generator/app/api/gdpr/export`: eksik tablolar eklendi (`send_events`, `campaign_link_clicks`) → KVKK m.11 "tüm verim" talebi artık tam.
- Doküman dürüstlüğü: `devmultigroup.com/docs/ANALYTICS.md` + `CLAUDE.md` "consent-gated/aware" → gerçek **opt-out** + "KVKK opt-in değil, yapılacak" uyarısı; `mail-template-generator/README.md` yanlış "pixel" iddiası kaldırıldı; `AGENTS.md` "middleware.ts" iddiası CF Access gerçeğiyle düzeltildi.

---

## Açık / Bekleyen Kararlar (teker teker sorulacak)
Aşağıdakiler **henüz karara bağlanmadı**; sırayla sorulacak. (Çoğu avukat onayı da ister.)

1. **GDPR/KVKK silme (erasure) endpoint'i** — mailing tool'a "verimi sil" akışı. Tasarım kararı: hard-delete mi, anonimleştirme mi; `unsubscribes` suppression kaydı korunmalı mı (tekrar eklenmesin diye)? → **ilk sorulacak.**
2. **Saklama süreleri** — newsletter (abonelikten çıkana kadar?), store orders (VUK/TTK kaç yıl?), contact-form inbox, mailing tıklama davranış verisi (kaç ay sonra anonimleştir?).
3. **Yurt dışı aktarım zemini (m.9)** — GA/PostHog/Resend (ABD), Sentry (AB). Açık rıza mı, standart sözleşme + Kurum bildirimi mi? **(AVUKAT)**
4. **GA4 gerçekten gerekli mi**, yoksa sadece PostHog (tercihen EU Cloud) mu? GA'yı çıkarmak yurt dışı aktarım + çerez yükünü azaltır.
5. **PostHog'u EU Cloud'a taşıma** + **e-postayı hash'leyerek** (düz metin yerine) distinct_id yapma.
6. **Opt-in çerez/consent mimarisi (CMP)** — banner "eşit seçenekler" + "Tercihleri Yönet" + kalıcı geri-alma; script'leri rıza öncesi yüklememe.
7. **Newsletter formu** — KVKK aydınlatma + (e-posta için) açık rıza kutusu; rıza kaydı (zaman, kaynak, kanal).
8. **VERBİS muafiyeti** teyidi (özel nitelikli veri işlemediğimiz — m.6).
9. **Mailing tıklama (/r) takibi** hukuki dayanağı + aydınlatmada açık ifade + saklama/anonimleştirme.
10. **Store canlıya geçince** ödeme verisi + iyzico/PayTR aktarımı + VUK/TTK saklama → metne ekleme.
11. **Mailing analitik motoru** — PostHog tek proje + `source:'mailing'` ayrımı / Sentry ayrı proje; sunucu-ağırlıklı capture; açılma pixel'i EKLEME. (Detay: ANALIZ.md §D.)
12. **Yazılacak metinler** (aydınlatma + çerez + e-posta onay) — taslak sonra; yayına almadan **avukat onayı**.

---

## Uygulama Durumu — Kod Yazıldı (2026-06-22) · LOCAL, commit/deploy YOK

Yukarıdaki "Açık/Bekleyen" maddelerin çoğu **karara bağlandı (K-005..K-016) ve kodu yazıldı** (local; henüz commit/deploy edilmedi). Dosya-seviyesi plan: [`UYGULAMA-PLANI.md`](./UYGULAMA-PLANI.md).

| Konu | Durum |
|---|---|
| PostHog EU'ya taşıma + replay off + IP anon (K-003/K-010) | ✅ **canlı** (prod D1 + KV cache EU'yu gösteriyor; proje 93082) |
| PostHog e-posta SHA-256 hash — server capture (K-011) | ✅ kod: `analytics-server.ts` + subscribe/contact/reserve |
| Opt-in CMP (K-005) — banner + bootstrap + footer geri-alma | ✅ kod: `Analytics.astro`, `ConsentBanner.astro`, `Footer`/`site.ts` |
| Rıza kaydı (K-006) | ✅ kod+migration: `consent_records` + `/api/consent-record`; newsletter `contacts`/`subscriber_consent`; order `consent_*` |
| Mailing erasure = anonimleştir + hash suppression (K-007) | ✅ kod: `/api/gdpr/erase` + unsubscribe suppression + export + send-pipeline suppression filtresi |
| Mailing analitik motoru (K-016) — PostHog tek proje+`surface:mailing` / GA4 ayrı stream / Sentry ayrı DSN | ✅ kod: `lib/analytics/*` + r/unsubscribe/send/queue bağlama |
| Yasal metinler (aydınlatma/çerez/bülten) | ✅ DRAFT sayfalar (`/privacy*`, `noindex`) — **avukat onayı bekliyor** |

**Bekleyen (deploy/onay):** prod migration'lar (`db:migrate:remote`, `store:migrate:remote`, mailing drizzle `0015`), iki repo `npm run deploy`, Worker secret'ları (GA_API_SECRET, MAILING_SENTRY_DSN, PostHog/GA değerleri), **avukat onayı** (yasal metinler + Sentry meşru menfaat + m.9 yurt dışı zemin), Sentry mailing projesi (MCP re-auth gerek). Hiçbir şey commit'lenmedi.
