from __future__ import annotations

from typing import Literal, Dict

from assistant.core.chatbot_languages import CHATBOT_UI_LANG_SET, FORM_LABEL_FALLBACK_ORDER
from assistant.services.form_labels_extra_langs import merge_extra_lang_columns

Lang = Literal["tr", "en", "de", "pl"]


# `js/requests/config.js` requestSections.sectionKey → `js/i18n.js` ile aynı metinler.
REQUEST_SECTION_LABELS: Dict[str, Dict[Lang, str]] = {
    "reqReqSecHkSleepComfort": {
        "tr": "Yatak & uyku konforu",
        "en": "Bed & sleep comfort",
        "de": "Bett & Schlafkomfort",
        "pl": "Łóżko i komfort snu",
    },
    "reqReqSecHkTowelBath": {
        "tr": "Havlu & banyo ihtiyaçları",
        "en": "Towels & bathroom needs",
        "de": "Handtücher & Badbedarf",
        "pl": "Ręczniki i łazienka",
    },
    "reqReqSecHkDrinks": {
        "tr": "İçecek & oda ikramları",
        "en": "Beverages & room amenities",
        "de": "Getränke & Zimmerausstattung",
        "pl": "Napoje i wyposażenie pokoju",
    },
    "reqReqSecHkCleaning": {
        "tr": "Temizlik & hijyen",
        "en": "Cleaning & hygiene",
        "de": "Reinigung & Hygiene",
        "pl": "Sprzątanie i higiena",
    },
    "reqReqSecHkEquipment": {
        "tr": "Ekipman & diğer",
        "en": "Equipment & other",
        "de": "Equipment & Sonstiges",
        "pl": "Sprzęt i inne",
    },
    "reqReqSecHkOther": {
        "tr": "Diğer",
        "en": "Other",
        "de": "Sonstiges",
        "pl": "Inne",
    },
}

