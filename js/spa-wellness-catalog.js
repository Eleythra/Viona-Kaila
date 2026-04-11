/**
 * Spa & Wellness — tek kaynak: spa içerik modülü + PDF menüleri.
 * Tekil hizmetler + program paketleri; süre ve fiyat seçim satırında ve içerikte gösterilir.
 */
(function () {
  "use strict";

  /** tr, en, de, pl — brak lub pusty 4. argument: PL = EN (nie zalecane; tu zawsze podane PL). */
  function L(tr, en, de, pl) {
    var p = arguments.length >= 4 && pl != null && String(pl).trim() !== "" ? String(pl) : en;
    return { tr: tr, en: en, de: de, pl: p };
  }

  function item(id, label, price) {
    return { id: id, code: id, label: label, price: price };
  }

  function programPkg(id, title, durationLine, price, bullets) {
    return {
      id: id,
      code: id,
      label: title,
      price: price,
      durationLine: durationLine,
      bullets: bullets,
    };
  }

  /** @type {Record<string, ReturnType<L>>} */
  var DURATION_BY_ID = {
    spa_ham_body_peel_foam: L("30 dk.", "30 min.", "30 Min.", "30 min."),
    spa_ham_coffee_salt_peel_foam: L("30 dk.", "30 min.", "30 Min.", "30 min."),
    spa_ham_traditional_foam: L("20 dk.", "20 min.", "20 Min.", "20 min."),
    spa_ham_salt_therapy: L("20 dk.", "20 min.", "20 Min.", "20 min."),
    spa_ham_mud_therapy: L("45 dk.", "45 min.", "45 Min.", "45 min."),
    spa_massage_full_body: L("30 / 60 dk.", "30 / 60 min.", "30 / 60 Min.", "30 / 60 min."),
    spa_massage_aroma: L("30 / 60 dk.", "30 / 60 min.", "30 / 60 Min.", "30 / 60 min."),
    spa_massage_relax: L("30 / 60 dk.", "30 / 60 min.", "30 / 60 Min.", "30 / 60 min."),
    spa_massage_face_mask: L("30 dk.", "30 min.", "30 Min.", "30 min."),
    spa_massage_medical_full: L("60 dk.", "60 min.", "60 Min.", "60 min."),
    spa_massage_medical_back: L("30 dk.", "30 min.", "30 Min.", "30 min."),
    spa_massage_manual_60: L("60 dk.", "60 min.", "60 Min.", "60 min."),
    spa_massage_manual_90: L("90 dk.", "90 min.", "90 Min.", "90 min."),
    spa_massage_lymph: L("30 / 60 dk.", "30 / 60 min.", "30 / 60 Min.", "30 / 60 min."),
    spa_massage_foot: L("30 dk.", "30 min.", "30 Min.", "30 min."),
    spa_massage_hot_stone_full: L("60 dk.", "60 min.", "60 Min.", "60 min."),
    spa_massage_hot_stone_back: L("30 dk.", "30 min.", "30 Min.", "30 min."),
    spa_massage_mix: L("60 / 90 dk.", "60 / 90 min.", "60 / 90 Min.", "60 / 90 min."),
    spa_massage_anticellulite: L("60 dk.", "60 min.", "60 Min.", "60 min."),
    spa_massage_sport: L("45 dk.", "45 min.", "45 Min.", "45 min."),
    spa_massage_honey: L("45 dk.", "45 min.", "45 Min.", "45 min."),
    spa_massage_chocolate: L("45 dk.", "45 min.", "45 Min.", "45 min."),
    spa_asia_thai_classic: L("60 dk.", "60 min.", "60 Min.", "60 min."),
    spa_asia_thai_bali_mix: L("90 dk.", "90 min.", "90 Min.", "90 min."),
    spa_asia_bali_classic: L("60 dk.", "60 min.", "60 Min.", "60 min."),
    spa_asia_bali_royal: L("90 dk.", "90 min.", "90 Min.", "90 min."),
    spa_asia_shiatsu: L("60 dk.", "60 min.", "60 Min.", "60 min."),
    spa_asia_jimbaran: L("60 dk.", "60 min.", "60 Min.", "60 min."),
  };

  var programPackages = [
    programPkg(
      "spa_pkg_program_1",
      L("PROGRAM -1-", "PROGRAM -1-", "PROGRAM -1-", "PROGRAM -1-"),
      L("90 dk.", "90 min.", "90 Min.", "90 min."),
      "50 €",
      [
        L("Sauna & Buhar Odası", "Sauna & Steam Room", "Sauna & Dampfbad", "Sauna i łaźnia parowa"),
        L(
          "Türk Hamamında Geleneksel Peeling",
          "Traditional Peeling in Turkish Bath",
          "Traditionelles Peeling im Türkischen Bad",
          "Tradycyjny peeling w łaźni tureckiej",
        ),
        L(
          "Türk Hamamında Geleneksel Köpük Masajı",
          "Traditional Foam Massage in Turkish Bath",
          "Traditionelle Schaummassage im Türkischen Bad",
          "Tradycyjna kąpiel piankowa w łaźni tureckiej",
        ),
        L("30 dk. Tüm Vücut Masajı", "30 min. Full Body Massage", "30 Min. Ganzkörpermassage", "30 min. masaż całego ciała"),
        L("Kil Maskesi", "Clay Mask", "Tonerde-Maske", "Maska z gliny"),
      ],
    ),
    programPkg(
      "spa_pkg_program_2",
      L("PROGRAM -2-", "PROGRAM -2-", "PROGRAM -2-", "PROGRAM -2-"),
      L("105 dk.", "105 min.", "105 Min.", "105 min."),
      "65 €",
      [
        L("Sauna & Buhar Odası", "Sauna & Steam Room", "Sauna & Dampfbad", "Sauna i łaźnia parowa"),
        L(
          "Türk Hamamında Geleneksel Kahve Peelingi",
          "Traditional Coffee Peeling in Turkish Bath",
          "Traditionelles Kaffeepeeling im Türkischen Bad",
          "Tradycyjny peeling kawowy w łaźni tureckiej",
        ),
        L(
          "Türk Hamamında Geleneksel Köpük Masajı",
          "Traditional Foam Massage in Turkish Bath",
          "Traditionelle Schaummassage im Türkischen Bad",
          "Tradycyjna kąpiel piankowa w łaźni tureckiej",
        ),
        L(
          "45 dk. Aromaterapi Masajı",
          "45 min. Aromatherapy Massage",
          "45 Min. Aromatherapie-Massage",
          "45 min. masaż aromaterapeutyczny",
        ),
        L("Yosun Maskesi", "Algae Mask", "Algenmaske", "Maska z alg"),
      ],
    ),
    programPkg(
      "spa_pkg_program_3",
      L("PROGRAM -3-", "PROGRAM -3-", "PROGRAM -3-", "PROGRAM -3-"),
      L("120 dk.", "120 min.", "120 Min.", "120 min."),
      "80 €",
      [
        L("Sauna & Buhar Odası", "Sauna & Steam Room", "Sauna & Dampfbad", "Sauna i łaźnia parowa"),
        L(
          "Türk Hamamında Geleneksel Tuz Peelingi",
          "Traditional Salt Scrub Peeling in Turkish Bath",
          "Traditionelles Salzpeeling im Türkischen Bad",
          "Tradycyjny peeling solny w łaźni tureckiej",
        ),
        L(
          "Türk Hamamında Geleneksel Köpük Masajı",
          "Traditional Foam Massage in Turkish Bath",
          "Traditionelle Schaummassage im Türkischen Bad",
          "Tradycyjna kąpiel piankowa w łaźni tureckiej",
        ),
        L(
          "60 dk. Mix (Karışık) Terapi Masajı",
          "60 min. Mix Therapy Massage",
          "60 Min. Mix-Therapie-Massage",
          "60 min. masaż mix (łączony)",
        ),
        L("Altın & Siyah Maske", "Gold & Black Mask", "Gold- & Schwarzmaske", "Maska złoto-czarna"),
      ],
    ),
    programPkg(
      "spa_pkg_after_sun",
      L("Güneş sonrası bakım", "After sun", "AFTER SUN", "Pielęgnacja po opalaniu"),
      L("75 dk.", "75 min.", "75 Min.", "75 min."),
      "45 €",
      [
        L("Buhar Odası", "Steam Room", "Dampfbad", "Łaźnia parowa"),
        L(
          "Türk Hamamında Geleneksel Köpük Masajı",
          "Traditional Foam Massage in Turkish Bath",
          "Traditionelle Schaummassage im Türkischen Bad",
          "Tradycyjna kąpiel piankowa w łaźni tureckiej",
        ),
        L(
          "45 dk. Kantaron Yağı Masajı",
          "45 min. St. John’s Wort Oil Massage",
          "45 Min. Johanniskrautöl-Massage",
          "45 min. masaż olejem z dziurawca",
        ),
        L("Kil Maskesi", "Clay Mask", "Tonerde-Maske", "Maska z gliny"),
      ],
    ),
    programPkg(
      "spa_pkg_kids",
      L("Çocuk programı", "Kid's program", "Kinderprogramm", "Program dla dzieci"),
      L("45 dk.", "45 min.", "45 Min.", "45 min."),
      "25 €",
      [
        L("Sauna & Buhar Odası", "Sauna & Steam Room", "Sauna & Dampfbad", "Sauna i łaźnia parowa"),
        L(
          "Türk Hamamında Geleneksel Köpük Masajı",
          "Traditional Foam Massage in Turkish Bath",
          "Traditionelle Schaummassage im Türkischen Bad",
          "Tradycyjna kąpiel piankowa w łaźni tureckiej",
        ),
        L("Çikolata Maskesi", "Chocolate Mask", "Schokoladenmaske", "Maska czekoladowa"),
      ],
    ),
    programPkg(
      "spa_pkg_vip",
      L("V.I.P PROGRAM", "V.I.P PROGRAM", "V.I.P PROGRAMM", "PROGRAM V.I.P"),
      L("180 dk.", "180 min.", "180 Min.", "180 min."),
      "120 €",
      [
        L("Sauna & Buhar Odası", "Sauna & Steam Room", "Sauna & Dampfbad", "Sauna i łaźnia parowa"),
        L(
          "Türk Hamamında Geleneksel Tuz Peelingi",
          "Traditional Salt Scrub Peeling in Turkish Bath",
          "Traditionelles Salzpeeling im Türkischen Bad",
          "Tradycyjny peeling solny w łaźni tureckiej",
        ),
        L(
          "Türk Hamamında Geleneksel Köpük Masajı",
          "Traditional Foam Massage in Turkish Bath",
          "Traditionelle Schaummassage im Türkischen Bad",
          "Tradycyjna kąpiel piankowa w łaźni tureckiej",
        ),
        L("Aromalı Jakuzi", "Jacuzzi with Aroma", "Aromajacuzzi", "Jacuzzi z aromaterapią"),
        L("Tropikal Meyve Tabağı", "Tropical Fruit Plate", "Tropischer Obstteller", "Tropikalna misa owoców"),
        L(
          "90 dk. Sıcak Taş, Manuel & Thai Masajı",
          "90 min. Hot Stone, Manual & Thai Massage",
          "90 Min. Hot-Stone-, Manuelle & Thai-Massage",
          "90 min. masaż gorącymi kamieniami, manualny i tajski",
        ),
        L("Altın & Siyah Maske", "Gold & Black Mask", "Gold- & Schwarzmaske", "Maska złoto-czarna"),
      ],
    ),
  ];

  var programCategoryTitle = L(
    "Spa program paketleri",
    "Spa program packages",
    "Spa-Programmpakete",
    "Pakiety programów spa",
  );

  var categories = [
    {
      title: L(
        "Türk hamamı & hamam",
        "Turkish bath & hamam",
        "Türkisches Bad & Hamam",
        "Łaźnia turecka i hamam",
      ),
      items: [
        item(
          "spa_ham_body_peel_foam",
          L(
            "Vücut Peelingi + Köpük Masajı",
            "Body Peeling + Foam Massage",
            "Körperpeeling + Schaummassage",
            "Peeling ciała + masaż piankowy",
          ),
          "25 €",
        ),
        item(
          "spa_ham_coffee_salt_peel_foam",
          L(
            "Kahve veya Tuz Peelingi + Köpük Masajı",
            "Coffee or Salt Peeling + Foam Massage",
            "Kaffee- oder Salzpeeling + Schaummassage",
            "Peeling kawowy lub solny + masaż piankowy",
          ),
          "35 €",
        ),
        item(
          "spa_ham_traditional_foam",
          L(
            "Geleneksel Türk Köpük Masajı",
            "Traditional Turkish Foam Massage",
            "Traditionelle türkische Schaummassage",
            "Tradycyjna turecka kąpiel piankowa",
          ),
          "25 €",
        ),
        item(
          "spa_ham_salt_therapy",
          L("Tuz Terapisi", "Salt Therapy", "Salztherapie", "Terapia solna"),
          "20 €",
        ),
        item(
          "spa_ham_mud_therapy",
          L("Çamur Terapisi", "Mud Therapy", "Schlammtherapie", "Terapia borowiną"),
          "60 €",
        ),
      ],
    },
    {
      title: L("Masajlar", "Massages", "Massagen", "Masaże"),
      items: [
        item(
          "spa_massage_full_body",
          L(
            "Tüm Vücut Masajı",
            "Full Body Massage",
            "Ganzkörpermassage",
            "Masaż całego ciała",
          ),
          "30 € / 50 €",
        ),
        item(
          "spa_massage_aroma",
          L(
            "Aromaterapi Masajı",
            "Aroma Therapy Massage",
            "Aromatherapie-Massage",
            "Masaż aromaterapeutyczny",
          ),
          "35 € / 55 €",
        ),
        item(
          "spa_massage_relax",
          L(
            "Rahatlatıcı Masaj",
            "Relax Massage",
            "Entspannungsmassage",
            "Masaż relaksacyjny",
          ),
          "35 € / 55 €",
        ),
        item(
          "spa_massage_face_mask",
          L(
            "Yüz Maskesi & Yüz Masajı",
            "Face Mask & Face Massage",
            "Gesichtsmaske & Gesichtsmassage",
            "Maska na twarz i masaż twarzy",
          ),
          "25 €",
        ),
        item(
          "spa_massage_medical_full",
          L(
            "Medikal Tüm Vücut Masajı",
            "Medical Full Body Massage",
            "Medizinische Ganzkörpermassage",
            "Masaż leczniczy całego ciała",
          ),
          "60 €",
        ),
        item(
          "spa_massage_medical_back",
          L(
            "Medikal Sırt Masajı",
            "Medical Back Massage",
            "Medizinische Rückenmassage",
            "Masaż leczniczy pleców",
          ),
          "35 €",
        ),
        item(
          "spa_massage_manual_60",
          L(
            "Manuel Terapi Masajı",
            "Manual Therapy Massage",
            "Manuelle Therapie",
            "Masaż terapii manualnej (60 min.)",
          ),
          "75 €",
        ),
        item(
          "spa_massage_manual_90",
          L(
            "Manuel Terapi Masajı",
            "Manual Therapy Massage",
            "Manuelle Therapie",
            "Masaż terapii manualnej (90 min.)",
          ),
          "95 €",
        ),
        item(
          "spa_massage_lymph",
          L(
            "Lenf Drenaj Masajı",
            "Lymphatic Drainage Massage",
            "Lymphdrainage-Massage",
            "Masaż limfatyczny (drenaż)",
          ),
          "35 € / 60 €",
        ),
        item(
          "spa_massage_foot",
          L(
            "Ayak Rahatlatma Masajı",
            "Foot Relax Massage",
            "Fuß-Entspannungsmassage",
            "Masaż relaksacyjny stóp",
          ),
          "30 €",
        ),
        item(
          "spa_massage_hot_stone_full",
          L(
            "Sıcak Taş Tüm Vücut Masajı",
            "Hot Stone Full Body Massage",
            "Hot-Stone-Ganzkörpermassage",
            "Masaż gorącymi kamieniami — całe ciało",
          ),
          "60 €",
        ),
        item(
          "spa_massage_hot_stone_back",
          L(
            "Sıcak Taş Sırt Masajı",
            "Hot Stone Back Massage",
            "Hot-Stone-Rückenmassage",
            "Masaż gorącymi kamieniami — plecy",
          ),
          "35 €",
        ),
        item(
          "spa_massage_mix",
          L(
            "Mix (Karışık) Terapi Masajı",
            "Mix Therapy Massage",
            "Mix-Therapie-Massage",
            "Masaż mieszany (mix)",
          ),
          "65 € / 85 €",
        ),
        item(
          "spa_massage_anticellulite",
          L(
            "Selülit Karşıtı Masaj",
            "Anti-Cellulite Massage",
            "Anti-Cellulite-Massage",
            "Masaż antycellulitowy",
          ),
          "60 €",
        ),
        item(
          "spa_massage_sport",
          L("Spor Masajı", "Sport Massage", "Sportmassage", "Masaż sportowy"),
          "50 €",
        ),
        item(
          "spa_massage_honey",
          L("Bal Masajı", "Honey Massage", "Honigmassage", "Masaż miodowy"),
          "60 €",
        ),
        item(
          "spa_massage_chocolate",
          L(
            "Çikolata Terapi Masajı",
            "Chocolate Therapy Massage",
            "Schokoladen-Therapie-Massage",
            "Masaż czekoladowy",
          ),
          "60 €",
        ),
      ],
    },
    {
      title: L(
        "Asya masajları",
        "Asia massages",
        "Asiatische Massagen",
        "Masaże azjatyckie",
      ),
      items: [
        item(
          "spa_asia_thai_classic",
          L(
            "Klasik Thai Masajı",
            "Thai Classic Massage",
            "Klassische Thai-Massage",
            "Klasyczny masaż tajski",
          ),
          "70 €",
        ),
        item(
          "spa_asia_thai_bali_mix",
          L(
            "Thai - Bali Karışık Masaj",
            "Thai - Bali Mix Massage",
            "Thai-Bali-Mix-Massage",
            "Masaż mix Thai–Bali",
          ),
          "90 €",
        ),
        item(
          "spa_asia_bali_classic",
          L(
            "Klasik Bali Masajı",
            "Bali Classic Massage",
            "Klassische Bali-Massage",
            "Klasyczny masaż balijski",
          ),
          "70 €",
        ),
        item(
          "spa_asia_bali_royal",
          L(
            "Bali Royal Masajı",
            "Bali Royal Massage",
            "Bali Royal Massage",
            "Masaż Bali Royal",
          ),
          "90 €",
        ),
        item(
          "spa_asia_shiatsu",
          L("Shiatsu Masajı", "Shiatsu Massage", "Shiatsu-Massage", "Masaż Shiatsu"),
          "70 €",
        ),
        item(
          "spa_asia_jimbaran",
          L(
            "Jimbaran Masajı (4 El)",
            "Jimbaran Massage (4 Hands)",
            "Jimbaran-Massage (4 Hände)",
            "Masaż Jimbaran (4 ręce)",
          ),
          "90 €",
        ),
      ],
    },
  ];

  categories.forEach(function (cat) {
    cat.items.forEach(function (it) {
      var d = DURATION_BY_ID[it.id];
      if (d) it.durationLine = d;
    });
  });

  function getFlatServices() {
    var out = [];
    programPackages.forEach(function (p) {
      out.push({
        id: p.id,
        code: p.code,
        label: p.label,
        price: p.price,
        durationLine: p.durationLine,
      });
    });
    categories.forEach(function (c) {
      c.items.forEach(function (i) {
        out.push(i);
      });
    });
    return out;
  }

  window.VionaSpaWellnessCatalog = {
    categories: categories,
    programPackages: programPackages,
    programCategoryTitle: programCategoryTitle,
    getFlatServices: getFlatServices,
  };
})();
