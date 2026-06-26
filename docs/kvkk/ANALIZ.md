<!-- Otomatik üretildi: kvkk-analytics-analysis dynamic workflow (11 ajan). Hukuki danışmanlık değildir; "AVUKAT GEREKEN NOKTALAR" maddeleri avukata onaylatılmalı. -->

Bu kapsamlı bir uyum analizi görevi. Bulgular zaten JSON olarak verilmiş — ek araştırma veya dosya okuma yapmadan, sağlanan bulgular üzerinden dürüst bir analiz ve plan üreteceğim. Çıktıyı doğrudan döndürüyorum.

---

# DMG (DevMultiGroup) — KVKK / ETK / İYS Uyum Analizi ve Planı

> **Önemli uyarı:** Bu metin hukuki danışmanlık değildir; iç uyum analizidir. Aşağıda "AVUKAT GEREKEN NOKTALAR" bölümünde işaretlenen maddeler yayına alınmadan önce Türkiye'de KVKK/ETK uzmanı bir avukata onaylatılmalıdır. DMG'nin **tüzel kişiliği yoktur** (şirket/dernek/vakıf yok); tüm öneriler buna göre kurgulanmıştır.

---

## A. MEVCUT DURUM — DÜRÜSTLÜK & UYUM BOŞLUKLARI (öncelik sırasıyla)

Önce en kritik gerçeği netleştirelim: **Şu anda hiçbir analitik/izleme istemci tarafında ÇALIŞMIYOR.** devmultigroup.com apex'i halen ayrı bir Next.js uygulamasına işaret ediyor; Astro worker'ı yalnızca workers.dev staging'de ve orada da analitik bootstrap "apex-only" kapısıyla **inert** durumda. Yani aşağıdaki istemci-tarafı boşluklar bugün **fiilen tetiklenmiyor** — ama **apex cutover anında canlı hale gelecek.** Bu, "şu an güvendeyiz ama yanlış kuruluyu yayına almak üzereyiz" durumudur. Sunucu tarafı (newsletter, contact, store) ise apex'e geçince işleyecek; mailing tool ise zaten ayrı çalışıyor.

### YÜKSEK ÖNCELİK — apex cutover'dan ÖNCE düzeltilmeli (go-live blocker)

1. **Hiçbir aydınlatma metni / gizlilik politikası / çerez politikası sayfası YOK.** `src/pages`, `public/`, `dist/` taramasında sıfır sonuç. Footer'da hiç hukuki link yok. KVKK m.10 aydınlatma yükümlülüğü, veri toplanan **her noktada** (newsletter, contact, store rezervasyon, çerez) zorunludur. Bu, modelden bağımsız, başlı başına bir eksikliktir.
   - **Söylediğimiz vs yaptığımız:** Kullanıcıya hiçbir şey söylemiyoruz; ama email, ad, mesaj, satın alan adı/email topluyor ve ABD'ye (Resend, PostHog) aktarıyoruz.

2. **Analitik modeli OPT-OUT (rıza-sonrası), OPT-IN (rıza-öncesi) değil.** `Analytics.astro` ilk ziyarette (DNT yoksa, önceki seçim yoksa) GA4 + PostHog'u banner'a tıklanmadan **önce** yüklüyor; banner sonradan çıkıyor. KVKK Çerez Rehberi (Temmuz 2025 sürümü) analitik çerezler için **önceden açık rıza** (aktif eylem, script yüklenmeden önce) ister. "Önce izle, sonra sor" KVKK'ya aykırıdır.
   - **Dürüstlük boşluğu:** `docs/ANALYTICS.md` ve `CLAUDE.md` bu katmanı "consent-gated"/"consent-aware" diye tarif ediyor — bu **yanlış**; gerçek model opt-out. Dokümantasyon, gelecekteki bir denetçiyi/geliştiriciyi "KVKK uyumlu opt-in zaten var" diye yanıltabilir.

3. **PostHog session replay durumu bilinmiyor (en büyük gizlilik bilinmezi).** İstemci snippet'inde hiç replay/maskeleme konfigürasyonu yok; replay tamamen PostHog proje ayarlarıyla (us.posthog.com proje 480740) yönetiliyor. `docs/ANALYTICS.md` "replay proje tarafında açık" diyor. Eğer replay PostHog varsayılanlarıyla açıksa, varsayılan maskeleme form input'larını maskeler ama **genel sayfa metnini maskelemez** — bu, banner'daki "analiz çerezleri" ifadesinin ima ettiğinden çok daha invazivdir ve opt-out modelinde rıza öncesi başlar. **Bu, koddan doğrulanamaz; PostHog UI'da insan eliyle kontrol edilmeli.**