CATEGORY_LABELS: Dict[str, Dict[str, Dict[Lang, str]]] = {
    "request": {
        "hk_duvet_request": {
            "tr": "Yorgan isteği (adet)",
            "en": "Duvet request (qty)",
            "de": "Deckenanfrage (Stk.)",
            "pl": "Kołdra (szt.)",
        },
        "hk_bed_join": {
            "tr": "Yatak birleştirme (adet)",
            "en": "Bed join / twin-to-king (qty)",
            "de": "Zusammenstellung der Betten (Stk.)",
            "pl": "Połączenie łóżek (szt.)",
        },
        "hk_bed_soften": {
            "tr": "Yatağın yumuşatılması (adet)",
            "en": "Soften mattress (qty)",
            "de": "Matratze weicher stellen (Stk.)",
            "pl": "Miększe łóżko (szt.)",
        },
        "hk_pillow_request": {
            "tr": "Yastık isteği (adet)",
            "en": "Pillow request (qty)",
            "de": "Kissenanfrage (Stk.)",
            "pl": "Poduszki (szt.)",
        },
        "hk_pique_request": {
            "tr": "Pike isteği (adet)",
            "en": "Top sheet / pique (qty)",
            "de": "Tagesdecke / Piqué (Stk.)",
            "pl": "Narzuta / piké (szt.)",
        },
        "hk_extra_bed": {
            "tr": "Ek yatak (adet)",
            "en": "Extra bed (qty)",
            "de": "Zustellbett (Stk.)",
            "pl": "Dostawka (szt.)",
        },
        "hk_baby_crib": {
            "tr": "Bebek yatağı (adet)",
            "en": "Baby cot (qty)",
            "de": "Babybett (Stk.)",
            "pl": "Łóżeczko dziecięce (szt.)",
        },
        "hk_sheet_change": {
            "tr": "Çarşaf değişimi (adet)",
            "en": "Sheet change (qty)",
            "de": "Wechsel Bettwäsche (Stk.)",
            "pl": "Wymiana pościeli (szt.)",
        },
        "hk_towel_request": {
            "tr": "Havlu isteği (adet)",
            "en": "Towel request (qty)",
            "de": "Handtuchwunsch (Stk.)",
            "pl": "Ręczniki — zamówienie (szt.)",
        },
        "hk_towel_change": {
            "tr": "Havlu değişimi (adet)",
            "en": "Towel change (qty)",
            "de": "Handtuchwechsel (Stk.)",
            "pl": "Wymiana ręczników (szt.)",
        },
        "hk_toilet_paper": {
            "tr": "Tuvalet kağıdı (adet)",
            "en": "Toilet paper (qty)",
            "de": "Toilettenpapier (Stk.)",
            "pl": "Papier toaletowy (szt.)",
        },
        "hk_slippers": {
            "tr": "Terlik isteği (adet)",
            "en": "Slippers (qty)",
            "de": "Hausschuhe (Stk.)",
            "pl": "Kapcie (szt.)",
        },
        "hk_dental_set": {
            "tr": "Diş seti isteği (adet)",
            "en": "Dental kit (qty)",
            "de": "Dental-Set (Stk.)",
            "pl": "Zestaw dentystyczny (szt.)",
        },
        "hk_amenity_kit": {
            "tr": "Banyo ve kişisel bakım seti (şampuan, sabun vb.) (adet)",
            "en": "Amenity kit (shampoo / soap etc.) (qty)",
            "de": "Pflegeset (Shampoo / Seife usw.) (Stk.)",
            "pl": "Kosmetyki hotelowe (szampon / mydło itd.) (szt.)",
        },
        "hk_water": {
            "tr": "Su isteği (adet)",
            "en": "Water (qty)",
            "de": "Wasser (Stk.)",
            "pl": "Woda (szt.)",
        },
        "hk_coffee_tea_supplies": {
            "tr": "Kahve, süt tozu, çay isteği (adet)",
            "en": "Coffee, milk powder, tea (qty)",
            "de": "Kaffee, Milchpulver, Tee (Stk.)",
            "pl": "Kawa, mleko w proszku, herbata (szt.)",
        },
        "hk_cup_request": {
            "tr": "Kupa isteği (adet)",
            "en": "Cup request (qty)",
            "de": "Tassenwunsch (Stk.)",
            "pl": "Kubki (szt.)",
        },
        "hk_room_cleaning": {
            "tr": "Oda temizliği (adet)",
            "en": "Room cleaning (qty)",
            "de": "Zimmerreinigung (Stk.)",
            "pl": "Sprzątanie pokoju (szt.)",
        },
        "hk_trash_removal": {
            "tr": "Çöplerin alınması (adet)",
            "en": "Trash removal (qty)",
            "de": "Müllentsorgung (Stk.)",
            "pl": "Wyniesienie śmieci (szt.)",
        },
        "hk_balcony_cleaning": {
            "tr": "Balkon temizliği (adet)",
            "en": "Balcony cleaning (qty)",
            "de": "Balkonreinigung (Stk.)",
            "pl": "Sprzątanie balkonu (szt.)",
        },
        "hk_cleaning_dnd_coordinate": {
            "tr": "Temizlik ve rahatsız etmeyin koordinasyonu / tercih bildirimi (adet)",
            "en": "Cleaning & DND coordination (qty)",
            "de": "Reinigung & Bitte nicht stören – Abstimmung (Stk.)",
            "pl": "Sprzątanie a kartka „nie przeszkadzać” (szt.)",
        },
        "hk_bad_odor": {
            "tr": "Kötü koku şikayeti (adet)",
            "en": "Bad odour report (qty)",
            "de": "Geruchsbelästigung (Stk.)",
            "pl": "Zgłoszenie nieprzyjemnego zapachu (szt.)",
        },
        "hk_pest_control": {
            "tr": "İlaçlama isteği (adet)",
            "en": "Pest control request (qty)",
            "de": "Schädlingsbekämpfung (Stk.)",
            "pl": "Deratyzacja / dezynsekcja (szt.)",
        },
        "hk_iron": {
            "tr": "Ütü isteği (adet)",
            "en": "Iron request (qty)",
            "de": "Bügeleisen (Stk.)",
            "pl": "Żelazko (szt.)",
        },
        "hk_vase": {
            "tr": "Vazo isteği (adet)",
            "en": "Vase request (qty)",
            "de": "Vase (Stk.)",
            "pl": "Wazon (szt.)",
        },
        "other": {
            "tr": "Diğer",
            "en": "Other",
            "de": "Sonstiges",
            "pl": "Inne",
        },
    },
    "fault": {
        "ft_ac_not_cooling": {
            "tr": "Klima soğutmuyor",
            "en": "AC not cooling",
            "de": "Klima kühlt nicht",
            "pl": "Klima nie chłodzi",
        },
        "ft_ac_not_heating": {
            "tr": "Klima ısıtmıyor",
            "en": "AC not heating",
            "de": "Klima heizt nicht",
            "pl": "Klima nie grzeje",
        },
        "ft_ac_remote": {
            "tr": "Klima kumandası",
            "en": "AC remote",
            "de": "Klima-Fernbedienung",
            "pl": "Pilot klimatyzacji",
        },
        "ft_ac_fault": {
            "tr": "Klima arızası",
            "en": "AC fault",
            "de": "Klima-Störung",
            "pl": "Usterka klimatyzacji",
        },
        "ft_ventilation_fault": {
            "tr": "Havalandırma arızası",
            "en": "Ventilation fault",
            "de": "Lüftungsstörung",
            "pl": "Usterka wentylacji",
        },
        "ft_socket_fault": {
            "tr": "Priz arızası",
            "en": "Power socket fault",
            "de": "Steckdose defekt",
            "pl": "Gniazdko elektryczne",
        },
        "ft_electric_fault": {
            "tr": "Elektrik arızası",
            "en": "Electrical fault",
            "de": "Elektrik-Störung",
            "pl": "Usterka elektryczna",
        },
        "ft_led_fault": {
            "tr": "LED arızası",
            "en": "LED lighting fault",
            "de": "LED defekt",
            "pl": "Usterka LED",
        },
        "ft_lamp_fault": {
            "tr": "Lamba arızası",
            "en": "Lamp fault",
            "de": "Lampe defekt",
            "pl": "Usterka lampy",
        },
        "ft_sconce_fault": {
            "tr": "Aplik arızası",
            "en": "Wall lamp / sconce fault",
            "de": "Wandlampe defekt",
            "pl": "Usterka kinkietu",
        },
        "ft_ceiling_water_leak": {
            "tr": "Tavandan su akıyor",
            "en": "Water leaking from ceiling",
            "de": "Wasser von der Decke",
            "pl": "Cieknie z sufitu",
        },
        "ft_bidet_faucet_fault": {
            "tr": "Taharet musluğu arızası",
            "en": "Bidet / shattaf faucet fault",
            "de": "Bidet-/Dusch-WC-Armatur",
            "pl": "Usterka baterii bidetowej",
        },
        "ft_cold_water_no_flow": {
            "tr": "Su soğuk akmıyor",
            "en": "No cold water",
            "de": "Kein Kaltwasser",
            "pl": "Brak zimnej wody",
        },
        "ft_hot_water_no_flow": {
            "tr": "Su sıcak akmıyor",
            "en": "No hot water",
            "de": "Kein Warmwasser",
            "pl": "Brak ciepłej wody",
        },
        "ft_siphon_fault": {
            "tr": "Sifon arızası",
            "en": "Siphon fault",
            "de": "Siphon defekt",
            "pl": "Usterka syfonu",
        },
        "ft_faucet_fault": {
            "tr": "Musluk arızası",
            "en": "Faucet fault",
            "de": "Wasserhahn defekt",
            "pl": "Usterka baterii",
        },
        "ft_sink_drain_fault": {
            "tr": "Lavabo gideri arızası",
            "en": "Sink drain fault",
            "de": "Waschbecken-Ablauf",
            "pl": "Odpływ umywalki",
        },
        "ft_toilet_seat_broken": {
            "tr": "Klozet kapağı kırık",
            "en": "Toilet seat broken",
            "de": "WC-Sitz kaputt",
            "pl": "Zbita deska sedesowa",
        },
        "ft_shower_cabin_fault": {
            "tr": "Duşakabin arızası",
            "en": "Shower cabin fault",
            "de": "Duschkabine defekt",
            "pl": "Usterka kabiny",
        },
        "ft_shower_head_fault": {
            "tr": "Duş başlığı arızası",
            "en": "Shower head fault",
            "de": "Duschkopf defekt",
            "pl": "Usterka słuchawki prysznicowej",
        },
        "ft_towel_rail_fault": {
            "tr": "Banyo havluluk",
            "en": "Towel rail fault",
            "de": "Handtuchhalter defekt",
            "pl": "Usterka wieszaka na ręczniki",
        },
        "ft_bathroom_drain_clog": {
            "tr": "Banyo gideri tıkalı",
            "en": "Bathroom drain blocked",
            "de": "Badablauf verstopft",
            "pl": "Zatkany odpływ w łazience",
        },
        "ft_tv_remote": {
            "tr": "Televizyon kumandası",
            "en": "TV remote",
            "de": "TV-Fernbedienung",
            "pl": "Pilot TV",
        },
        "ft_tv_fault": {
            "tr": "Televizyon arızası",
            "en": "TV fault",
            "de": "TV defekt",
            "pl": "Usterka TV",
        },
        "ft_phone_fault": {
            "tr": "Telefon arızası",
            "en": "Phone fault",
            "de": "Telefon defekt",
            "pl": "Usterka telefonu",
        },
        "ft_minibar_fault": {
            "tr": "Minibar arızası",
            "en": "Minibar fault",
            "de": "Minibar defekt",
            "pl": "Usterka minibaru",
        },
        "ft_safe_fault": {
            "tr": "Kasa arızası",
            "en": "Safe fault",
            "de": "Safe defekt",
            "pl": "Usterka sejfu",
        },
        "ft_kettle_fault": {
            "tr": "Kettle arızası",
            "en": "Kettle fault",
            "de": "Wasserkocher defekt",
            "pl": "Usterka czajnika",
        },
        "ft_hair_dryer_fault": {
            "tr": "Fön makinesi çalışmıyor",
            "en": "Hair dryer not working",
            "de": "Fön funktioniert nicht",
            "pl": "Suszarka nie działa",
        },
        "ft_tv_channel_fault": {
            "tr": "Kanal arızası",
            "en": "TV channel issue",
            "de": "Sender / Kanalproblem",
            "pl": "Problem z kanałami TV",
        },
        "ft_curtain_fallen": {
            "tr": "Perde düşmüş",
            "en": "Curtain fallen",
            "de": "Vorhang heruntergefallen",
            "pl": "Spadła zasłona",
        },
        "ft_window_fault": {
            "tr": "Pencere arızası",
            "en": "Window fault",
            "de": "Fenster defekt",
            "pl": "Usterka okna",
        },
        "ft_window_cleaning": {
            "tr": "Pencere temizliği",
            "en": "Window cleaning",
            "de": "Fensterreinigung",
            "pl": "Mycie okna",
        },
        "ft_room_door_fault": {
            "tr": "Oda kapısı arızası",
            "en": "Room door fault",
            "de": "Zimmertür defekt",
            "pl": "Usterka drzwi pokoju",
        },
        "ft_bathroom_door_fault": {
            "tr": "Banyo kapısı arızası",
            "en": "Bathroom door fault",
            "de": "Badezimmertür defekt",
            "pl": "Usterka drzwi łazienki",
        },
        "ft_balcony_door_fault": {
            "tr": "Balkon kapısı arızası",
            "en": "Balcony door fault",
            "de": "Balkontür defekt",
            "pl": "Usterka drzwi balkonowych",
        },
        "ft_balcony_railing_loose": {
            "tr": "Balkon korkuluğu gevşek / sallanıyor",
            "en": "Balcony railing loose",
            "de": "Balkongeländer locker",
            "pl": "Luźna balustrada balkonu",
        },
        "ft_cornice_fault": {
            "tr": "Korniş arızası",
            "en": "Cornice fault",
            "de": "Gesims / Stuck defekt",
            "pl": "Usterka gzymsu",
        },
        "ft_headboard_fault": {
            "tr": "Yatak başlığı arızası",
            "en": "Headboard fault",
            "de": "Kopfteil defekt",
            "pl": "Usterka zagłówka",
        },
        "ft_dresser_drawer_fault": {
            "tr": "Şifonyer çekmecesi",
            "en": "Dresser drawer fault",
            "de": "Kommoden-Schublade",
            "pl": "Szuflada komody",
        },
        "ft_drawer_fault": {
            "tr": "Çekmece arızası",
            "en": "Drawer fault",
            "de": "Schublade defekt",
            "pl": "Usterka szuflady",
        },
        "ft_wardrobe_fault": {
            "tr": "Gardırop arızası",
            "en": "Wardrobe fault",
            "de": "Kleiderschrank defekt",
            "pl": "Usterka szafy",
        },
        "ft_mirror_damage": {
            "tr": "Ayna kırık / çatlak",
            "en": "Mirror cracked / broken",
            "de": "Spiegel beschädigt",
            "pl": "Pęknięte lustro",
        },
        "ft_elevator_fault": {
            "tr": "Asansör arızası",
            "en": "Elevator fault",
            "de": "Aufzug defekt",
            "pl": "Usterka windy",
        },
        "ft_indoor_pool_temperature": {
            "tr": "Kapalı havuz sıcaklığı / ayar arızası",
            "en": "Indoor pool temperature issue",
            "de": "Hallenbad-Temperatur",
            "pl": "Temperatura basenu krytego",
        },
        "ft_other": {
            "tr": "Diğer (teknik)",
            "en": "Other (technical)",
            "de": "Sonstige technische Störungen",
            "pl": "Inne usterki techniczne",
        },
    },
    "complaint": {
        "room_cleaning": {
            "tr": "Oda temizliği",
            "en": "Room cleaning",
            "de": "Zimmerreinigung",
            "pl": "Sprzątanie pokoju",
        },
        "noise": {
            "tr": "Gürültü",
            "en": "Noise",
            "de": "Lärm",
            "pl": "Hałas",
        },
        "climate": {
            "tr": "Isı / Klima",
            "en": "Climate",
            "de": "Klima",
            "pl": "Klimatyzacja",
        },
        "room_comfort": {
            "tr": "Oda konforu",
            "en": "Room comfort",
            "de": "Zimmerkomfort",
            "pl": "Komfort pokoju",
        },
        "minibar": {
            "tr": "Minibar",
            "en": "Minibar",
            "de": "Minibar",
            "pl": "Minibar",
        },
        "restaurant_service": {
            "tr": "Restoran servisi",
            "en": "Restaurant service",
            "de": "Restaurantservice",
            "pl": "Obsługa restauracji",
        },
        "staff_behavior": {
            "tr": "Personel davranışı",
            "en": "Staff behavior",
            "de": "Mitarbeiterverhalten",
            "pl": "Zachowanie personelu",
        },
        "general_areas": {
            "tr": "Genel alanlar",
            "en": "General areas",
            "de": "Allgemeine Bereiche",
            "pl": "Strefy ogólne",
        },
        "hygiene": {
            "tr": "Hijyen",
            "en": "Hygiene",
            "de": "Hygiene",
            "pl": "Higiena",
        },
        "internet_tv": {
            "tr": "İnternet / TV",
            "en": "Internet / TV",
            "de": "Internet / TV",
            "pl": "Internet / TV",
        },
        "lost_property": {
            "tr": "Kayıp eşya",
            "en": "Lost property",
            "de": "Verlorenes Eigentum / Fundsachen",
            "pl": "Zgubione rzeczy",
        },
        "other": {
            "tr": "Diğer",
            "en": "Other",
            "de": "Sonstiges",
            "pl": "Inne",
        },
    },
    "guest_notification": {
        "allergen_notice": {
            "tr": "Alerjen bildirimi",
            "en": "Allergen notice",
            "de": "Allergenhinweis",
            "pl": "Informacja o alergenach",
        },
        "gluten_sensitivity": {
            "tr": "Gluten hassasiyeti",
            "en": "Gluten sensitivity",
            "de": "Glutenunverträglichkeit",
            "pl": "Nietolerancja glutenu",
        },
        "lactose_sensitivity": {
            "tr": "Laktoz hassasiyeti",
            "en": "Lactose sensitivity",
            "de": "Laktoseunverträglichkeit",
            "pl": "Nietolerancja laktozy",
        },
        "vegan_vegetarian": {
            "tr": "Vegan / vejetaryen",
            "en": "Vegan / vegetarian",
            "de": "Vegan / vegetarisch",
            "pl": "Wegan / wegetarianin",
        },
        "food_sensitivity_general": {
            "tr": "Genel gıda hassasiyeti",
            "en": "General food sensitivity",
            "de": "Allgemeine Nahrungsmittelunverträglichkeit",
            "pl": "Ogólna wrażliwość pokarmowa",
        },
        "chronic_condition": {
            "tr": "Kronik rahatsızlık",
            "en": "Chronic condition",
            "de": "Chronische Erkrankung",
            "pl": "Choroba przewlekła",
        },
        "accessibility_special_needs": {
            "tr": "Erişilebilirlik / özel ihtiyaç",
            "en": "Accessibility / special needs",
            "de": "Barrierefreiheit / besondere Bedürfnisse",
            "pl": "Dostępność / specjalne potrzeby",
        },
        "pregnancy": {
            "tr": "Hamilelik",
            "en": "Pregnancy",
            "de": "Schwangerschaft",
            "pl": "Ciąża",
        },
        "medication_health_sensitivity": {
            "tr": "İlaç / sağlık hassasiyeti",
            "en": "Medication / health sensitivity",
            "de": "Medikamente / Gesundheit",
            "pl": "Leki / zdrowie",
        },
        "other_health": {
            "tr": "Diğer (sağlık)",
            "en": "Other (health)",
            "de": "Sonstiges (Gesundheit)",
            "pl": "Inne (zdrowie)",
        },
        "birthday_celebration": {
            "tr": "Doğum günü kutlaması",
            "en": "Birthday celebration",
            "de": "Geburtstagsfeier",
            "pl": "Urodziny",
        },
        "honeymoon_anniversary": {
            "tr": "Balayı / yıldönümü",
            "en": "Honeymoon / anniversary",
            "de": "Flitterwochen / Jahrestag",
            "pl": "Podróż poślubna / rocznica",
        },
        "surprise_organization": {
            "tr": "Sürpriz organizasyon",
            "en": "Surprise arrangement",
            "de": "Überraschungsorganisation",
            "pl": "Niespodzianka / organizacja",
        },
        "room_decoration": {
            "tr": "Oda süsleme",
            "en": "Room decoration",
            "de": "Zimmerdekoration",
            "pl": "Dekoracja pokoju",
        },
        "other_celebration": {
            "tr": "Diğer (kutlama)",
            "en": "Other (celebration)",
            "de": "Sonstiges (Feier)",
            "pl": "Inne (świętowanie)",
        },
        "late_checkout": {
            "tr": "Geç çıkış",
            "en": "Late check-out",
            "de": "Späterer Check-out",
            "pl": "Późne wymeldowanie",
        },
    },
}

