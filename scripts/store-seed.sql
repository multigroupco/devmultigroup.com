-- MultiGroup Store — local seed (idempotent on id). Run with:
--   npm run store:seed:local
-- Money is kuruş (×100). Images left empty → on-black placeholder cards.
-- Product-focused: no drops; products are browsed directly by category.

INSERT OR REPLACE INTO products
  (id, slug, drop_id, name, tagline, description, images, base_price_minor, stock_quantity, category, fulfillment_mode, material, fit_note, size_chart, is_featured, is_active, sort_order)
VALUES
  ('prod-body-tee', 'body-tisort', '', '<Body> Tişört',
   'console.log("merhaba dünya")',
   'Ağır penye, yumuşak tuşe. Sırtta küçük <Body> baskısı, önde minimal wordmark. Etkinlikte teslim.',
   '[]', 34900, 0, 'giyim', 'preorder',
   '240gsm · %100 penye pamuk', 'Model 183cm, M giyiyor · Tam kalıp',
   'S 70×52 · M 72×54 · L 74×56 · XL 76×58 (boy × en, cm)', 1, 1, 0),

  ('prod-deploy-hoodie', 'deploy-hoodie', '', 'git push --force Hoodie',
   'cuma 17:00 enerjisi',
   'Fitilli kapüşonlu. Kanguru cep, içi şardonlu. Sınırlı ön sipariş.',
   '[]', 64900, 0, 'giyim', 'preorder',
   '380gsm · pamuk/poliester karışım', 'Oversize kalıp · Bir beden küçük al',
   'S 66×56 · M 68×58 · L 70×60 · XL 72×62 (boy × en, cm)', 0, 1, 1),

  ('prod-sticker-pack', 'cikartma-paketi', '', 'Çıkartma Paketi v1',
   '8 adet · laptop kapağı için',
   'Dayanıklı, su geçirmez vinil. 8 farklı tasarım. En düşük sürtünmeli giriş ürünü.',
   '[]', 8900, 100, 'koleksiyon', 'stocked',
   'Su geçirmez vinil · mat laminasyon', '', '', 1, 1, 2),

  ('prod-enamel-pin', 'emaye-rozet', '', '404 Emaye Rozet',
   'kayıp ama gururlu',
   'Sert emaye, parlak nikel. Çift iğne kilidi. Koleksiyon parçası.',
   '[]', 12900, 40, 'koleksiyon', 'stocked',
   'Sert emaye · nikel kaplama · 32mm', '', '', 0, 1, 3);

-- variants for the apparel (stock = per-drop reservation cap; decremented on reserve)
INSERT OR REPLACE INTO product_variants (id, product_id, label, sku, price_modifier_minor, stock_quantity, sort_order, is_active) VALUES
  ('var-tee-s',  'prod-body-tee', 'S',  'TEE-S', 0, 10, 0, 1),
  ('var-tee-m',  'prod-body-tee', 'M',  'TEE-M', 0, 10, 1, 1),
  ('var-tee-l',  'prod-body-tee', 'L',  'TEE-L', 0, 10, 2, 1),
  ('var-tee-xl', 'prod-body-tee', 'XL', 'TEE-XL', 0, 8, 3, 1),
  ('var-hoodie-s',  'prod-deploy-hoodie', 'S',  'HD-S', 0, 6, 0, 1),
  ('var-hoodie-m',  'prod-deploy-hoodie', 'M',  'HD-M', 0, 6, 1, 1),
  ('var-hoodie-l',  'prod-deploy-hoodie', 'L',  'HD-L', 0, 0, 2, 1),
  ('var-hoodie-xl', 'prod-deploy-hoodie', 'XL', 'HD-XL', 0, 4, 3, 1);
