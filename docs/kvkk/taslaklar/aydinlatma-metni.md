<!-- TASLAK — yayında DEĞİL. Yayın öncesi KVKK/ETK uzmanı avukat onayı + kullanıcı onayı gerekir.
     Kararlar: ../KARARLAR.md · Analiz: ../ANALIZ.md · Üretim: 2026-06-22.
     [AVUKAT] etiketli yerler ve köşeli parantezli alanlar doldurulmalı/onaylanmalı. -->

# Kişisel Verilerin Korunması — Aydınlatma Metni

_Son güncelleme: [GG.AA.YYYY] · Versiyon: Taslak_

## 1. Veri Sorumlusu

Developer MultiGroup (**DMG**), iOS, web, veri ve yapay zekâ alanlarında geliştiricilerin bir araya geldiği, **tüzel kişiliği bulunmayan gönüllü bir topluluktur.** Topluluk adına kişisel verilerin işlenme amaç ve vasıtalarını belirleyen veri sorumlusu gerçek kişi:

- **Veri Sorumlusu:** Furkan Ünsalan
- **Başvuru / İletişim:** kvkk@devmultigroup.com

> [AVUKAT] Tüzel kişilik bulunmadığından sorumluluk gerçek kişiye aittir; tek/müşterek veri sorumlusu durumu ve sorumluluğun kapsamı avukatça teyit edilmelidir.

## 2. İşlediğimiz Kişisel Veriler

| Kategori | Örnek veriler | Nereden |
|---|---|---|
| Kimlik / İletişim | Ad, e-posta adresi | Bülten kaydı, iletişim formu |
| İşlem / Talep | İletişim formu mesaj içeriği | İletişim formu |
| Sipariş (mağaza) | Ad, e-posta, ürün/adet, sipariş notu | Mağaza ön sipariş/rezervasyon |
| İşlem güvenliği / Kullanım | Çerez kimlikleri, cihaz/tarayıcı bilgisi, sayfa etkileşimleri, hata kayıtları | Web sitesi (çerez/analitik), hata izleme |
| E-posta etkileşimi | Gönderdiğimiz e-postalardaki bağlantı tıklamaları | E-posta bülteni |

**Özel nitelikli kişisel veri (din, sağlık, üyelik, biyometrik vb.) toplamıyoruz.**

## 3. İşleme Amaçları ve Hukuki Sebepleri (KVKK m.5)

| Amaç | Hukuki sebep |
|---|---|
| Bülten / etkinlik duyurularını göndermek | **Açık rıza** (KVKK m.5/1) |
| İletişim talebini yanıtlamak | Sözleşme öncesi gereklilik / meşru menfaat (m.5/2-c,f) |
| Mağaza sipariş/rezervasyonunu yürütmek | Sözleşmenin ifası (m.5/2-c) |
| Web sitesi analitiği ve iyileştirme (analitik çerezler) | **Açık rıza** (m.5/1) — yalnızca onay verilirse |
| Hata izleme ve site güvenliği | Meşru menfaat (m.5/2-f) [AVUKAT: denge testi] |
| E-posta etkileşim ölçümü (tıklama) | Meşru menfaat (m.5/2-f) [AVUKAT] |

> Zorunlu olmayan analitik/pazarlama çerezleri **yalnızca açık rızanızla** çalışır; siteyi ilk açtığınızda bu çerezler yüklenmez (opt-in).

## 4. Toplama Yöntemi

Veriler; web sitesi formları (bülten kaydı, iletişim, mağaza), çerezler/benzeri teknolojiler ve gönderilen e-postalardaki bağlantı yönlendirmeleri aracılığıyla, **otomatik ve otomatik olmayan** yollarla toplanır.

## 5. Aktarılan Taraflar

Verileriniz, yalnızca aşağıdaki amaçlarla ve gerekli olduğu ölçüde aktarılır:

| Alıcı | Amaç | Konum |
|---|---|---|
| Cloudflare (barındırma/altyapı, veritabanı) | Sitenin ve verilerin barındırılması | [AVUKAT: konum/aktarım niteliği] |
| Resend (e-posta gönderimi) | İletişim formu / sistem e-postaları | ABD |
| Cloudflare Email Sending | Bülten e-postalarının gönderimi | — |
| Google Analytics 4 | Web analitiği (yalnızca rıza ile) | ABD |
| PostHog | Ürün analitiği (yalnızca rıza ile) | AB (Avrupa Birliği) |
| Sentry | Hata izleme | AB (Almanya) |
| Yetkili kamu kurum/kuruluşları | Kanunen zorunlu hallerde | Türkiye |

E-posta adresiniz PostHog'a **ham olarak değil, geri döndürülemez şekilde (SHA-256 ile şifrelenerek)** iletilir.

## 6. Yurt Dışına Aktarım (KVKK m.9)

Yukarıdaki bazı hizmet sağlayıcılar yurt dışında bulunur: **Google Analytics ve Resend → ABD; PostHog ve Sentry → Avrupa Birliği.** Bu aktarımlar, **açık rızanız** kapsamında gerçekleştirilir. [AVUKAT: nihai aktarım zemini — açık rıza ve/veya standart sözleşme + Kurum'a bildirim — netleştirilecek.]

## 7. Saklama Süreleri

| Veri | Süre |
|---|---|
| Bülten e-posta adresi | Abonelikten çıkana kadar |
| Mağaza siparişleri | Yasal saklama süresi (VUK/TTK) [AVUKAT: kesin süre], sonrasında silinir |
| İletişim formu kayıtları | 2 yıl |
| E-posta tıklama/etkileşim verisi | 12 ay sonra anonimleştirilir |
| Analitik veriler (GA/PostHog) | 14 ay |

## 8. İlgili Kişi Olarak Haklarınız (KVKK m.11)

Veri sorumlusuna başvurarak; kişisel verinizin işlenip işlenmediğini öğrenme, buna ilişkin bilgi talep etme, işlenme amacını ve amacına uygun kullanılıp kullanılmadığını öğrenme, yurt içi/yurt dışında aktarıldığı üçüncü kişileri bilme, eksik/yanlış işlenmişse düzeltilmesini, KVKK m.7 şartları çerçevesinde **silinmesini/yok edilmesini**, bu işlemlerin aktarılan üçüncü kişilere bildirilmesini, münhasıran otomatik analiz sonucu aleyhinize bir sonuç çıkmasına itiraz etme ve zarara uğramanız hâlinde giderilmesini talep etme haklarına sahipsiniz.

## 9. Başvuru

Haklarınızı kullanmak için taleplerinizi **kvkk@devmultigroup.com** adresine iletebilirsiniz. Başvurunuz en geç **30 gün** içinde sonuçlandırılır; kural olarak ücretsizdir. [AVUKAT: Veri Sorumlusuna Başvuru Usul ve Esasları Tebliği'ne uygun yazılı/KEP kanalları eklenecek.]