merge_extra_lang_columns(CATEGORY_LABELS)

FIELD_LABELS: Dict[str, Dict[Lang, str]] = {
    "category": {"tr": "Kategori", "en": "Category", "de": "Kategorie", "pl": "Kategoria"},
    "itemType": {"tr": "Talep türü", "en": "Request type", "de": "Anfragetyp", "pl": "Rodzaj prośby"},
    "quantity": {"tr": "Adet", "en": "Quantity", "de": "Anzahl", "pl": "Ilość"},
    "requestType": {"tr": "Talep tipi", "en": "Request type", "de": "Anfragetyp", "pl": "Rodzaj prośby"},
    "timing": {"tr": "Zaman", "en": "Timing", "de": "Zeitpunkt", "pl": "Czas"},
    "location": {"tr": "Lokasyon", "en": "Location", "de": "Ort", "pl": "Lokalizacja"},
    "urgency": {"tr": "Aciliyet", "en": "Urgency", "de": "Dringlichkeit", "pl": "Pilność"},
}

VALUE_LABELS: Dict[str, Dict[str, Dict[Lang, str]]] = {
    "itemType": {
        "bath_towel": {"tr": "Banyo havlusu", "en": "Bath towel", "de": "Badetuch", "pl": "Ręcznik kąpielowy"},
        "hand_towel": {"tr": "El havlusu", "en": "Hand towel", "de": "Handtuch", "pl": "Ręcznik do rąk"},
        "pillow": {"tr": "Yastık", "en": "Pillow", "de": "Kissen", "pl": "Poduszka"},
        "duvet_cover": {"tr": "Nevresim", "en": "Duvet cover", "de": "Bettbezug", "pl": "Poszewka na kołdrę"},
        "blanket": {"tr": "Battaniye", "en": "Blanket", "de": "Decke", "pl": "Koc"},
        "baby_bed": {"tr": "Bebek yatağı", "en": "Baby bed", "de": "Babybett", "pl": "Łóżeczko dziecięce"},
        "high_chair": {"tr": "Mama sandalyesi", "en": "High chair", "de": "Kinderhochstuhl", "pl": "Krzesełko do karmienia"},
        "bathrobe": {"tr": "Bornoz", "en": "Bathrobe", "de": "Bademantel", "pl": "Szlafrok"},
        "slippers": {"tr": "Terlik", "en": "Slippers", "de": "Hausschuhe", "pl": "Kapcie"},
        "hanger": {"tr": "Askı", "en": "Hanger", "de": "Kleiderbügel", "pl": "Wieszak"},
        "kettle": {"tr": "Kettle / su ısıtıcısı", "en": "Kettle", "de": "Wasserkocher", "pl": "Czajnik"},
        "other": {"tr": "Diğer", "en": "Other", "de": "Sonstiges", "pl": "Inne"},
    },
    "requestType": {
        "general_cleaning": {
            "tr": "Genel temizlik",
            "en": "General cleaning",
            "de": "Allgemeine Reinigung",
            "pl": "Sprzątanie generalne",
        },
        "towel_change": {
            "tr": "Havlu değişimi",
            "en": "Towel change",
            "de": "Handtuchwechsel",
            "pl": "Wymiana ręczników",
        },
        "room_check": {
            "tr": "Oda kontrolü",
            "en": "Room check",
            "de": "Zimmerkontrolle",
            "pl": "Kontrola pokoju",
        },
        "refill": {
            "tr": "Minibar yenileme",
            "en": "Minibar refill",
            "de": "Minibar auffüllen",
            "pl": "Uzupełnienie minibaru",
        },
        "missing_item_report": {
            "tr": "Eksik ürün bildirimi",
            "en": "Missing item report",
            "de": "Fehlenden Artikel melden",
            "pl": "Zgłoszenie brakującego przedmiotu",
        },
        "check_request": {
            "tr": "Minibar kontrol talebi",
            "en": "Minibar check request",
            "de": "Minibar-Prüfung anfordern",
            "pl": "Prośba o kontrolę minibaru",
        },
    },
    "timing": {
        "now": {"tr": "Şimdi", "en": "Now", "de": "Jetzt", "pl": "Teraz"},
        "later": {"tr": "Sonra", "en": "Later", "de": "Später", "pl": "Później"},
    },
    "location": {
        "room_inside": {"tr": "Oda içi", "en": "Inside room", "de": "Im Zimmer", "pl": "W pokoju"},
        "bathroom": {"tr": "Banyo", "en": "Bathroom", "de": "Badezimmer", "pl": "Łazienka"},
        "balcony": {"tr": "Balkon", "en": "Balcony", "de": "Balkon", "pl": "Balkon"},
        "other": {"tr": "Diğer", "en": "Other", "de": "Sonstiges", "pl": "Inne"},
    },
    "urgency": {
        "normal": {"tr": "Normal", "en": "Normal", "de": "Normal", "pl": "Zwykła"},
        "urgent": {"tr": "Acil", "en": "Urgent", "de": "Dringend", "pl": "Pilna"},
    },
}


