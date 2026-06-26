<!-- LOCAL — commit/push YOK (KVKK politikası). Üretim: 2026-06-22.
     Kaynak: understanding workflow (5 ajan) + sentez. ANALIZ.md / KARARLAR.md ile birlikte okunur.
     Migration'lar LOCAL uygulanır; :remote + deploy + secret'lar go-live'da kullanıcı onayıyla. -->

# KVKK Analytics — Uygulama Planı (11 adım)

İki repo: **dev** = devmultigroup.com · **mail** = mail-template-generator.
Hepsi local. Prod D1 migration (`:remote`) + `npm run deploy` + Worker secret'ları = go-live (onay bekler).

| # | Özellik | Repo | Bağımlı | Bloklu? |
|---|---|---|---|---|
| 1 | PostHog e-posta SHA-256 hash (captureServer çekirdek + `sha256Hex`) | dev | — | hayır |
| 2 | Hash'i 3 server-capture çağrı yerine bağla (subscribe/contact/reserve) | dev | 1 | hayır |
| 3 | Bülten + sipariş rıza kaydı (şema + yazımlar) | dev | 1 (+7 contacts kolonları için) | kısmen |
| 4 | Consent audit tablosu + `/api/consent-record` (m.11/m.12) | dev | 1 | hayır |
| 5 | **Opt-in CMP** — banner + bootstrap yeniden yazımı | dev | 4 | hayır |
| 6 | Yasal metinler (aydınlatma/çerez/bülten) + footer linkleri | dev | — | **avukat** (DRAFT yayınla) |
| 7 | Mailing rıza metadata + hash'li suppression şema | mail | — | hayır |
| 8 | Mailing erasure endpoint (anonimleştir + hash suppression) | mail | 7 | hayır |
| 9 | Mailing analytics motoru — PostHog/GA4/Sentry sender'ları + secret'lar | mail | 7 | **GA secret + Sentry DSN** |
| 10 | Send/click/unsubscribe'a analytics bağla (consent+abonelik gated) | mail | 9,8 | hayır |
| 11 | Docs sync — opt-in durumu (ANALYTICS.md/CLAUDE.md/KARARLAR.md) | dev | 5,2,4 | hayır |

## Yeni migration'lar (LOCAL uygula, :remote go-live'da)
- `dev/migrations/0005_kvkk_consent_audit.sql` — `consent_records`, `erasure_log` (ana DB; sıradaki güvenli no = 0005, 0002/0003 dosya adları çift)
- `dev/migrations-store/0002_consent_tracking.sql` — `orders` ALTER: consent_at/source/channel (STORE_DB)
- `mail/drizzle/migrations/0015_kvkk_consent_tables.sql` — `subscriber_consent`, `suppressed_emails`, `contacts` ALTER (consent_*), `unsubscribes` ALTER (hashed_email)

## Çekirdek kararlar (sabit)
opt-in CMP (rıza öncesi GA/PostHog YOK; Sentry essential — avukat holdü) · rıza kaydı (tarih+kaynak+kanal) · PostHog'a yalnız **SHA-256 hash** e-posta · erasure = anonimleştir + hash suppression (re-opt-in bloklu) · tıklama açık + 12 ay sonra anonimleştir, **açılma/piksel YOK** · mailing PostHog = **aynı EU proje 93082** + `surface:mailing` tag (ayrı proje değil) · mailing GA = **ayrı GA4 data stream** (MP) · mailing Sentry = yeni DSN.

## Kullanıcı blokerleri
1. Avukat onayı — yasal metinler (adım 6) yayın öncesi DRAFT.
2. GA4 ayrı stream **Measurement ID + MP API secret** (adım 9) — gelene kadar GA sender no-op.
3. Sentry mailing DSN (MCP ile oluşturulacak) → `MAILING_SENTRY_DSN` secret.
4. Bülten ticari-değil/İYS-dışı sınıflandırması teyidi (adım 6 ETK checkbox'ı etkiler).
5. Veri sorumlusu = Furkan Ünsalan / kvkk@devmultigroup.com (yayın metni).

## Riskler
- **Apex-inert kapısı doğrulamayı maskeler:** tüm analitik off-apex inert → CMP/hash/consent-record uçtan uca yalnız apex cutover'da test edilir; staging yeşili = cutover yeşili DEĞİL. Local'de forced-apex ile test.
- **Prod D1 migration:** ALTER ADD COLUMN (DEFAULT'lu) SQLite/D1'de güvenli; yine de `:local` → doğrula → `:remote`. `mail` MAIL_DB = canlı mailing'in prod DB'si → diğer repo deploy'uyla yarıştırma.
- **migrations/ çift prefix** (0002/0003) — runner tam dosya adına göre mi sıralıyor teyit et; 0005 güvenli.
- **İki-repo MAIL_DB bağı:** dev subscribe.ts'in yazacağı contacts.consent_* kolonları adım 7'de (mail repo) açılır → DB-yazım yarısı adım 7'ye bağlı; o gelene kadar yalnız PostHog consent-property yarısı.
- **Sentry essential hukuki zemini** avukat holdü; reddedilirse loadSentry() de consent arkasına.
- **GA4 MP PII:** client_id = hash'li e-posta yine yurt dışı (ABD) aktarım → aydınlatmada açıkla + yalnız abone/suppress-olmayan alıcılara gated.