4. **Newsletter'da ETK onayı / İYS / opt-in yok.** `/api/subscribe` email + ad'ı MAIL_DB `contacts` tablosuna yazıyor; **rıza bayrağı, onay zamanı, kaynak, İYS referansı yok.** Eğer bu listeye hiç ticari/pazarlama e-postası gönderilirse, ETK m.6 (önceden onay) + İYS kaydı + her iletide ret imkanı zorunlu hale gelir. Mevcut akış bunların hiçbirini yapmıyor.

5. **mail-template-generator'da rıza/aydınlatma katmanı tamamen yok, ama gönderim ve tıklama takibi ÇALIŞIYOR.** Bu araç fiilen pazarlama e-postası gönderiyor ve her tıklamayı recipient'a bağlı tam URL + zaman olarak `campaign_link_clicks`'e yazıyor (davranışsal/profilleme verisi). Buna rağmen: aydınlatma metni yok, gizlilik politikası yok, rıza kaydı yok, İYS entegrasyonu yok. Footer "abone olduğun için alıyorsun" diyerek **bir abonelik VARSAYIYOR** ama bu varsayımı destekleyen hiçbir kayıt yok — ispat yükü veri sorumlusunda ve bu ispat yapılamaz. KVKK Kurulu 2022/861 kararı (geçerli işleme şartı olmadan pazarlama e-postası = 150.000 TL ceza) tam bu senaryodur.