def _label_from_row(row: Dict[str, str], lang: str | None) -> str:
    code = (lang or "tr").strip().lower()
    if code not in CHATBOT_UI_LANG_SET:
        code = "tr"
    chain: list[str] = [code]
    for alt in FORM_LABEL_FALLBACK_ORDER:
        if alt != code and alt not in chain:
            chain.append(alt)
    for k in chain:
        v = row.get(k)
        if v is not None and str(v).strip() != "":
            return str(v).strip()
    for k in CHATBOT_UI_LANG_SET:
        if k in chain:
            continue
        v = row.get(k)
        if v is not None and str(v).strip() != "":
            return str(v).strip()
    return ""


def category_label(intent: str, category: str, lang: str | None) -> str:
    row = CATEGORY_LABELS.get(intent, {}).get(category, {})
    if not row:
        return category
    return _label_from_row(row, lang) or category


def request_section_label(section_key: str, lang: str | None) -> str:
    row = REQUEST_SECTION_LABELS.get(section_key, {})
    if not row:
        return section_key
    return _label_from_row(row, lang) or section_key


def field_label(field: str, lang: str | None) -> str:
    row = FIELD_LABELS.get(field, {})
    if not row:
        return field
    return _label_from_row(row, lang) or field


def value_label(field: str, value: str, lang: str | None) -> str:
    row = VALUE_LABELS.get(field, {}).get(value, {})
    if not row:
        return value
    return _label_from_row(row, lang) or value

