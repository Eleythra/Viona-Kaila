/**
 * Spa & Wellness — tek kaynak: rezervasyon formu + spa içerik modülü.
 * Tekil hizmetler + program paketleri; süre ve fiyat seçim satırında ve içerikte gösterilir.
 */
(function () {
  "use strict";

  function L(tr, en, de, ru) {
    return { tr: tr, en: en, de: de, ru: ru };
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
    spa_ham_body_peel_foam: L("30 dk.", "30 min.", "30 Min.", "30 мин."),
    spa_ham_coffee_salt_peel_foam: L("30 dk.", "30 min.", "30 Min.", "30 мин."),
    spa_ham_traditional_foam: L("20 dk.", "20 min.", "20 Min.", "20 мин."),
    spa_ham_salt_therapy: L("20 dk.", "20 min.", "20 Min.", "20 мин."),
    spa_ham_mud_therapy: L("45 dk.", "45 min.", "45 Min.", "45 мин."),
    spa_massage_full_body: L("30 / 60 dk.", "30 / 60 min.", "30 / 60 Min.", "30 / 60 мин."),
    spa_massage_aroma: L("30 / 60 dk.", "30 / 60 min.", "30 / 60 Min.", "30 / 60 мин."),
    spa_massage_relax: L("30 / 60 dk.", "30 / 60 min.", "30 / 60 Min.", "30 / 60 мин."),
    spa_massage_face_mask: L("30 dk.", "30 min.", "30 Min.", "30 мин."),
    spa_massage_medical_full: L("60 dk.", "60 min.", "60 Min.", "60 мин."),
    spa_massage_medical_back: L("30 dk.", "30 min.", "30 Min.", "30 мин."),
    spa_massage_manual_60: L("60 dk.", "60 min.", "60 Min.", "60 мин."),
    spa_massage_manual_90: L("90 dk.", "90 min.", "90 Min.", "90 мин."),
    spa_massage_lymph: L("30 / 60 dk.", "30 / 60 min.", "30 / 60 Min.", "30 / 60 мин."),
    spa_massage_foot: L("30 dk.", "30 min.", "30 Min.", "30 мин."),
    spa_massage_hot_stone_full: L("60 dk.", "60 min.", "60 Min.", "60 мин."),
    spa_massage_hot_stone_back: L("30 dk.", "30 min.", "30 Min.", "30 мин."),
    spa_massage_mix: L("60 / 90 dk.", "60 / 90 min.", "60 / 90 Min.", "60 / 90 мин."),
    spa_massage_anticellulite: L("60 dk.", "60 min.", "60 Min.", "60 мин."),
    spa_massage_sport: L("45 dk.", "45 min.", "45 Min.", "45 мин."),
    spa_massage_honey: L("45 dk.", "45 min.", "45 Min.", "45 мин."),
    spa_massage_chocolate: L("45 dk.", "45 min.", "45 Min.", "45 мин."),
    spa_asia_thai_classic: L("60 dk.", "60 min.", "60 Min.", "60 мин."),
    spa_asia_thai_bali_mix: L("90 dk.", "90 min.", "90 Min.", "90 мин."),
    spa_asia_bali_classic: L("60 dk.", "60 min.", "60 Min.", "60 мин."),
    spa_asia_bali_royal: L("90 dk.", "90 min.", "90 Min.", "90 мин."),
    spa_asia_shiatsu: L("60 dk.", "60 min.", "60 Min.", "60 мин."),
    spa_asia_jimbaran: L("60 dk.", "60 min.", "60 Min.", "60 мин."),
  };

  var programPackages = [
    programPkg(
      "spa_pkg_program_1",
      L("PROGRAM -1-", "PROGRAM -1-", "PROGRAM -1-", "ПРОГРАММА -1-"),
      L("90 dk.", "90 min.", "90 Min.", "90 мин."),
      "50 €",
      [
        L("Sauna & Buhar Odası", "Sauna & Steam Room", "Sauna & Dampfbad", "Сауна и паровая комната"),
        L(
          "Türk Hamamında Geleneksel Peeling",
          "Traditional Peeling in Turkish Bath",
          "Traditionelles Peeling im Türkischen Bad",
          "Традиционный пилинг в турецком хамаме",
        ),
        L(
          "Türk Hamamında Geleneksel Köpük Masajı",
          "Traditional Foam Massage in Turkish Bath",
          "Traditionelle Schaummassage im Türkischen Bad",
          "Традиционный пенный массаж в турецком хамаме",
        ),
        L("30 dk. Tüm Vücut Masajı", "30 min. Full Body Massage", "30 Min. Ganzkörpermassage", "30 мин. массаж всего тела"),
        L("Kil Maskesi", "Clay Mask", "Tonerde-Maske", "Глиняная маска"),
      ],
    ),
    programPkg(
      "spa_pkg_program_2",
      L("PROGRAM -2-", "PROGRAM -2-", "PROGRAM -2-", "ПРОГРАММА -2-"),
      L("105 dk.", "105 min.", "105 Min.", "105 мин."),
      "65 €",
      [
        L("Sauna & Buhar Odası", "Sauna & Steam Room", "Sauna & Dampfbad", "Сауна и паровая комната"),
        L(
          "Türk Hamamında Geleneksel Kahve Peelingi",
          "Traditional Coffee Peeling in Turkish Bath",
          "Traditionelles Kaffeepeeling im Türkischen Bad",
          "Традиционный кофейный пилинг в турецком хамаме",
        ),
        L(
          "Türk Hamamında Geleneksel Köpük Masajı",
          "Traditional Foam Massage in Turkish Bath",
          "Traditionelle Schaummassage im Türkischen Bad",
          "Традиционный пенный массаж в турецком хамаме",
        ),
        L(
          "45 dk. Aromaterapi Masajı",
          "45 min. Aromatherapy Massage",
          "45 Min. Aromatherapie-Massage",
          "45 мин. ароматерапевтический массаж",
        ),
        L("Yosun Maskesi", "Algae Mask", "Algenmaske", "Маска из водорослей"),
      ],
    ),
    programPkg(
      "spa_pkg_program_3",
      L("PROGRAM -3-", "PROGRAM -3-", "PROGRAM -3-", "ПРОГРАММА -3-"),
      L("120 dk.", "120 min.", "120 Min.", "120 мин."),
      "80 €",
      [
        L("Sauna & Buhar Odası", "Sauna & Steam Room", "Sauna & Dampfbad", "Сауна и паровая комната"),
        L(
          "Türk Hamamında Geleneksel Tuz Peelingi",
          "Traditional Salt Scrub Peeling in Turkish Bath",
          "Traditionelles Salzpeeling im Türkischen Bad",
          "Традиционный соляной пилинг в турецком хамаме",
        ),
        L(
          "Türk Hamamında Geleneksel Köpük Masajı",
          "Traditional Foam Massage in Turkish Bath",
          "Traditionelle Schaummassage im Türkischen Bad",
          "Традиционный пенный массаж в турецком хамаме",
        ),
        L(
          "60 dk. Mix (Karışık) Terapi Masajı",
          "60 min. Mix Therapy Massage",
          "60 Min. Mix-Therapie-Massage",
          "60 мин. комбинированный терапевтический массаж",
        ),
        L("Altın & Siyah Maske", "Gold & Black Mask", "Gold- & Schwarzmaske", "Золотая и чёрная маска"),
      ],
    ),
    programPkg(
      "spa_pkg_after_sun",
      L("Güneş sonrası bakım", "After sun", "AFTER SUN", "После солнца"),
      L("75 dk.", "75 min.", "75 Min.", "75 мин."),
      "45 €",
      [
        L("Buhar Odası", "Steam Room", "Dampfbad", "Паровая комната"),
        L(
          "Türk Hamamında Geleneksel Köpük Masajı",
          "Traditional Foam Massage in Turkish Bath",
          "Traditionelle Schaummassage im Türkischen Bad",
          "Традиционный пенный массаж в турецком хамаме",
        ),
        L(
          "45 dk. Kantaron Yağı Masajı",
          "45 min. St. John’s Wort Oil Massage",
          "45 Min. Johanniskrautöl-Massage",
          "45 мин. массаж с маслом зверобоя",
        ),
        L("Kil Maskesi", "Clay Mask", "Tonerde-Maske", "Глиняная маска"),
      ],
    ),
    programPkg(
      "spa_pkg_kids",
      L("Çocuk programı", "Kid's program", "Kinderprogramm", "Детская программа"),
      L("45 dk.", "45 min.", "45 Min.", "45 мин."),
      "25 €",
      [
        L("Sauna & Buhar Odası", "Sauna & Steam Room", "Sauna & Dampfbad", "Сауна и паровая комната"),
        L(
          "Türk Hamamında Geleneksel Köpük Masajı",
          "Traditional Foam Massage in Turkish Bath",
          "Traditionelle Schaummassage im Türkischen Bad",
          "Традиционный пенный массаж в турецком хамаме",
        ),
        L("Çikolata Maskesi", "Chocolate Mask", "Schokoladenmaske", "Шоколадная маска"),
      ],
    ),
    programPkg(
      "spa_pkg_vip",
      L("V.I.P PROGRAM", "V.I.P PROGRAM", "V.I.P PROGRAMM", "V.I.P ПРОГРАММА"),
      L("180 dk.", "180 min.", "180 Min.", "180 мин."),
      "120 €",
      [
        L("Sauna & Buhar Odası", "Sauna & Steam Room", "Sauna & Dampfbad", "Сауна и паровая комната"),
        L(
          "Türk Hamamında Geleneksel Tuz Peelingi",
          "Traditional Salt Scrub Peeling in Turkish Bath",
          "Traditionelles Salzpeeling im Türkischen Bad",
          "Традиционный соляной пилинг в турецком хамаме",
        ),
        L(
          "Türk Hamamında Geleneksel Köpük Masajı",
          "Traditional Foam Massage in Turkish Bath",
          "Traditionelle Schaummassage im Türkischen Bad",
          "Традиционный пенный массаж в турецком хамаме",
        ),
        L("Aromalı Jakuzi", "Jacuzzi with Aroma", "Aromajacuzzi", "Джакузи с ароматерапией"),
        L("Tropikal Meyve Tabağı", "Tropical Fruit Plate", "Tropischer Obstteller", "Тарелка тропических фруктов"),
        L(
          "90 dk. Sıcak Taş, Manuel & Thai Masajı",
          "90 min. Hot Stone, Manual & Thai Massage",
          "90 Min. Hot-Stone-, Manuelle & Thai-Massage",
          "90 мин. массаж: горячие камни, мануальный и тайский",
        ),
        L("Altın & Siyah Maske", "Gold & Black Mask", "Gold- & Schwarzmaske", "Золотая и чёрная маска"),
      ],
    ),
  ];

  var programCategoryTitle = L(
    "Spa program paketleri",
    "Spa program packages",
    "Spa-Programmpakete",
    "Спа-программы",
  );

  var categories = [
    {
      title: L(
        "Türk hamamı & hamam",
        "Turkish bath & hamam",
        "Türkisches Bad & Hamam",
        "Турецкая баня & хамам",
      ),
      items: [
        item(
          "spa_ham_body_peel_foam",
          L(
            "Vücut Peelingi + Köpük Masajı",
            "Body Peeling + Foam Massage",
            "Körperpeeling + Schaummassage",
            "Пилинг тела + пенный массаж",
          ),
          "25 €",
        ),
        item(
          "spa_ham_coffee_salt_peel_foam",
          L(
            "Kahve veya Tuz Peelingi + Köpük Masajı",
            "Coffee or Salt Peeling + Foam Massage",
            "Kaffee- oder Salzpeeling + Schaummassage",
            "Кофейный или соляной пилинг + пенный массаж",
          ),
          "35 €",
        ),
        item(
          "spa_ham_traditional_foam",
          L(
            "Geleneksel Türk Köpük Masajı",
            "Traditional Turkish Foam Massage",
            "Traditionelle türkische Schaummassage",
            "Традиционный турецкий пенный массаж",
          ),
          "25 €",
        ),
        item(
          "spa_ham_salt_therapy",
          L("Tuz Terapisi", "Salt Therapy", "Salztherapie", "Солевая терапия"),
          "20 €",
        ),
        item(
          "spa_ham_mud_therapy",
          L("Çamur Terapisi", "Mud Therapy", "Schlammtherapie", "Грязевая терапия"),
          "60 €",
        ),
      ],
    },
    {
      title: L("Masajlar", "Massages", "Massagen", "Массажи"),
      items: [
        item(
          "spa_massage_full_body",
          L(
            "Tüm Vücut Masajı",
            "Full Body Massage",
            "Ganzkörpermassage",
            "Массаж всего тела",
          ),
          "30 € / 50 €",
        ),
        item(
          "spa_massage_aroma",
          L(
            "Aromaterapi Masajı",
            "Aroma Therapy Massage",
            "Aromatherapie-Massage",
            "Ароматерапевтический массаж",
          ),
          "35 € / 55 €",
        ),
        item(
          "spa_massage_relax",
          L(
            "Rahatlatıcı Masaj",
            "Relax Massage",
            "Entspannungsmassage",
            "Расслабляющий массаж",
          ),
          "35 € / 55 €",
        ),
        item(
          "spa_massage_face_mask",
          L(
            "Yüz Maskesi & Yüz Masajı",
            "Face Mask & Face Massage",
            "Gesichtsmaske & Gesichtsmassage",
            "Маска для лица и массаж лица",
          ),
          "25 €",
        ),
        item(
          "spa_massage_medical_full",
          L(
            "Medikal Tüm Vücut Masajı",
            "Medical Full Body Massage",
            "Medizinische Ganzkörpermassage",
            "Медицинский массаж всего тела",
          ),
          "60 €",
        ),
        item(
          "spa_massage_medical_back",
          L(
            "Medikal Sırt Masajı",
            "Medical Back Massage",
            "Medizinische Rückenmassage",
            "Медицинский массаж спины",
          ),
          "35 €",
        ),
        item(
          "spa_massage_manual_60",
          L(
            "Manuel Terapi Masajı",
            "Manual Therapy Massage",
            "Manuelle Therapie",
            "Мануальная терапия",
          ),
          "75 €",
        ),
        item(
          "spa_massage_manual_90",
          L(
            "Manuel Terapi Masajı",
            "Manual Therapy Massage",
            "Manuelle Therapie",
            "Мануальная терапия",
          ),
          "95 €",
        ),
        item(
          "spa_massage_lymph",
          L(
            "Lenf Drenaj Masajı",
            "Lymphatic Drainage Massage",
            "Lymphdrainage-Massage",
            "Лимфодренажный массаж",
          ),
          "35 € / 60 €",
        ),
        item(
          "spa_massage_foot",
          L(
            "Ayak Rahatlatma Masajı",
            "Foot Relax Massage",
            "Fuß-Entspannungsmassage",
            "Расслабляющий массаж ног",
          ),
          "30 €",
        ),
        item(
          "spa_massage_hot_stone_full",
          L(
            "Sıcak Taş Tüm Vücut Masajı",
            "Hot Stone Full Body Massage",
            "Hot-Stone-Ganzkörpermassage",
            "Массаж горячими камнями (всё тело)",
          ),
          "60 €",
        ),
        item(
          "spa_massage_hot_stone_back",
          L(
            "Sıcak Taş Sırt Masajı",
            "Hot Stone Back Massage",
            "Hot-Stone-Rückenmassage",
            "Массаж горячими камнями (спина)",
          ),
          "35 €",
        ),
        item(
          "spa_massage_mix",
          L(
            "Mix (Karışık) Terapi Masajı",
            "Mix Therapy Massage",
            "Mix-Therapie-Massage",
            "Микс-терапия массаж",
          ),
          "65 € / 85 €",
        ),
        item(
          "spa_massage_anticellulite",
          L(
            "Selülit Karşıtı Masaj",
            "Anti-Cellulite Massage",
            "Anti-Cellulite-Massage",
            "Антицеллюлитный массаж",
          ),
          "60 €",
        ),
        item(
          "spa_massage_sport",
          L("Spor Masajı", "Sport Massage", "Sportmassage", "Спортивный массаж"),
          "50 €",
        ),
        item(
          "spa_massage_honey",
          L("Bal Masajı", "Honey Massage", "Honigmassage", "Медовый массаж"),
          "60 €",
        ),
        item(
          "spa_massage_chocolate",
          L(
            "Çikolata Terapi Masajı",
            "Chocolate Therapy Massage",
            "Schokoladen-Therapie-Massage",
            "Шоколадная терапия массаж",
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
        "Азиатские массажи",
      ),
      items: [
        item(
          "spa_asia_thai_classic",
          L(
            "Klasik Thai Masajı",
            "Thai Classic Massage",
            "Klassische Thai-Massage",
            "Классический тайский массаж",
          ),
          "70 €",
        ),
        item(
          "spa_asia_thai_bali_mix",
          L(
            "Thai - Bali Karışık Masaj",
            "Thai - Bali Mix Massage",
            "Thai-Bali-Mix-Massage",
            "Тайско-балийский микс массаж",
          ),
          "90 €",
        ),
        item(
          "spa_asia_bali_classic",
          L(
            "Klasik Bali Masajı",
            "Bali Classic Massage",
            "Klassische Bali-Massage",
            "Классический балийский массаж",
          ),
          "70 €",
        ),
        item(
          "spa_asia_bali_royal",
          L(
            "Bali Royal Masajı",
            "Bali Royal Massage",
            "Bali Royal Massage",
            "Балийский Royal массаж",
          ),
          "90 €",
        ),
        item(
          "spa_asia_shiatsu",
          L("Shiatsu Masajı", "Shiatsu Massage", "Shiatsu-Massage", "Шиацу массаж"),
          "70 €",
        ),
        item(
          "spa_asia_jimbaran",
          L(
            "Jimbaran Masajı (4 El)",
            "Jimbaran Massage (4 Hands)",
            "Jimbaran-Massage (4 Hände)",
            "Джимбаран массаж (4 руки)",
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
