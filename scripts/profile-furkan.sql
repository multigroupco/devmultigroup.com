-- Furkan Ünsalan's profile copy for /team/furkan-unsalan.
--
-- Every claim here is sourced, not invented: role and employer from
-- furkanunsalan.dev, the MultiGroup role from the team_members row, and the
-- devmultigroup.com / Warden work from this repository's own history and docs.
--
-- Direct D1 write → bump cv:team afterwards.

UPDATE team_members SET
  bio = 'Teachfluence''ta full-stack geliştirici; MultiGroup''un web tarafını kuran ve yürüten isim.',
  focus = 'Full-stack, Cloudflare Workers, Astro, Gizlilik, Self-hosting',
  long_bio = 'İstanbul''da yaşıyor, yazılım mühendisliği okuyor ve Teachfluence''ta full-stack geliştirici olarak çalışıyor. MultiGroup''ta Web Development Team''in yürütücüsü.

Şu an okuduğunuz site onun işi: **devmultigroup.com**, Cloudflare Workers üzerinde sunucu tarafında render edilen bir Astro uygulaması. İçeriğin tamamı D1''de duruyor ve `/admin` üzerinden düzenleniyor, yani bir yazıyı değiştirmek için yeniden dağıtım gerekmiyor. MultiGroup uygulamalarının ortak kimlik sağlayıcısı **Warden**''ı da o kurdu.

İlgi alanları işin yalnızca ürün tarafında bitmiyor: gizlilik, self-hosting ve açık kaynak üzerine kendi projelerini yürütüyor.',
  socials = '{"linkedin":"https://www.linkedin.com/in/furkanunsalan/","github":"https://github.com/furkanunsalan","website":"https://furkanunsalan.dev"}',
  updated_at = unixepoch()
WHERE slug = 'furkan-unsalan';
