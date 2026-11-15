-- Hide only the original demo catalogue fixtures. Keep rows so historical
-- orders that reference these products remain intact.
UPDATE products SET is_active = 0
WHERE (id = 'p1' AND slug = 'petal-memory-box')
   OR (id = 'p2' AND slug = 'soft-bloom-bouquet')
   OR (id = 'p3' AND slug = 'name-in-the-stars-frame')
   OR (id = 'p4' AND slug = 'polaroid-love-ladder')
   OR (id = 'p5' AND slug = 'moonlit-room-lamp')
   OR (id = 'p6' AND slug = 'custom-story-painting')
   OR (id = 'p7' AND slug = 'resin-phone-cover')
   OR (id = 'p8' AND slug = 'everyday-hoop-set')
   OR (id = 'p9' AND slug = 'fandom-shadow-box')
   OR (id = 'p10' AND slug = 'study-desk-sun-catcher')
   OR (id = 'p11' AND slug = 'custom-chocolate-bouquet')
   OR (id = 'p12' AND slug = 'miniature-room-diorama')
   OR (id = 'p13' AND slug = 'campus-bestie-card-set')
   OR (id = 'p14' AND slug = 'custom-name-plate')
   OR (id = 'p15' AND slug = 'resin-preserved-flower-frame')
   OR (id = 'p16' AND slug = 'signature-memory-trunk');