6. **mail-template-generator'da `middleware.ts` BULUNAMADI — PII endpoint'leri korumasız olabilir.** AGENTS.md ve route yorumları "middleware auth ile korunuyor" diyor ama dosya depo kökünde ve `src/` altında yok. Bu doğruysa, `/api/gdpr/export?email=` (herhangi bir kişinin tüm geçmişi) ve `/api/unsubscribes` (tüm abonelikten çıkma email'leri) kimlik doğrulamasız erişilebilir olabilir — KVKK m.12 (veri güvenliği) ciddi ihlali. **Bu acilen doğrulanmalı.**

7. **`UNSUBSCRIBE_SECRET` prod'da set edilmezse `'mailing-manager-dev-secret'` sabitine düşüyor.** Bu durumda herkes geçerli unsubscribe/redirect token üretebilir — KVKK m.12 zafiyeti. Prod'da bu fallback'i reddeden bir guard gerekli.

### ORTA ÖNCELİK

8. **Banner KVKK Çerez Rehberi "eşit seçenekler" standardını karşılamıyor.** Sadece "Kabul et" (btn-primary) / "Reddet" (btn-ghost) var; granüler "Tercihleri Yönet" yok ve butonlar görsel olarak eşit ağırlıkta değil (dark pattern eğilimi). Ayrıca seçim localStorage'a yazılınca banner bir daha **hiç dönmüyor** — rızayı geri almak/değiştirmek için kalıcı bir yol yok (rıza, verildiği kadar kolay geri alınabilmeli).

9. **Yurt dışı aktarım hukuki zemini yok ve açıklanmıyor.** GA4 → Google (ABD), PostHog → ABD (us.i.posthog.com), Resend → ABD; Sentry → AB/Almanya (de.sentry.io). KVKK Kurulu **hiçbir ülke için yeterlilik kararı vermedi** (ABD de AB de dahil). Bu aktarımlar sürekli/sistematik olduğundan "arızi aktarım + açık rıza" zemini hukuken zayıf; uygun güvence (standart sözleşme + Kurum'a 5 iş günü bildirim) gerekebilir. Aydınlatma metninde bu aktarım açıkça belirtilmeli.

10. **Sunucu tarafı PostHog ve Sentry hiçbir rıza sinyaline tabi değil.** "Reddet" diyen kullanıcı için bile sunucu event'leri gidiyor (email distinct_id olarak PostHog'a — düz metin, ABD'ye); Sentry koşulsuz yükleniyor. Kod gizlilik-bilinçli (IP `0.0.0.0`, mesaj gövdesi yollanmıyor) ama "meşru menfaat" dayanağı `ANALYTICS.md` içine gömülü bir **iddia**, doğrulanmış hukuki temel değil. Özellikle newsletter sinyali için pazarlamanın dayanağı tipik olarak rızadır, meşru menfaat değil.

11. **Saklama süresi / silme akışı hiçbir yerde tanımlı değil.** `contacts`, `orders`, `order_items` süresiz yaşıyor. Contact-form verisi hiç DB'ye yazılmıyor — yalnızca Resend loglarında ve hedef gelen kutularında ("sonsuza dek inbox'ta") kalıyor, bu da silme/erişim taleplerini karşılamayı zorlaştırıyor. mail-template-generator'da `send_events` kasıtlı FK-cascade'siz (kampanya silinse de PII email kalıyor). KVKK m.7 silme yükümlülüğü için endpoint yok.

12. **mail-template-generator GDPR export'u eksik.** `/api/gdpr/export` unsubscribe + campaign_recipients + contacts döküyor ama `send_events` ve `campaign_link_clicks` (kişiye ait davranışsal kayıtlar) **dahil değil** — "tüm verimi ver" talebini tam karşılamıyor. Ayrıca silme endpoint'i hiç yok (sadece export var).

13. **README iç çelişkisi (dürüstlük):** mail-template-generator README satır 34 "Open + click tracking … and pixel" diyor — **pixel YOK** (kod taraması doğruladı; açılma oranı her zaman 0). Satır 366 doğru şekilde "Open and click tracking are not provided" diyor. Yanlış doküman, yanlış uyum beyanına yol açar.

### DÜŞÜK ÖNCELİK (yine de kapatılmalı)

14. **DNT'ye saygı** iyi bir şey ama modern tarayıcılar DNT'yi neredeyse hiç göndermiyor — pratikte tüm yeni ziyaretçiler opt-out modelinde rıza öncesi izleniyor. Yani DNT bir koruma değil.

15. **PostHog `autocapture:true` + `persistence:'localStorage+cookie'`** geniş, sayılması zor veri topluyor ve yüklemede (opt-out modelinde rıza öncesi) çerez/identifier set ediyor — aydınlatmadaki "her çerezi listele" yükümlülüğünü zorlaştırıyor.

**Önce düzeltilmesi gerekenler (özet):** (1) aydınlatma + çerez + ETK metinleri yayınla; (2) analitiği opt-in'e çevir; (3) PostHog replay'i UI'da kilitle/kapat; (4) mail-template-generator `middleware.ts` + `UNSUBSCRIBE_SECRET`'i doğrula; (5) newsletter'a ayrı ETK onay kutusu + İYS; (6) `docs/ANALYTICS.md`/`CLAUDE.md` "consent-gated" ifadesini gerçek modele göre düzelt.

---

## B. DÜRÜST VERİ ENVANTERİ

Aşağıdaki tablo, yazılacak metinlerin **dürüst temelidir** — burada yazmayan bir şeyi metinlerde "yapıyoruz/yapmıyoruz" diye iddia etmemeliyiz.

### devmultigroup.com (apex cutover sonrası canlı olacak akışlar)

| Veri | Amaç | Önerilen hukuki sebep | Nerede saklanıyor | Yurt dışı aktarım | Saklama (TANIMSIZ — belirlenecek) |
|---|---|---|---|---|---|
| Newsletter: email (+ad) | Bülten/duyuru gönderimi | **Açık rıza** (pazarlamaysa) + ETK onayı | MAIL_DB `contacts` (id, email, name, list_id, created_at) | Yok (D1, ama CF altyapısı — avukat değerlendirmesi) | Tanımsız → abonelikten çıkana kadar önerilir |
| Contact form: ad, email, org, mesaj | Talep yanıtlama | Sözleşme öncesi / meşru menfaat | **DB'ye yazılmıyor** → Resend logları + hedef inbox (partner@/sponsor@/support@) | **Resend → ABD** | Tanımsız → "fiilen sonsuza dek inbox'ta" (RİSK) |
| Store rezervasyon: buyer_name, buyer_email, qty/variant | Sipariş/rezervasyon | Sözleşmenin ifası | STORE_DB `orders` (email indexli), `order_items` | Yok (D1) | Tanımsız → VUK/TTK saklama + sonra silme gerekir |
| Store `orders.notes` (serbest metin) | İdari not | Sözleşmenin ifası | STORE_DB | Yok | Tanımsız, sınırsız (RİSK) |
| IP adresi | — | — | **Hiçbir D1 tablosunda saklanmıyor**; PostHog'a `$ip:'0.0.0.0'` ile gönderilmiyor | CF edge ve Sentry ingest pipeline'ı IP görebilir (uygulama yazmıyor) | — |
| GA4: page_view + ~27 özel event, anonymize_ip | Web analitiği | **Açık rıza (opt-in)** | Google (GA4) | **Google → ABD** | GA4 admin'de (repo'da konfigüre değil) |
| PostHog (client): $pageview/$pageleave, autocapture, özel eventler, replay(?) | Ürün analitiği | **Açık rıza (opt-in)** | PostHog Cloud **ABD** (us.i.posthog.com) | **ABD** | PostHog hesap varsayılanı |
| PostHog (server): email = distinct_id (subscribe/contact/reserve) | Dönüşüm ölçümü | Tartışmalı (meşru menfaat iddiası) | PostHog **ABD** | **ABD** (düz metin email) | PostHog hesap varsayılanı |
| Sentry (client + server): hata, URL, UA, referer, stack | Hata izleme | Meşru menfaat (avukat onayı gerekli) | Sentry **AB/Almanya** (de.sentry.io) | **AB** (ABD'den daha iyi ama yine yurt dışı; yeterlilik kararı yok) | Sentry plan varsayılanı |

### mail-template-generator (Mailing Manager — ayrı uygulama, halihazırda çalışıyor)

| Veri | Amaç | Hukuki sebep | Nerede | Aktarım | Saklama |
|---|---|---|---|---|---|
| `contacts`: email, name, company, metadata, listId | Liste yönetimi | **Rıza kaydı YOK** (kritik boşluk) | DB | Cloudflare | Tanımsız |
| `campaign_recipients`: email, name, variables, status, resendId, sentAt, deliveredAt, clickedAt, clickCount, error | Gönderim takibi | Belirsiz | DB | Cloudflare | Tanımsız |
| `campaign_link_clicks`: tam tıklanan URL + zaman + recipientId | **Davranışsal/profilleme** | Ayrı dayanak gerekir (rıza/meşru menfaat denge testi) | DB | Cloudflare | Tanımsız (anonimleştirme yok) |
| `send_events`: email + outcome + CF kodu + messageId + latency | Audit trail | — | DB (FK-cascade YOK) | Cloudflare | Tanımsız, kampanya silinse de kalır |
| `unsubscribes`: email HMAC token | Suppression | — | DB | Cloudflare | Süresiz |
| **Açılma (pixel) takibi** | — | — | **YOK** (şemada kolon var ama yazılmıyor; oran hep 0) | — | — |
| **IP / User-Agent** | — | — | **Hiçbir yerde toplanmıyor** (iyi haber) | — | — |

**Olumlu notlar (dürüstçe):** IP hiçbir yerde saklanmıyor; PostHog'a IP `0.0.0.0` ile gönderilmiyor; Sentry AB bölgesinde; mail tool'da unsubscribe RFC 8058 one-click + List-Unsubscribe header'ları + kaldırılamaz footer + hard-bounce suppression sağlam; contact/server kodu mesaj gövdesini PostHog'a yollamıyor.

---

## C. EKLENECEK HUKUKİ METİNLER (devmultigroup.com)

**Temel kural:** Üç farklı hukuki rejim, üç ayrı metin/akış — **tek metinde/tek kutuda harmanlanamaz** (KVKK Aydınlatma Tebliği m.5/f + 18.02.2026 t. 2026/347 sayılı Kurul ilke kararı). Footer'da üç ayrı link: "Aydınlatma Metni", "Çerez Politikası", "Ticari İleti / Bülten Onayı".

### "Veri Sorumlusu" kısmı — tüzel kişilik olmadan nasıl yazılır

DMG'nin tüzel kişiliği olmadığından, **"DevMultiGroup Topluluğu" tek başına hukuken yeterli kimlik DEĞİLDİR.** KVKK m.3 veri sorumlusunun **gerçek kişi** de olabileceğini söyler; işleme amaç ve vasıtalarını fiilen belirleyen gerçek kişi(ler) şahsen veri sorumlusudur. Önerilen kalıp:

> **Veri Sorumlusu:** DevMultiGroup (DMG), tüzel kişiliği bulunmayan gönüllü bir geliştirici topluluğudur. Bu topluluk adına kişisel verilerin işlenme amaç ve vasıtalarını belirleyen veri sorumlusu gerçek kişi: **[Ad SOYAD]**. İletişim/başvuru: **kvkk@devmultigroup.com** (veya belirlenecek adres). KVKK kapsamındaki taleplerinizi bu kanaldan iletebilirsiniz.

> ⚠️ **AVUKAT GEREKİR:** Tek mi, ortak (müşterek) mı veri sorumlusu; ve bu gerçek kişinin şahsi/sınırsız sorumluluk taşıdığı gerçeği. Bu en kritik yapısal karardır (aşağıda F ve E).

### 1) Aydınlatma Metni (KVKK m.10 — zorunlu, talep beklenmeksizin)

Madde başlıkları (Aydınlatma Tebliği m.5 + Rehber Yayın No:60'ın beş asgari unsuru tam karşılanmalı):

1. **Veri Sorumlusunun Kimliği ve İletişim Bilgileri** (yukarıdaki gerçek-kişi kalıbı)
2. **İşlenen Kişisel Veri Kategorileri** (kimlik/ad, iletişim/email, mesaj içeriği, üyelik/hesap, işlem güvenliği, çerez/kullanım, store: satın alan + sipariş)
3. **İşleme Amaçları** — *belirli, açık, meşru.* "Yeni hizmet geliştirmek için kullanabiliriz", "araştırma amaçlı" gibi muğlak ifadeler **YASAK** (Tebliğ m.5/1-g)
4. **İşlemenin Hukuki Sebebi** (her amaç için m.5/m.6'dan hangisi) — newsletter=açık rıza; contact=meşru menfaat/sözleşme öncesi; store=sözleşmenin ifası; log=meşru menfaat (5651 varsa belirt)
5. **Toplama Yöntemi** (web formu, çerez, email kaydı; otomatik/otomatik olmayan açıkça)
6. **Aktarılan Taraflar ve Amacı** (alıcı grupları): barındırma/altyapı (Cloudflare), e-posta gönderim (Resend), analitik (Google/GA4, PostHog), hata izleme (Sentry), kanunen yetkili kamu kurumları
7. **Yurt Dışına Aktarım** (m.9, 7499 sonrası) — Google/PostHog/Resend ABD, Sentry AB; dayanağı **dürüstçe** belirt (açık rıza ve/veya uygun güvence; avukat onayına bağlı)
8. **Saklama Süreleri** (her kategori için — bkz. uncertainty: metne yazılması güçlü beklenti, kesin madde dayanağı için avukat)
9. **İlgili Kişinin Hakları (m.11) — tek tek sayılarak** (öğrenme, bilgi talep, amaç öğrenme, aktarılan 3. kişileri bilme, düzeltme, silme/yok etme, bildirim, otomatik analize itiraz, zararın giderilmesi)
10. **Başvuru Yöntemi** (yazılı/KEP/kayıtlı e-posta; 30 gün cevap süresi; kural olarak ücretsiz)
11. **Yürürlük / Güncelleme Tarihi**

### 2) Çerez Politikası + Çerez Rıza Yönetimi (CMP)

Madde başlıkları:

1. Çerez nedir
2. Kullandığımız çerez türleri (süreye göre oturum/kalıcı; tarafa göre 1./3.; amaca göre **zorunlu / işlevsel / analitik / pazarlama**)
3. **Çerez Tablosu** — her çerez: ad, taraf, amaç, kategori, ömür, hukuki sebep (`_ga`, `ph_<key>_posthog`, `dmg_consent` vb. tek tek)
4. Hukuki sebep: zorunlu = meşru menfaat (m.5/2-f); analitik/pazarlama = **açık rıza (opt-in)**
5. Çerez tercihlerini yönetme/geri alma (kalıcı CMP ikonu)
6. Güncelleme tarihi

**Çerez rıza yönetimi (teknik — go-live blocker):** İlk yüklemede yalnızca zorunlu çerezler aktif; GA4/PostHog/replay **"Kabul et" tıklanana kadar yüklenmesin** (consent-gated loader). Banner'da eşit görünürlükte "Tümünü Kabul Et" / "Tümünü Reddet" / "Tercihleri Yönet", ön-işaretli kutu yok, dark-pattern yok. Footer'da kalıcı "Çerez Tercihleri" linki (rızayı geri alma). Çerez duvarı **kullanılmaz**.

### 3) Ticari Elektronik İleti / E-posta Onay Metni (ETK 6563)

Madde başlıkları:

1. Onayın kapsamı (e-posta ile bülten/duyuru almayı kabul)
2. Gönderen kimliği (DMG'yi temsil eden kayıtlı **gerçek kişi** + iletişim)
3. Onayın **İYS'ye kaydedileceği** bilgisi
4. Ret/abonelikten çıkma hakkı (her iletide ücretsiz, kolay; 3 iş günü içinde durdurma)
5. Onayın her an geri alınabilirliği

**Kutu mimarisi (form üzerinde):** ayrı, **ön-işaretsiz**, bağımsız işaretlenebilir iki kutu — (a) KVKK açık rıza, (b) ETK ticari ileti onayı. "Aydınlatma metnini okudum/onaylıyorum" şeklinde aydınlatmaya rıza alınması **yasak** (yalnızca okunduğunun teyidi olabilir).

---

## D. MAILING ARACI ANALYTICS & TRACKING MOTORU PLANI

Hedef: mail-template-generator'a GA + PostHog + Sentry'yi **mevcut akışı bozmadan** bağlamak. Mevcut araçta zaten kendi tıklama-takibi (`/r` redirect) ve gönderim audit'i var; analitik bunu **gözlemlemek** için eklenir, yerine geçmez.

### Sunucu vs istemci event'leri (öneri: SUNUCU AĞIRLIKLI)

Mailing tool çoğunlukla bir backend/admin uygulaması (Next.js). Kampanya gönderimi, bounce, tıklama-redirect (`/r`) gibi olaylar **sunucuda** olur. Bu yüzden:

- **Sunucu-tarafı PostHog capture** ana motor olsun: `campaign_sent`, `campaign_delivered`, `link_clicked` (zaten `/r` route'unda yakalanıyor), `bounced`, `unsubscribed`. Bunlar zaten DB'ye yazılıyor; aynı noktadan PostHog'a da event atılır. devmultigroup.com'daki desenle aynı: **email'i distinct_id yapma, IP `0.0.0.0`, PII'yi property yapma.** (İdeali: email'i SHA-256 ile hash'leyip distinct_id yapmak — ABD'ye düz metin email göndermeyi keser.)
- **İstemci-tarafı** yalnızca admin panelinin kendi UI analitiği (hangi ekran kullanılıyor) için, **operatörlerin kendi rızasıyla** — bu son kullanıcı (alıcı) verisi değil, kendi ekibin. Düşük öncelik.
- **Alıcının e-posta açması/tıklaması istemci event'i değildir** — açılma pixel'i YOK (eklemeyin; eklenirse rıza/aydınlatma sorunu doğar) ve tıklama zaten sunucuda `/r`'de yakalanıyor.

### GA için ayrı data stream mı?

- **GA4:** Mailing tool admin paneli için ayrı bir **GA4 Data Stream** (aynı GA4 property altında) öner. Ücretsiz tier'da GA4 olay limiti cömert; ayrı property gerekmez, ayrı stream raporlamayı karıştırmadan ayırır. **Ama:** GA4 esasen istemci/web odaklı; mailing tool'un asıl değeri sunucu event'lerinde, dolayısıyla **GA4'ü bu araçta düşük öncelikte tut** — gerçek ölçüm PostHog sunucu event'leriyle daha temiz olur. GA4'ü illa kullanacaksan Measurement Protocol (sunucu) gerekir, bu da ek karmaşıklık.

### PostHog/Sentry: ayrı proje mi, tek projede ayırt edici mi?

| Seçenek | Ücretsiz-tier kısıtı | Artı | Eksi |
|---|---|---|---|
| **PostHog ayrı proje** (mailing) | PostHog free tier **kuruluş** bazında kota (örn. aylık event/recording); proje sayısı sınırlı olabilir, kota paylaşılır | Web sitesi verisiyle mailing verisi tamamen izole; yanlışlıkla karışmaz; farklı saklama/erişim | İki dashboard; cross-funnel (site→mail) analizi zorlaşır; kota yine ortak havuzdan yenir |
| **Tek PostHog projesi + ayırt edici** (`source: 'mailing'` / `service` property veya ayrı event prefix) | Tek kota havuzu | site↔mail funnel'ı tek yerde; tek yönetim | Karışma riski; PII/replay ayarları tek projede ortak — mailing'de replay zaten gereksiz, ayırmak için event filtreleme şart |
| **Sentry ayrı proje** (mailing) | Sentry free tier kuruluş bazında error kotası (aylık), proje açmak serbest | Hataları kaynağa göre net ayırır (web worker vs mailing worker); alert'ler temiz | Kota paylaşılır |
| **Tek Sentry projesi + environment/tag** | Tek kota | Tek yer | Web ve mailing hataları karışır, triyaj zorlaşır |

**Öneri:**
- **Sentry: AYRI PROJE** (mailing-manager). İki ayrı runtime/codebase olduğundan hataların ayrı projede olması triyajı ve alert'i temiz tutar; AB bölgesini (de.sentry.io) koru.
- **PostHog: TEK PROJE + ayırt edici property** (`source: 'mailing'`) ile başla. Sebep: site↔mailing dönüşüm funnel'ı (ziyaretçi → abone → tıklayan) tek projede çok daha değerli; kota tek havuzdan yense de mailing tarafında replay/autocapture kapalı olacağı için event hacmi düşük. İleride hacim artarsa ayrı projeye böl.

### Açık/tıklama takibinin rıza/şeffaflık tarafı

- **Açılma (pixel):** YOK ve **eklenmesini önermiyorum** kısa vadede. Eklenirse açık rıza + aydınlatma gerektirir; ayrıca README'deki yanlış "pixel var" ifadesi düzeltilmeli.
- **Tıklama (`/r` redirect):** zaten çalışıyor ve **davranışsal/profilleme verisi** üretiyor (kim, hangi linke, ne zaman). Bunun için:
  - Aydınlatma metninde **açıkça** belirt: "Gönderdiğimiz e-postalardaki bağlantılara yapılan tıklamaları, hangi içeriğin ilgi çektiğini ölçmek için kaydederiz."
  - Bir **hukuki dayanak** belirle (açık rıza veya meşru menfaat denge testi — avukat) ve dokümante et.
  - URL-düzeyi davranış verisi için **saklama süresi** tanımla; süre sonunda anonimleştir/sil.

### Mevcut akışı bozmama garantisi

PostHog/Sentry capture'ları **fire-and-forget** ekle (await'leme, hata yut) — analitik down olursa gönderim akışı etkilenmesin. mail tool'un kendi `campaign_link_clicks`/`send_events` tabloları **kaynak-of-truth** kalsın; PostHog yalnızca gözlem katmanı.

---

## E. AÇIK SORULAR (kullanıcıya — karar gerektiren, varsayamayacağım maddeler)

1. **Veri sorumlusu kim?** Aydınlatma metnine yazılacak **somut gerçek kişi adı-soyadı + başvuru e-postası** nedir? (kvkk@devmultigroup.com açılacak mı, yoksa support@/partner@ mı?) Bu, tüm metinlerin zorunlu alanı.
2. **Tek mi, ortak mı sorumlu?** Topluluğu birden fazla kişi mi yürütüyor? Öyleyse tek bir "veri sorumlusu gerçek kişi" belirleyip yazılı kayda geçirelim mi?
3. **Newsletter fiilen ticari/pazarlama e-postası mı?** Yoksa saf bilgilendirme/etkinlik duyurusu mu? (Bu, ETK/İYS'nin tetiklenip tetiklenmediğini belirler.) Hedef kitle bireyler mi, şirket yetkilileri (B2B) mi?
4. **İYS'ye girilecek mi / nasıl?** DMG'nin tüzel kişiliği ve VKN'si yok; İYS kaydı ancak **sorumlu gerçek kişinin TCKN/VKN'si** veya bir tüzel kişilik üzerinden yapılabilir. Hangi yolu seçiyoruz? (Bu kişi yasal muhatap + ceza riskinin hedefi olur.)
5. **PostHog session replay açık mı kalacak?** PostHog UI (proje 480740) açılıp doğrulanmalı: replay kayıtta mı, maskeleme nasıl? Karar: replay'i **kapat** mı, yoksa opt-in + tam metin maskeleme ile **aç** mı?
6. **Store ne zaman canlı?** iyzico/PayTR + ödeme verisi devreye girince aydınlatma metnine ödeme verisi + ödeme kuruluşuna aktarım + VUK/TTK saklama eklenmeli. Zamanlama?
7. **Saklama süreleri:** newsletter (abonelikten çıkana kadar?), store orders (VUK/TTK = kaç yıl?), contact form inbox (ne kadar?), tıklama davranış verisi (kaç ay sonra anonimleştir?) — somut süreleri belirleyelim.
8. **Email'i PostHog'a hash'leyerek mi gönderelim** (düz metin yerine SHA-256), yoksa hiç göndermeyelim mi? (Yurt dışı aktarım hassasiyetini azaltır.)
9. **VERBİS:** Büyük olasılıkla ekonomik istisnaya giriyoruz (50 çalışan / 100M TL altı), ama özel nitelikli veri (m.6) işlemediğimizi teyit ediyor muyuz? (Üye formlarında dini/siyasi/sağlık/üyelik alanı toplamıyoruz, değil mi?)
10. **GA4 gerçekten gerekli mi**, yoksa PostHog (tercihen EU Cloud'a taşıyarak) tek analitik mi olsun? GA4'ü çıkarmak yurt dışı aktarım + çerez yükünü ciddi azaltır.

---

## F. AVUKAT GEREKEN NOKTALAR (gerçek hukuki onay şart)

1. **Veri sorumlusu statüsü ve şahsi sorumluluk:** Tüzel kişilik kalkanı yok → topluluğu yürüten gerçek kişi(ler) KVKK ihlallerinden (idari para cezası m.18, tazminat, bazı fiillerde TCK m.135-140) **şahsen ve sınırsız** sorumlu. Tek mi ortak mı sorumlu olduğu KVKK metninde açık değil — bu en kritik yapısal hukuki karar. (Topluluk büyürse dernek/şirket kurma değerlendirmesi de buna bağlı.)
2. **İYS yükümlülüğü:** Newsletter'ın "ticari elektronik ileti" sayılıp sayılmadığı (içeriğe + hedef kitleye bağlı gri alan; sponsor/store öğeleri girince netleşir); İYS kayıt zorunluluğu/muafiyet eşikleri; kimliksiz/vergisiz oluşumun İYS'ye nasıl kaydolacağı.
3. **Yurt dışı aktarım zemini (m.9):** GA4/PostHog/Resend (ABD), Sentry (AB) sürekli/sistematik aktarımlar — "arızi + açık rıza" mı yeterli, yoksa **standart sözleşme + Kurum'a 5 iş günü bildirim** mi gerekli? Sağlayıcılar KVKK standart sözleşmesini imzalamazsa (GDPR SCC/DPA bunun yerine geçmez) hangi alternatif? Cloudflare Workers/D1'in veri-lokasyonu ve aktarım niteliği (teknik mimari + avukat).
4. **Meşru menfaat dayanağı:** Sunucu-tarafı PostHog/Sentry için "meşru menfaat" iddiasının KVKK m.5/2-f kapsamında geçerliliği (yazılı denge testi); özellikle newsletter sinyalinin pazarlama olarak rıza gerektirip gerektirmediği.
5. **Çerez modeli:** Opt-out'un KVKK açısından savunulabilir olmadığı görüşü güçlü; nihai opt-in mimarisi ve "birinci-taraf analitik muafiyeti" (Rehber 5.9) PostHog-EU senaryosunda işler mi — avukat onayı.
6. **Saklama süresinin aydınlatma metnine yazılmasının kesin zorunluluğu** (m.10 asgari unsurları arasında açık değil; güçlü beklenti — madde dayanağı için avukat).
7. **2026/347 ilke kararının tam metni** (aynı sayfada ayrı bölüm kuralı vb.) — birincil karar metni avukatça incelenmeli.
8. **Tüm nihai metinler** (aydınlatma + açık rıza + ETK onay + başvuru prosedürü + çerez politikası) yayına almadan önce KVKK/ETK uzmanı Türk avukatına onaylatılmalı.

---

## ÖNERİLEN SIRA

**0. Doğrula (1-2 gün, kod):** mail-template-generator'da `middleware.ts` gerçekten var mı, PII endpoint'leri (`gdpr/export`, `unsubscribes`, `contacts`) korumalı mı? `UNSUBSCRIBE_SECRET` prod'da set mi? PostHog proje 480740'ta replay açık mı / maskeleme ne? — *Bunlar yanıtı bilinmeyen güvenlik/gizlilik soruları; her şeyden önce kapanmalı.*

**1. Kararları al (kullanıcı + avukat):** E bölümündeki açık sorular (özellikle #1, #2, #3, #4) ve F bölümündeki yapısal hukuki noktalar (#1, #2, #3). Veri sorumlusu gerçek kişi netleşmeden hiçbir metin yazılamaz.

**2. Metinleri yaz ve yayınla (devmultigroup.com):** Aydınlatma metni + Çerez politikası + ETK onay metni (üç ayrı sayfa/akış); footer + form linkleri. Avukat onayına gönder. — *Bu, modelden bağımsız KVKK m.10 zorunluluğu; en hızlı kapatılabilecek büyük boşluk.*

**3. Analitiği opt-in'e çevir (go-live blocker):** GA4/PostHog/replay rıza öncesi yüklenmesin; banner'ı "eşit seçenekler" + "Tercihleri Yönet" + kalıcı geri-alma standardına getir; replay'i kapat veya tam-maskeleme + opt-in'e bağla.

**4. Newsletter'ı uyumlu hale getir:** Ayrı ETK onay kutusu + KVKK açık rıza kutusu (ön-işaretsiz); rıza kaydı (zaman, kaynak, kanal) sakla; İYS entegrasyonu (avukat onayına bağlı); her iletide ret linki (zaten var, koru).

**5. mail-template-generator'ı düzelt:** Aydınlatma/gizlilik linki + footer'daki "abone olduğun için" varsayımını gerçek rıza kaydına bağla; rıza kolonları ekle; GDPR export'a `send_events` + `campaign_link_clicks` ekle; **silme (erasure) endpoint'i** ekle; README pixel çelişkisini düzelt.

**6. Yurt dışı aktarım + saklama:** Avukatla aktarım zeminini netleştir (standart sözleşme vs açık rıza); PostHog'u EU Cloud'a taşımayı / email'i hash'lemeyi değerlendir; her veri kategorisi için saklama-imha politikası tanımla ve otomatik silme kur.

**7. Mailing analitik motorunu bağla (D bölümü):** Sunucu-ağırlıklı PostHog (tek proje + `source:'mailing'`) + ayrı Sentry projesi; mevcut akışı bozmadan fire-and-forget; açılma pixel'i ekleme.

**8. Cutover anında yeniden denetle:** devmultigroup.com apex'e bu worker'a geçince tüm uyumu canlı host üzerinde tekrar test et (staging'de analitik inert olduğundan denetim yanıltıcı). Opt-in değişikliği **sert go-live blocker** olarak işaretle.

---

*Kaynaklar (bulgulardaki gerçek URL'lerden seçilmiş): KVKK Aydınlatma Tebliği & Rehber No:60 — kvkk.gov.tr/Icerik/5443 ; 2026/347 ilke kararı — kvkk.gov.tr/Icerik/8710 ; Çerez Rehberi (Tem 2025) — kvkk.gov.tr/SharedFolderServer/CMSFiles/fb193dbb-b159-4221-8a7b-3addc083d33f.pdf ; Yurt Dışına Aktarım — kvkk.gov.tr/Icerik/2053 ve Rehber No:48 — kvkk.gov.tr/Icerik/8142 ; m.9 değişiklik Yönetmeliği (RG 10.07.2024) — resmigazete.gov.tr/eskiler/2024/07/20240710-2.htm ; ETK 6563 — mevzuat.gov.tr/MevzuatMetin/1.5.6563.pdf ; KVKK 6698 — mevzuat.gov.tr/MevzuatMetin/1.5.6698.pdf ; İYS — iys.org.tr/iys/kanun ; KVKK 2022/861 (pazarlama e-postası cezası) — kvkk.gov.tr/Icerik/7580/2022-861 ; KVKK 2022/1358 (rıza-öncesi izleme) — kvkk.gov.tr/Icerik/7595/2022-1358.*