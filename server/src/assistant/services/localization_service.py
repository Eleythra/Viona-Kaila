from typing import Dict

from assistant.core.chatbot_languages import CHATBOT_UI_LANG_SET, EXTRA_CHATBOT_UI_LANGS
from assistant.services.localization_chat_form import inject_chat_form_strings
from assistant.services.localization_pl import TRANSLATIONS_PL


TRANSLATIONS: Dict[str, Dict[str, str]] = {
    "tr": {
        "chitchat_greeting": "Merhaba; ben Viona, Kaila Beach Hotel'in dijital asistanınızım. Konaklamanızda size nasıl eşlik edebilirim?",
        "chitchat_assistant_intro": "Ben Viona — Kaila Beach Hotel için çalışan dijital asistanınızım. Otel deneyiminiz, hizmetler ve pratik sorularınızda zarif ve net biçimde yanınızdayım.",
        "chitchat_identity_question": "Ben Viona; Kaila Beach Hotel için tasarlanmış dijital asistanınızım. Otel hizmetleri, konaklama ve genel bilgilerde size rehberlik edebilirim.",
        "chitchat_thanks": "Rica ederim. Kaila Beach'teki konaklamanızla ilgili başka bir konuda da memnuniyetle yanınızdayım.",
        "chitchat_farewell": "Görüşmek üzere. İhtiyaç duyduğunuz her an buradayım.",
        "chitchat_apology_from_user": "Hiç sorun değil. Size aynı özenle yardımcı olmaya devam ederim.",
        "chitchat_compliment": "Nazik düşünceniz için teşekkür ederim. Yardımcı olabildiysem mutluluk duyarım.",
        "chitchat_how_are_you": "Teşekkür ederim, çok iyiyim. Kaila Beach Hotel ile ilgili her soruda yanınızdayım.",
        "chitchat_cancel_command_hint": (
            "«İptal» derken kastettiğiniz şey sohbet formu özeti, bir rezervasyon talebi ya da başka bir işlem olabilir. "
            "Özet ekranında 2 seçeneği vazgeç anlamına gelir. "
            "Rezervasyon ve masa düzenlemeleri Kaila Beach’te ön büro ve uzman ekiplerimizle yüz yüze, kişiselleştirilmiş biçimde planlanır; "
            "size en uygun birimi memnuniyetle yönlendiririz. Başka hangi otel konusunda yardımcı olayım?"
        ),
        "chitchat_confusion_generic": "Tam olarak hangi kısmı netleştireyim? Otel bilgisi, talep, arıza veya şikayet için ne yazmanız gerektiğini söyleyebilirim.",
        "chitchat_confusion_after_form_cancel": (
            "Az önce kayıt özetini iptal etmiştiniz; bu yüzden kayıt oluşmadı. "
            "Özet ekranında 1 = onaylayıp kayıt açmak, 2 = vazgeçmek anlamına gelir. "
            "Tekrar başlamak için örneğin «priz çalışmıyor» yazabilirsiniz. "
            "Ad soyad adımında kimlikteki gibi adınızı ve soyadınızı iki kelime olarak yazmanız gerekir (ör. Ayşe Yılmaz)."
        ),
        "session_ack_after_cancel": "Anlaşıldı. Başka bir konuda eşlik etmemi isterseniz birkaç kelimeyle yazmanız yeterli.",
        "session_vazgectim_after_cancel": (
            "Kayıt oluşturulmadı. İsterseniz aynı konuda yeniden sohbet formu ile ilerleyebilir veya yeni bir talep / arıza yazabilirsiniz."
        ),
        "session_reservation_followup_short": (
            "Kısa bir yanıtı tek başına mevcut bir rezervasyon kaydınıza bağlayamıyorum; net bir tarih veya net bir talep paylaşmanızı rica ederim. "
            "Genel ve konaklama düzenlemeleri için ön büro / resepsiyon; zarif à la carte masa planlaması için Misafir İlişkileri; "
            "spa ve masaj için La Serenite Spa ekibiyle doğrudan görüşmenizi öneririm — her adımda yanınızdayız."
        ),
        "session_animation_schedule_followup": (
            "Gündüz animasyon ve aktivite çizelgesi uygulamadaki «Animasyon ve etkinlikler» modülü ile otel verilerinde genelde her gün aynıdır; "
            "çoğunlukla değişen kısım akşam gösterileri ve temalı gecelerdir, bazı günler ekstra şov da olabilir. "
            "Yarın veya belirli bir akşam için net saat ve sahne bilgisini resepsiyon veya animasyon ekibinin güncel panosundan teyit etmenizi öneririm. "
            "Mini Club / Mini Disco saatleri çocuk yaş grubuna göre sınırlı olabilir."
        ),
        "chat_form_cancel_ack_fault": (
            "İsteğiniz üzerine bu arıza bildirimini iptal ettim. Dilediğiniz an yeni bir arıza, talep veya misafir bildirimi oluşturabilirsiniz."
        ),
        "chat_form_cancel_ack_request": (
            "İsteğiniz üzerine bu talebi iptal ettim. Dilediğiniz an yeni bir talep, arıza bildirimi veya misafir bildirimi oluşturabilirsiniz."
        ),
        "chat_form_cancel_ack_complaint": (
            "İsteğiniz üzerine bu şikayet kaydını iptal ettim. Dilediğiniz an yeni bir şikayet, talep veya arıza bildirimi oluşturabilirsiniz."
        ),
        "chat_form_cancel_ack_guest_notification": (
            "İsteğiniz üzerine bu misafir bildirimini iptal ettim. Dilediğiniz an yeni bir misafir bildirimi, talep veya arıza bildirimi oluşturabilirsiniz."
        ),
        "chat_form_context_retract_ack": (
            "Anladım; kayıt gerekmediyse memnuniyetle not aldım. Oda, yemek-içecek, aktiviteler veya resepsiyon konusunda "
            "nasıl eşlik edeyim — kısaca yazmanız yeterli."
        ),
        "chitchat_switch_en": "Good day — I'll reply in English from now on. How may I assist you?",
        "chitchat_switch_tr": "Bundan sonra Türkçe yanıtlıyorum. Konaklamanızda size nasıl eşlik edebilirim?",
        "chitchat_switch_de": "Gern ab jetzt auf Deutsch. Wobei darf ich behilflich sein?",
        "chitchat_switch_pl": "Od teraz odpowiadam po polsku. W czym mogę dziś pomóc?",
        "current_time_template": "Şu an saat {time}'dir.",
        "fault_redirect_message": "Bu sorun için lütfen Arıza Talep formunu doldurunuz.",
        "complaint_redirect_message": "Bu konu için lütfen Şikayet formunu doldurunuz.",
        "request_redirect_message": "Talebinizi İstek formu üzerinden iletebilirsiniz.",
        "guest_relations_redirect_message": "Bu konu için lütfen Misafir İlişkileri departmanı ile iletişime geçiniz.",
        "reception_fallback_message": "Bu mesajı şu an tam işleyemedim; birkaç kelimeyle yeniden yazarsanız memnuniyetle yardımcı olurum.",
        "after_hours_reception_redirect": (
            "Gece 00:00 – 08:00 arasında operasyon ekibimiz çevrimdışıdır; bu saatlerde talep, şikayet, arıza ve misafir bildirimi "
            "kayıtlarını uygulama üzerinden alamıyorum. Özenle takip edebilmemiz için lütfen resepsiyon ile doğrudan iletişime geçiniz; "
            "ekibimiz size en doğru biçimde yardımcı olacaktır."
        ),
        "canonical_fallback_safe": "Bu konuda doğrulanmış bilgiye şu an erişemiyorum. En güncel ve doğru yönlendirme için resepsiyonla görüşmenizi öneririm.",
        "canonical_fallback_unavailable": "Kısa bir süre için bağlantıda kesinti yaşanıyor. Lütfen birkaç saniye sonra yeniden deneyiniz.",
        "chat_fallback_throttled": (
            "Çok kısa sürede çok fazla mesaj gönderildi. Lütfen birkaç saniye bekleyip tekrar deneyiniz; acil durumda resepsiyon her zaman yardımcı olabilir."
        ),
        "chat_fallback_validation_error": "Boş bir mesaj gönderilemez. Lütfen isteğinizi veya sorunuzu kısaca yazınız.",
        "chat_form_invalid_state_hint": (
            "Form akışı beklenmedik şekilde kesildi; kayıt tamamlanmadı. Talebinizi veya bildiriminizi baştan kısaca yazarak yeniden başlayabilirsiniz; resepsiyon da yardımcı olur."
        ),
        "recommendation_fish": "Balık ve deniz ürünleri için Moss Beach Restaurant & Bar (plajda, ücretli à la carte) ve ana restoranı değerlendirebilirsiniz. La Terrace A La Carte à la carte kullanımında rezervasyon gerektirir.",
        "recommendation_meat": "Et veya BBQ tercih ediyorsanız Sinton BBQ Restaurant iyi bir seçenektir. A la carte restoranlar için rezervasyon gerekir.",
        "recommendation_pizza_snack": "Pizza veya atıştırmalık için Dolphin Snack, Gusto Snack ve Beach Imbiss uygun seçeneklerdir.",
        "recommendation_coffee_dessert": "Kahve veya tatlı için Libum Cafe ve Lobby Bar ideal seçeneklerdir.",
        "recommendation_kids_activity": "Çocuk aktiviteleri için Mini Club, Mini Disco ve Çocuk Oyun Parkı öne çıkan seçeneklerdir.",
        "recommendation_romantic_dinner": "Romantik akşam için La Terrace A La Carte veya sahilde Moss Beach Restaurant & Bar uygun seçeneklerdir; à la carte kullanımda rezervasyon önerilir.",
        "recommendation_general_dining": "Karar veremediyseniz akşam için Sinton BBQ veya ana restoran iyi seçeneklerdir; hızlı atıştırmalık için Dolphin Snack ve Gusto Snack pratiktir.",
        "fault_template_with_device": "{device} arızası durumunda lütfen resepsiyon ile iletişime geçiniz; otelde teknik destek sağlanmaktadır.",
        "fault_template_generic": "Bu arıza durumu için lütfen resepsiyon ile iletişime geçiniz; otelde teknik destek sağlanmaktadır.",
        "complaint_noise": "Bu şikayetinizi öncelikle Misafir İlişkileri ile paylaşmanızı öneririm. Gerekirse resepsiyon üzerinden de hızlıca iletebilirsiniz.",
        "complaint_cleanliness": "Temizlikle ilgili bu durumu öncelikle Misafir İlişkileri ile paylaşınız; resepsiyon da destek sağlayabilir.",
        "complaint_default": "Bu şikayet için öncelikle Misafir İlişkileri ile iletişime geçiniz. Dilerseniz resepsiyon üzerinden de iletebilirsiniz.",
        "complaint_lost_property": (
            "Kayıp Eşya Yönetimi — Değerli eşyalar en fazla 1 yıl, diğer eşyalar en fazla 6 ay saklanmaktadır.\n\n"
            "«Kayboldu», «kaybettim», «bulamıyorum», «nerede» gibi ifadelerle kişisel eşya (gözlük, telefon, saat, takı vb.) "
            "arıza değildir; aşağıdaki şikâyet formunda «Kayıp eşya» seçeneğini kullanabilirsiniz.\n\n"
            "Eşyanızı aramak veya kaydı netleştirmek için öncelikle Misafir İlişkileri veya resepsiyon ekibimize başvurabilirsiniz. "
            "İsterseniz aşağıdaki şikâyet formunu da doldurarak ayrıntıları yazılı iletebilirsiniz; ekibimiz kaydınızı özenle değerlendirir."
        ),
        "complaint_form_guidance": (
            "Şikâyetinizi Viona uygulamasındaki şikâyet formu ile iletebilirsiniz; uygun kategoriyi seçerek ekibimizin kaydı net "
            "incelemesine yardımcı olursunuz. Aşağıdaki düğme formu doğrudan açar — isterseniz resepsiyon veya Misafir İlişkileri’ne de "
            "başvurabilirsiniz."
        ),
        "request_towel": "Havlu talebinizi lütfen resepsiyon ile iletiniz.",
        "request_blanket": "Battaniye talebiniz için lütfen resepsiyon ile iletişime geçiniz.",
        "request_water": "Odaya su veya içme suyu talebiniz için lütfen resepsiyon ile iletişime geçiniz; ekip yönlendirilecektir.",
        "request_pillow": "Yastık talebiniz için lütfen resepsiyon ile iletişime geçiniz.",
        "request_housekeeping": "Oda temizliği ve housekeeping talepleriniz için resepsiyon ile iletişime geçebilirsiniz; ilgili ekip yönlendirilir.",
        "request_reception_contact": "Bu konuda en hızlı çözüm için lütfen resepsiyon ile doğrudan iletişime geçiniz.",
        "request_guest_relations_contact": "Bu konuda Misafir İlişkileri departmanı en doğru birimdir. Dilerseniz resepsiyon üzerinden de bağlantı sağlayabilirsiniz.",
        "request_transfer": "Transfer talebiniz için lütfen resepsiyon ile iletişime geçiniz; uygun planlama yapılacaktır.",
        "request_lunch_box": "Lunch Box talebi için lütfen en geç saat 20:00'ye kadar resepsiyona bilgi veriniz.",
        "request_spa_booking_contact": (
            "La Serenite Spa’da masaj, bakım ve ücretli terapi randevularınız için doğrudan spa ekibimizle görüşmenizi içtenlikle rica ederiz; "
            "size en uygun saat ve ritüelleri birlikte netleştirirler. İsterseniz resepsiyon da nazikçe yönlendirme sağlayabilir. "
            "Spa rezervasyonu ve sorularınız için otel içi sabit hat: 5025."
        ),
        "request_ala_carte_reservation": (
            "Ücretli restoranlarımızda ve à la carte deneyimlerinde masa ayarlamaları Misafir İlişkileri’nin özenli koordinasyonuyla yürütülür. "
            "Doğrudan Misafir İlişkileri’ne başvurabilir; dilerseniz resepsiyon üzerinden de zarif bir bağlantı rica edebilirsiniz."
        ),
        "request_premium_reservation_reception": (
            "Premium masa ve özel akşam yemekleri için en doğru koordinasyonu ön büro / resepsiyon ekibimiz üstlenir; "
            "sizi ilgili restoranımıza veya birimimize özenle yönlendirir."
        ),
        "request_default": "Bu talebinizi lütfen resepsiyon ile paylaşınız.",
        "reservation_early_checkin": "Erken giriş talebiniz için lütfen resepsiyon ile iletişime geçiniz.",
        "reservation_late_checkout": "Geç çıkış talebiniz için lütfen resepsiyon ile iletişime geçiniz.",
        "early_checkin_reception_handoff": (
            "Erken giriş, o günkü doluluk ve oda hazırlığına bağlıdır; en doğru bilgi ve yardımı "
            "ön büro / resepsiyon ekibimiz verir. İsterseniz doğrudan resepsiyona uğrayabilir veya "
            "telefonla arayabilirsiniz; talebinizi kısaca iletmeniz yeterli — ekibimiz sizi memnuniyetle yönlendirir."
        ),
        "late_checkout_guest_notif_redirect": (
            "Geç çıkış talebiniz ön büro / resepsiyon tarafından değerlendirilir. "
            "Ana sayfada İstekler → Misafir bildirimleri içindeki geç çıkış formunu kullanın. "
            "Aşağıdaki buton bu formu doğrudan açar."
        ),
        "reservation_room_change": "Oda değişikliği talebiniz için lütfen resepsiyon ile iletişime geçiniz.",
        "reservation_default": (
            "Kaila Beach’te rezervasyon ve masa düzenlemeleriniz ön büro ile uzman ekiplerimiz tarafından yüz yüze, size özel ve özenle tamamlanır. "
            "Genel konaklama ve planlar için resepsiyon; à la carte masalar için Misafir İlişkileri; spa ve masaj için La Serenite Spa — akıcı, seçkin bir deneyim için yanınızdayız."
        ),
        "special_need_celiac": "Bu durumunuzu lütfen Misafir İlişkileri departmanına iletiniz; mutfak departmanından uygun destek sağlanabilir.",
        "special_need_vegan": "Beslenme tercihinizi lütfen Misafir İlişkileri departmanına iletiniz; uygun seçenekler konusunda yardımcı olunabilir.",
        "special_need_allergy": "Alerji bilginizi lütfen Misafir İlişkileri departmanına bildiriniz; gerekli yönlendirme sağlanacaktır.",
        "special_need_baby_need": "Bebek beslenmesi ve mama ile ilgili talebinizi lütfen Misafir İlişkileri departmanına iletiniz; uygun seçenekler konusunda yardımcı olacaklardır.",
        "special_need_accessibility_need": "Erişilebilirlik ile ilgili ihtiyacınızı lütfen Misafir İlişkileri departmanına bildiriniz; gerekli düzenlemeler sağlanacaktır.",
        "special_need_default": "Bu durum için lütfen Misafir İlişkileri departmanı ile iletişime geçiniz.",
        "guest_notification_policy_hint": "Misafir bildiriminizi sohbet üzerinden kayıt için kategori seçerek iletebilirsiniz; bir sonraki mesajınızda 'gluten', 'alerji', 'kutlama' gibi anahtar kelimeleri yazmanız da yeterlidir.",
        "fixed_restaurant_info": "- Ana Restoran: Kahvaltı 07:00-10:00, Geç kahvaltı 10:00-10:30, Öğle yemeği 12:30-14:00, Akşam yemeği 19:00-21:00, Mini gece büfesi 23:30-00:00.\n- La Terrace A La Carte: 18:30-20:30 (rezervasyonlu, ücretli).\n- Sinton BBQ: 13:00-22:00 (Pazartesi kapalı).\nSnack ve cafe:\n- Dolphin Snack 12:00-16:00\n- Beach Imbiss Snack 12:00-16:00\n- Beach Imbiss İçecek 10:00-17:00\n- Gusto Snack 11:00-18:00\n- Libum Cafe 11:00-18:00\n- Moss Beach Restaurant & Bar 10:00-19:00\nBarlar:\n- Havuz Bar 10:00-00:00\n- Dondurma Servisi 15:00-17:00\n- Lobby Bar 10:00-00:00\n- Aqua Bar 10:00-18:00 ve 20:00-23:00\n- Dolphin Bar 10:00-17:00",
        "fixed_pool_beach_info": "- Özel plaj mevcuttur.\n- Şezlong, şemsiye ve plaj havlusu ücretsizdir.\n- Plaj kullanım saatleri: 08:30-18:30.\nHavuzlar:\n- Üç açık havuz: Relax Pool 08:30-18:30, Aquapark 10:00-12:00 ve 14:00-16:00, Dolphin Pool 08:30-18:30.\n- Kapalı havuz (spa): 08:00-19:00.\n- Aquapark ve açık alanda çocuklara uygun sığ su bölgeleri bulunur.\n- Havuz ve plajda can kurtaran mevcuttur.\n- Havuz ve plaj havlusu servisi ücretsizdir.",
        "fixed_spa_info": "- La Serenite Spa kullanım saatleri: 09:00-19:00.\nÜcretsiz alanlar:\n- Sauna\n- Türk hamamı\n- Buhar odası\n- Kapalı havuz\nÜcretli hizmetler:\n- Masaj\n- Peeling\n- Cilt bakımı\n- Diğer bakım hizmetleri\nNot: Temel ıslak alan kullanımı ücretsiz, profesyonel bakım ve terapi hizmetleri ücretlidir.\n\nGüncel terapi ve bakım fiyat listesi ile paket PDF’leri sohbette uzun metin olarak verilmez; tüm premium içerik uygulamadaki «Spa & wellness» modülündedir. Modülü açmak için aşağıdaki düğmeyi kullanabilirsiniz.\n\nSpa rezervasyonu veya sorularınız için otel içi sabit hat: 5025.",
        "fixed_kuafor_info": (
            "Otelimizde kuaför hizmeti bulunmaktadır. Fiyat bilgisi, randevu ve kuaför hizmeti için doğrudan iletişim: "
            "Savaş Bey — +90 546 608 16 72."
        ),
        "wayfinding_rag_miss_guest_relations": (
            "Aradığınız noktanın konumunu şu an doğrulanmış kaynaklardan tek bir yanıtta çıkaramıyorum. "
            "Kişiselleştirilmiş ve güncel yönlendirme için «Misafir İlişkileri» ekibimize başvurmanızı öneririm; "
            "size zarif ve eksiksiz biçimde eşlik ederler. İsterseniz uygulamadaki «Nerede» bölümünden de haritaya bakabilirsiniz."
        ),
        "fixed_transfer_module_hint": (
            "Kaila Beach’te özel araçlı transfer hizmeti sunulmaktadır; karşılama ve güzergâh koordinasyonu için resepsiyon / ön büro ile iletişime geçmenizi rica ederiz. "
            "Güncel tarifeler, araç seçenekleri ve örnek güzergâh bilgileri sohbette uzun metin olarak paylaşılmaz; tüm premium içerik uygulamadaki «Transfer» modülündedir.\n\n"
            "Aşağıdaki düğmeyle modülü açabilirsiniz."
        ),
        "fixed_spa_prices_module_hint": "Spa ve profesyonel bakım fiyatları sohbette listelenmez. Güncel fiyat listesi ve paketler yalnızca uygulamadaki «Spa & wellness» modülündedir; premium içeriğe aşağıdaki düğmeyle geçebilirsiniz.",
        "fixed_restaurants_bars_module_hint": "Havuz Bar menüsü, Lobby Bar menüsü, Moss Beach Restaurant menüsü ve barlarda içecek / import içki fiyat listesi sohbette uzun metin olarak gösterilmez; güncel PDF’ler «Restaurant & barlar» modülündedir. İlgili listelere aşağıdaki düğmeyle ulaşabilirsiniz. (Genel restoran saatleri için «restoran saatleri» diye sorabilir veya aynı modüle gidebilirsiniz.)",
        "fixed_room_service_module_hint": (
            "Kaila Beach’te yiyecek ve içecek oda servisi tüm oda tiplerinde ücretlidir; güncel oda servisi menüsü ve sipariş akışı "
            "yalnızca Viona uygulamasındaki «Oda servisi» modülündedir — sohbette uzun menü veya fiyat listesi paylaşılmaz. "
            "Özel zamanlama, alerjen veya kişiselleştirilmiş düzenleme için resepsiyon aynı özenle size eşlik eder.\n\n"
            "Modülü açmak için aşağıdaki düğmeyi kullanabilirsiniz."
        ),
        "fixed_animation_info": "- Akşam akrobatik dans şovları, temalı geceler, canlı müzik, DJ performansları (bu bölüm gün ve sezona göre çeşitlenebilir; bazı günler ekstra şov eklenebilir).\n- Gündüz çizelgesi genelde sabittir; günlük program 10:00'da başlar; aqua gym, dart, su topu gibi aktiviteler içerir. Güncel metin ve saatler uygulamadaki «Animasyon ve etkinlikler» modülündedir.\nÇocuk aktiviteleri:\n- Jammies Kids Club / Mini Club: 10:00-12:30 ve 14:30-17:00 (4-12 yaş)\n- Mini Disco: 20:45-21:00 (4-12 yaş)\n- Çocuk oyun parkı: 07:00-21:00\nNot: Akşam programı ve özel gösteriler güne göre farklılık gösterebilir; kesin bilgi için resepsiyon veya animasyon panosunu kontrol ediniz.",
        "fixed_outside_hotel_info": "Otel dışı öneriler için en güncel ve güvenli bilgi resepsiyondadır. Alanya merkez yaklaşık 3 km mesafededir; taksi ve toplu taşıma seçenekleri mevcuttur.",
        "fixed_alanya_discover_intro": "Alanya, Akdeniz kıyısında denizi, kalesi ve tarihi dokusuyla öne çıkan bir tatil kentidir. Gezginler için sık sorulan başlıca duraklar:\n\n• Kleopatra Plajı — ince kum ve berrak deniz\n• Kızıl Kule ve liman — şehrin simgesi\n• Alanya Kalesi — tepeden panoramik manzara; gün batımı çok beğenilir\n• Dim Çayı ve mesire alanları (iç kesim)\n\nOtelimiz Obagöl'de; şehir merkezine yaklaşık 3 km. Ulaşım için taksi ve toplu taşıma pratik seçeneklerdir. Güncel saatler, biletli alanlar ve özel turlar için resepsiyon en güvenilir kaynaktır.\n\nAşağıdaki düğmeyle uygulamadaki «Alanya'yı keşfedin» bölümünü açarak kısa metinler ve görsellerle bu noktaları inceleyebilirsiniz.",
        "fixed_ice_cream_info": "Evet, otelde dondurma servisi vardır. Dondurma servisi Havuz Bar'da 15:00-17:00 saatleri arasında ücretsiz sunulmaktadır. (Sezon ve operasyon takvimine göre değişiklik olabilir.)",
        "fixed_laundry_dry_cleaning_info": "Çamaşırhane, kuru temizleme ve ütü hizmetleri otelde ücretli olarak sunulur. Teslim alma, süre ve güncel ücretler için lütfen resepsiyon veya housekeeping ile iletişime geçiniz; giysilerinizi ve talebinizi oradan iletebilirsiniz.",
        "hotel_info_soft_followup_towel": (
            "Yukarıdaki saat ve kart bilgisi plaj/havuz havlusuna aittir; bu havlular havuz veya plaj noktasından verilir. "
            "Oda banyo havlusu bunlardan farklıdır, birbirinin yerine geçmez."
        ),
        "hotel_info_soft_followup_request_form_hint": (
            "Odaya ürün göndermek veya talep kaydı açmak için sohbette «lazım», «talep ediyorum», «eksik var», "
            "«ihtiyacım var», «rica ediyorum» gibi net ifadeler kullanabilir veya uygulamada İstekler bölümünden formu açabilirsiniz."
        ),
    },
    "en": {
        "chitchat_greeting": "Good day — I'm Viona, your digital host at Kaila Beach Hotel. How may I assist you today?",
        "chitchat_assistant_intro": "I'm Viona, your digital host at Kaila Beach Hotel. I can guide you through services, information, and practical details of your stay with clarity and care.",
        "chitchat_identity_question": "I'm Viona, crafted for Kaila Beach Hotel. I can help with hotel services, your stay, and general information — simply and precisely.",
        "chitchat_thanks": "You're most welcome. I'm here for anything else you'd like to refine about your stay.",
        "chitchat_farewell": "Until next time. Whenever you need discreet assistance, I'm here.",
        "chitchat_apology_from_user": "Not at all. I'll continue with the same care.",
        "chitchat_compliment": "Thank you for your thoughtful words — I'm glad I could be of service.",
        "chitchat_how_are_you": "Very well, thank you. Ask me anything about Kaila Beach Hotel; I'll keep answers concise and useful.",
        "chitchat_cancel_command_hint": (
            "When you say “cancel”, you might mean a chat form summary, a booking request, or something else. "
            "On the summary screen, 2 means cancel. "
            "At Kaila Beach, reservations and table arrangements are curated in person by our front office and specialist teams — "
            "we will be pleased to guide you to the right desk. How else may I assist you?"
        ),
        "chitchat_confusion_generic": "Which part should I clarify? I can explain what to type for hotel information, a request, a fault report, or a complaint.",
        "chitchat_confusion_after_form_cancel": (
            "You had just cancelled the summary screen, so no record was created. "
            "On that screen, 1 means confirm and open the record, 2 means cancel. "
            "To start again, you can type something like “socket not working”. "
            "For full name, please type your first and last name as on your ID (two words, e.g. Jane Smith)."
        ),
        "session_ack_after_cancel": "Understood. If anything else deserves attention, a short note is all I need.",
        "session_vazgectim_after_cancel": (
            "No record was created. You can start the chat form again for the same topic or type a new request or fault report."
        ),
        "session_reservation_followup_short": (
            "A brief reply on its own cannot be tied to an existing booking here; please share a clear date or a clear request. "
            "For general and stay arrangements, the front desk / reception; for refined à la carte tables, Guest Relations; "
            "for spa and massage, La Serenite Spa — we remain at your service at every step."
        ),
        "session_animation_schedule_followup": (
            "The daytime animation and activity schedule in the app’s «Animation & events» section and hotel information is usually the same every day; "
            "what tends to change is the evening shows and themed nights, and some days there may be an extra performance. "
            "For exact times for tomorrow or a specific evening, please confirm on the latest board at reception or with the animation team. "
            "Mini Club / Mini Disco hours may vary by children’s age group."
        ),
        "chat_form_cancel_ack_fault": (
            "I've cancelled this fault report for you. Whenever you wish, you may open a new fault report, request, or guest notice."
        ),
        "chat_form_cancel_ack_request": (
            "I've cancelled this request for you. Whenever you wish, you may open a new request, fault report, or guest notice."
        ),
        "chat_form_cancel_ack_complaint": (
            "I've cancelled this complaint for you. Whenever you wish, you may open a new complaint, request, or fault report."
        ),
        "chat_form_cancel_ack_guest_notification": (
            "I've cancelled this guest notification for you. Whenever you wish, you may open a new guest notice, request, or fault report."
        ),
        "chat_form_context_retract_ack": (
            "Understood — if no record is required, that's perfectly fine. In a few words, how may I assist next: your room, dining, "
            "activities, or reception?"
        ),
        "chitchat_switch_en": "Good day — I'll reply in English from now on. How may I assist you?",
        "chitchat_switch_tr": "Bundan sonra Türkçe yanıtlıyorum. Konaklamanızda size nasıl eşlik edebilirim?",
        "chitchat_switch_de": "Gern ab jetzt auf Deutsch. Wobei darf ich behilflich sein?",
        "chitchat_switch_pl": "Od teraz odpowiadam po polsku. W czym mogę dziś pomóc?",
        "current_time_template": "The current time is {time}.",
        "fault_redirect_message": "For this issue, please complete the Fault Report form.",
        "complaint_redirect_message": "For this matter, please complete the Complaint form.",
        "request_redirect_message": "You can submit your request through the Request form.",
        "guest_relations_redirect_message": "For this matter, please contact the Guest Relations department.",
        "reception_fallback_message": "I wasn't able to complete that just now. A shorter note works best — I'll gladly continue from there.",
        "after_hours_reception_redirect": (
            "Between midnight and 8:00 a.m., our operational team is offline, so I cannot record service requests, complaints, "
            "fault reports, or guest notifications through the app during this time. For prompt assistance, please contact "
            "reception directly — they will be glad to help."
        ),
        "canonical_fallback_safe": "I don't have verified details on this at the moment. For the most accurate guidance, our front desk will be delighted to assist.",
        "canonical_fallback_unavailable": "I'm briefly unavailable. Please try again in a few seconds.",
        "chat_fallback_throttled": (
            "You're sending messages very quickly. Please wait a few seconds and try again, or contact reception if you need help right away."
        ),
        "chat_fallback_validation_error": "I can't process an empty message. Please type a short question or request.",
        "chat_form_invalid_state_hint": (
            "Something interrupted the form — nothing was saved. Please briefly describe your request again to restart, or ask reception for help."
        ),
        "recommendation_fish": "For fish and seafood, consider Moss Beach Restaurant & Bar on the beach (paid à la carte) and the main restaurant. La Terrace A La Carte requires a reservation for à la carte.",
        "recommendation_meat": "If you prefer meat or BBQ, Sinton BBQ Restaurant is a great match. A la carte restaurants require a reservation.",
        "recommendation_pizza_snack": "For pizza or snacks, Dolphin Snack, Gusto Snack, and Beach Imbiss are good options.",
        "recommendation_coffee_dessert": "For coffee or desserts, Libum Cafe and Lobby Bar are ideal choices.",
        "recommendation_kids_activity": "For children, Mini Club, Mini Disco, and the Kids Playground are the main activity options.",
        "recommendation_romantic_dinner": "For a romantic evening, La Terrace A La Carte or Moss Beach Restaurant & Bar on the shore are good choices; reservation is recommended for à la carte.",
        "recommendation_general_dining": "If you are undecided, Sinton BBQ or the main restaurant are solid dinner options; for a quick bite, Dolphin Snack and Gusto Snack are practical.",
        "fault_template_with_device": "If your {device} is not working, please contact reception; technical support is provided at the hotel.",
        "fault_template_generic": "For this fault, please contact reception; technical support is provided at the hotel.",
        "complaint_noise": "Please share this complaint with Guest Relations first. Reception can also assist with escalation if needed.",
        "complaint_cleanliness": "Please report this cleanliness issue to Guest Relations first; reception can also support.",
        "complaint_default": "For this complaint, please contact Guest Relations first. You may also report it via reception.",
        "complaint_lost_property": (
            "Lost & found — Valuables may be kept for up to one year; other items for up to six months.\n\n"
            "Phrases like “lost”, “can’t find”, “missing”, “misplaced” for personal items (glasses, phone, watch, jewellery) "
            "are not room faults; in the complaint form below, choose “Lost property”.\n\n"
            "For the most attentive assistance, please visit Guest Relations or reception. "
            "You may also complete the complaint form below to share details in writing — our team will handle your record with care."
        ),
        "complaint_form_guidance": (
            "You can submit your complaint through the complaint form in the Viona app — choosing the right category helps our team "
            "review your case efficiently. The button below opens the form; you may also speak with reception or Guest Relations."
        ),
        "request_towel": "Please contact reception for your towel request.",
        "request_blanket": "Please contact reception for your blanket request.",
        "request_water": "For water or drinking water to your room, please contact reception; the team will arrange delivery.",
        "request_pillow": "Please contact reception for your pillow request.",
        "request_housekeeping": "For room cleaning and housekeeping requests, please contact reception; the relevant team will be arranged.",
        "request_reception_contact": "For the fastest resolution, please contact reception directly.",
        "request_guest_relations_contact": "For this matter, Guest Relations is the right department. You may also connect through reception.",
        "request_transfer": "For transfer arrangements, please contact reception and the team will assist you.",
        "request_lunch_box": "For a Lunch Box request, please inform reception no later than 20:00.",
        "request_spa_booking_contact": (
            "For massages, rituals and paid treatments at La Serenite Spa, we kindly invite you to speak directly with our spa hosts — "
            "they will refine timing and experiences with you. Reception can discreetly connect you whenever you wish. "
            "For spa reservations and questions, the in-house direct line is 5025."
        ),
        "request_ala_carte_reservation": (
            "Paid dining and à la carte tables are arranged with personal care by Guest Relations. "
            "Please reach out to them directly; reception can also arrange a seamless introduction if you prefer."
        ),
        "request_premium_reservation_reception": (
            "For premium seating and bespoke dining evenings, our front desk / reception orchestrates the finest routing "
            "and introduces you to the right venue or team."
        ),
        "request_default": "Please share this request with reception.",
        "reservation_early_checkin": "Please contact reception for your early check-in request.",
        "reservation_late_checkout": "Please contact reception for your late check-out request.",
        "early_checkin_reception_handoff": (
            "Early check-in is subject to availability and housekeeping on the day of arrival. "
            "Our front desk team will gladly confirm what is possible and arrange the details. "
            "Please stop by reception or call us when you arrive — we are here to help."
        ),
        "late_checkout_guest_notif_redirect": (
            "Late check-out is arranged by the front desk. "
            "Use the late check-out form inside Requests → Guest notices on the main screen. "
            "The button below opens that form directly."
        ),
        "reservation_room_change": "Please contact reception for your room change request.",
        "reservation_default": (
            "At Kaila Beach, reservations and table arrangements are completed in person by our front-of-house and specialist hosts, with attentive, bespoke care. "
            "For your stay and general plans, reception; for à la carte tables, Guest Relations; for spa and massage, La Serenite Spa — we are with you for a seamless, refined experience."
        ),
        "special_need_celiac": "Please inform the Guest Relations department about this condition; suitable support can be coordinated with the kitchen.",
        "special_need_vegan": "Please inform the Guest Relations department about your dietary preference; suitable options may be arranged.",
        "special_need_allergy": "Please inform the Guest Relations department about your allergy; necessary guidance will be provided.",
        "special_need_baby_need": "Please contact the Guest Relations department about your baby food needs; they can help arrange suitable options.",
        "special_need_accessibility_need": "Please inform the Guest Relations department about your accessibility needs; the necessary arrangements will be made.",
        "special_need_default": "Please contact the Guest Relations department for this matter.",
        "guest_notification_policy_hint": "You can submit a guest notification via chat by choosing a category; you may also type keywords like gluten, allergy, or celebration in your next message.",
        "fixed_restaurant_info": "- Main Restaurant: Breakfast 07:00-10:00, Late breakfast 10:00-10:30, Lunch 12:30-14:00, Dinner 19:00-21:00, Mini night buffet 23:30-00:00.\n- La Terrace A La Carte: 18:30-20:30 (reservation required, paid).\n- Sinton BBQ: 13:00-22:00 (closed Mondays).\nSnack and cafe:\n- Dolphin Snack 12:00-16:00\n- Beach Imbiss Snack 12:00-16:00\n- Beach Imbiss Drinks 10:00-17:00\n- Gusto Snack 11:00-18:00\n- Libum Cafe 11:00-18:00\n- Moss Beach Restaurant & Bar 10:00-19:00\nBars:\n- Pool Bar 10:00-00:00\n- Ice Cream Service 15:00-17:00\n- Lobby Bar 10:00-00:00\n- Aqua Bar 10:00-18:00 and 20:00-23:00\n- Dolphin Bar 10:00-17:00",
        "fixed_pool_beach_info": "- Private beach available.\n- Sunbeds, umbrellas, and beach towels are free.\n- Beach usage hours: 08:30-18:30.\nPools:\n- Three outdoor pools: Relax Pool 08:30-18:30, Aquapark 10:00-12:00 and 14:00-16:00, Dolphin Pool 08:30-18:30.\n- Indoor pool (spa): 08:00-19:00.\n- Shallow areas for children are in the outdoor / aquapark zone.\n- Lifeguards are present at the pools and on the sea.\n- Pool and beach towel service is free.",
        "fixed_spa_info": "- La Serenite Spa hours: 09:00-19:00.\nFree areas:\n- Sauna\n- Turkish bath\n- Steam room\n- Indoor pool\nPaid services:\n- Massage\n- Peeling\n- Skin care\n- Other treatment services\nNote: Basic wet-area use is free; professional care and therapy services are paid.\n\nTreatment menus and price lists are not shared as long text in chat; the up-to-date PDFs live in the in-app «Spa & wellness» section. Use the button below to open that page.\n\nFor spa reservations or questions, in-house direct line: 5025.",
        "fixed_kuafor_info": (
            "The hotel offers a hairdressing service. For prices, appointments, and hairdressing service, please contact "
            "Mr. Savaş directly at +90 546 608 16 72."
        ),
        "wayfinding_rag_miss_guest_relations": (
            "I cannot confirm that location in one verified answer right now. "
            "For personalised, up-to-date wayfinding, please speak with Guest Relations — they will assist you with attentive care. "
            "You may also open the «Where» section in the app for the map."
        ),
        "fixed_transfer_module_hint": (
            "Kaila Beach offers a dedicated transfer service; for meet-and-greet and routing coordination, please contact reception / the front office. "
            "Current rates, vehicle options, and sample route information are not shared as long text in chat; the premium content lives in the «Transfer» module.\n\n"
            "Use the button below to open it."
        ),
        "fixed_spa_prices_module_hint": "Spa treatment prices are not listed in chat. The current price list and packages are only in the «Spa & wellness» module — use the button below for the premium content.",
        "fixed_restaurants_bars_module_hint": "The Pool Bar menu, Lobby Bar menu, Moss Beach Restaurant menu, and bar drink / imported spirits price lists are not shown as long text in chat; up-to-date PDFs are in «Restaurants & bars». Open that section with the button below. (For general outlet hours you can still ask for «restaurant hours» or use the same module.)",
        "fixed_room_service_module_hint": (
            "In-room dining at Kaila Beach is a paid service in every room category; the current room-service menu and ordering "
            "flow are only in the Viona app under «Room service» — we do not paste long menus or price lists in chat. "
            "For timing, allergens, or a tailored arrangement, reception will assist you with the same care.\n\n"
            "Open the module with the button below."
        ),
        "fixed_animation_info": "- Evening acrobatic dance shows, themed nights, live music, and DJ performances (this part can vary by day and season; some days may include an extra show).\n- The daytime schedule is generally stable: the daily program starts at 10:00 with aqua gym, darts, and water polo. The latest wording and times are in the in-app «Animation & events» section.\nChildren’s activities:\n- Jammies Kids Club / Mini Club: 10:00-12:30 and 14:30-17:00 (ages 4-12)\n- Mini Disco: 20:45-21:00 (ages 4-12)\n- Children’s playground: 07:00-21:00\nNote: Evening line-ups and special shows may differ by day; please check reception or the animation board for the exact programme.",
        "fixed_outside_hotel_info": "For outside-hotel suggestions, reception provides the most up-to-date and safe guidance. Alanya city center is about 3 km away, and taxi/public transport options are available.",
        "fixed_alanya_discover_intro": "Alanya is a lively Mediterranean resort known for its seafront, castle and historic character. Highlights many guests enjoy:\n\n• Kleopatra Beach — fine sand and clear water\n• Red Tower and harbour — an iconic landmark\n• Alanya Castle — panoramic views from the hill; sunsets are memorable\n• Dim River picnic area inland\n\nOur hotel is in Obagöl, about 3 km from the city centre. Taxis and public transport are practical. For opening hours, ticketed sites and organised tours, reception is the safest source of up-to-date advice.\n\nUse the button below to open the in-app «Discover Alanya» section with short descriptions and images.",
        "fixed_ice_cream_info": "Yes, the hotel offers an ice cream service. It is served complimentary at the Pool Bar between 15:00 and 17:00. (Hours may vary by season and operations.)",
        "fixed_laundry_dry_cleaning_info": "Laundry, dry cleaning, and ironing are available at the hotel as paid services. Please contact reception or housekeeping for drop-off, turnaround, and current prices; they will handle your items and request.",
        "hotel_info_soft_followup_towel": (
            "The hours and card rules above refer to pool/beach towels issued at the pool/beach desk. "
            "Those are not the same as the bathroom towels in your room."
        ),
        "hotel_info_soft_followup_request_form_hint": (
            "To have something brought to your room or to log a supply request, write clearly in chat "
            "(e.g. «I need…», «please send», «it’s missing», «I’d like to request») or open the Requests form in the app."
        ),
    },
    "de": {
        "chitchat_greeting": "Guten Tag — ich bin Viona, Ihre digitale Gastgeberin im Kaila Beach Hotel. Wobei darf ich Ihnen heute behilflich sein?",
        "chitchat_assistant_intro": "Ich bin Viona, Ihre digitale Gastgeberin im Kaila Beach Hotel. Ich begleite Sie bei Services, Informationen und praktischen Fragen Ihres Aufenthalts — klar und aufmerksam.",
        "chitchat_identity_question": "Ich bin Viona, für das Kaila Beach Hotel entwickelt. Ich unterstütze Sie bei Hotelservices, Aufenthalt und allgemeinen Informationen.",
        "chitchat_thanks": "Sehr gern. Für alles Weitere rund um Ihren Aufenthalt bin ich jederzeit für Sie da.",
        "chitchat_farewell": "Auf Wiedersehen. Wenn Sie dezent Unterstützung wünschen, bin ich für Sie erreichbar.",
        "chitchat_apology_from_user": "Kein Problem. Ich setze unsere Unterstützung gern mit derselben Sorgfalt fort.",
        "chitchat_compliment": "Herzlichen Dank für Ihre freundlichen Worte — es freut mich, dass ich helfen konnte.",
        "chitchat_how_are_you": "Danke, mir geht es ausgezeichnet. Fragen Sie gern alles zum Kaila Beach Hotel; ich antworte prägnant und nutzbringend.",
        "chitchat_cancel_command_hint": (
            "Mit „Abbrechen“ kann eine Chat-Formularzusammenfassung, eine Buchungsanfrage oder etwas anderes gemeint sein. "
            "Auf der Zusammenfassung bedeutet 2 „Abbrechen“. "
            "Reservierungen und Tischwünsche werden im Kaila Beach persönlich von unserer Front Office- und Spezialteams betreut — "
            "wir verbinden Sie gern mit dem passenden Schalter. Wobei darf ich sonst behilflich sein?"
        ),
        "chitchat_confusion_generic": "Welchen Teil soll ich erklären? Ich kann sagen, was Sie für Hotelinfos, eine Anfrage, eine Störung oder eine Beschwerde schreiben können.",
        "chitchat_confusion_after_form_cancel": (
            "Sie hatten die Zusammenfassung gerade abgebrochen; deshalb wurde kein Eintrag erstellt. "
            "Auf diesem Bildschirm bedeutet 1 Bestätigen und Eintrag anlegen, 2 Abbrechen. "
            "Um neu zu starten, können Sie z. B. „Steckdose funktioniert nicht“ schreiben. "
            "Bitte geben Sie Vor- und Nachnamen wie im Ausweis an (zwei Wörter, z. B. Anna Müller)."
        ),
        "session_ack_after_cancel": "Alles klar. Für alles Weitere genügt eine kurze Nachricht — ich bin gern für Sie da.",
        "session_vazgectim_after_cancel": (
            "Es wurde kein Eintrag erstellt. Sie können den Chat-Flow erneut starten oder eine neue Anfrage bzw. Störungsmeldung schreiben."
        ),
        "session_reservation_followup_short": (
            "Eine sehr kurze Antwort kann ich hier nicht mit einer bestehenden Buchung verknüpfen; bitte nennen Sie ein klares Datum oder ein klares Anliegen. "
            "Für allgemeine Aufenthaltsfragen: Rezeption / Empfang; für elegante À-la-carte-Tische: Gästebetreuung; "
            "für Spa und Massage: La Serenite Spa — wir stehen Ihnen auf jedem Schritt zur Seite."
        ),
        "session_animation_schedule_followup": (
            "Der Tagesplan für Animation und Aktivitäten in der App unter «Animation & Veranstaltungen» und in den Hotelinformationen ist in der Regel täglich gleich; "
            "häufiger ändern sich die Abendshows und Themenabende, und an manchen Tagen gibt es zusätzliche Shows. "
            "Für morgen oder einen bestimmten Abend bestätigen Sie bitte die genauen Zeiten an der aktuellen Tafel an der Rezeption oder beim Animationsteam. "
            "Mini Club / Mini Disco können je nach Altersgruppe der Kinder abweichen."
        ),
        "chat_form_cancel_ack_fault": (
            "Ich habe diese Störungsmeldung für Sie storniert. Wann immer Sie möchten, können Sie eine neue Meldung, Anfrage oder Gästenotiz beginnen."
        ),
        "chat_form_cancel_ack_request": (
            "Ich habe diese Anfrage für Sie storniert. Wann immer Sie möchten, können Sie eine neue Anfrage, Störungsmeldung oder Gästenotiz beginnen."
        ),
        "chat_form_cancel_ack_complaint": (
            "Ich habe diese Beschwerde für Sie storniert. Wann immer Sie möchten, können Sie eine neue Beschwerde, Anfrage oder Störungsmeldung beginnen."
        ),
        "chat_form_cancel_ack_guest_notification": (
            "Ich habe diese Gästemeldung für Sie storniert. Wann immer Sie möchten, können Sie eine neue Gästenotiz, Anfrage oder Störungsmeldung beginnen."
        ),
        "chat_form_context_retract_ack": (
            "Alles klar — wenn kein Eintrag nötig ist, freut mich das. Schreiben Sie kurz, womit ich sonst helfen darf: Zimmer, "
            "Essen & Trinken, Aktivitäten oder Rezeption."
        ),
        "chitchat_switch_en": "Good day — I'll reply in English from now on. How may I assist you?",
        "chitchat_switch_tr": "Bundan sonra Türkçe yanıtlıyorum. Konaklamanızda size nasıl eşlik edebilirim?",
        "chitchat_switch_de": "Gern ab jetzt auf Deutsch. Wobei darf ich behilflich sein?",
        "chitchat_switch_pl": "Od teraz odpowiadam po polsku. W czym mogę dziś pomóc?",
        "current_time_template": "Die aktuelle Zeit ist {time}.",
        "fault_redirect_message": "Bitte füllen Sie für dieses Problem das Störungsmeldungsformular aus.",
        "complaint_redirect_message": "Bitte füllen Sie für dieses Thema das Beschwerdeformular aus.",
        "request_redirect_message": "Sie können Ihre Anfrage über das Anfrageformular senden.",
        "guest_relations_redirect_message": "Bitte wenden Sie sich für dieses Thema an die Gästebetreuung.",
        "reception_fallback_message": "Das konnte ich gerade nicht vollständig auswerten. Eine knappere Formulierung hilft — ich unterstütze Sie gern weiter.",
        "after_hours_reception_redirect": (
            "Zwischen 0:00 und 8:00 Uhr ist unser operatives Team nicht erreichbar; in dieser Zeit kann ich daher keine "
            "Serviceanfragen, Beschwerden, Störungsmeldungen oder Gästehinweise per Formular entgegennehmen. "
            "Bitte wenden Sie sich direkt an die Rezeption — dort wird Ihnen mit größter Sorgfalt geholfen."
        ),
        "canonical_fallback_safe": "Ich kann dazu derzeit keine verifizierten Informationen bereitstellen. Bitte wenden Sie sich für die sicherste Auskunft an die Rezeption.",
        "canonical_fallback_unavailable": "Ich bin momentan kurzzeitig nicht erreichbar. Bitte versuchen Sie es in wenigen Sekunden erneut.",
        "chat_fallback_throttled": (
            "Sie senden sehr schnell viele Nachrichten. Bitte warten Sie einige Sekunden und versuchen Sie es erneut — die Rezeption hilft bei dringenden Fragen gern sofort."
        ),
        "chat_fallback_validation_error": "Eine leere Nachricht kann ich nicht verarbeiten. Bitte schreiben Sie kurz Ihr Anliegen.",
        "chat_form_invalid_state_hint": (
            "Der Formularablauf wurde unerwartet unterbrochen; es wurde nichts gespeichert. Bitte beginnen Sie mit einer kurzen Beschreibung erneut oder wenden Sie sich an die Rezeption."
        ),
        "recommendation_fish": "Für Fisch und Meeresfrüchte eignen sich Moss Beach Restaurant & Bar am Strand (kostenpflichtiges À-la-carte) und das Hauptrestaurant. Für La Terrace A La Carte ist eine Reservierung erforderlich.",
        "recommendation_meat": "Wenn Sie Fleisch oder BBQ bevorzugen, passt das Sinton BBQ Restaurant sehr gut. Für A-la-carte-Restaurants ist eine Reservierung erforderlich.",
        "recommendation_pizza_snack": "Für Pizza oder Snacks sind Dolphin Snack, Gusto Snack und Beach Imbiss passende Optionen.",
        "recommendation_coffee_dessert": "Für Kaffee oder Dessert sind Libum Cafe und Lobby Bar ideale Optionen.",
        "recommendation_kids_activity": "Für Kinderaktivitäten sind Mini Club, Mini Disco und der Kinderspielplatz die wichtigsten Optionen.",
        "recommendation_romantic_dinner": "Für einen romantischen Abend eignen sich La Terrace A La Carte oder Moss Beach Restaurant & Bar am Strand; für À-la-carte wird eine Reservierung empfohlen.",
        "recommendation_general_dining": "Wenn Sie unsicher sind, sind Sinton BBQ oder das Hauptrestaurant gute Abendoptionen; für einen schnellen Snack eignen sich Dolphin Snack und Gusto Snack.",
        "fault_template_with_device": "Bei einem {device}-Defekt wenden Sie sich bitte an die Rezeption; im Hotel wird technischer Support bereitgestellt.",
        "fault_template_generic": "Bei dieser Störung wenden Sie sich bitte an die Rezeption; im Hotel wird technischer Support bereitgestellt.",
        "complaint_noise": "Bitte wenden Sie sich mit dieser Beschwerde zuerst an die Gästebetreuung. Bei Bedarf kann auch die Rezeption unterstützen.",
        "complaint_cleanliness": "Bitte melden Sie dieses Reinigungsproblem zunächst der Gästebetreuung; die Rezeption kann ebenfalls helfen.",
        "complaint_default": "Bitte wenden Sie sich bei dieser Beschwerde zuerst an die Gästebetreuung. Alternativ kann die Rezeption unterstützen.",
        "complaint_lost_property": (
            "Fundsachen — Wertgegenstände werden bis zu einem Jahr, übrige Gegenstände bis zu sechs Monaten aufbewahrt.\n\n"
            "Formulierungen wie «verloren», «finde nicht», «weg», «vermisst» für persönliche Gegenstände (Brille, Handy, Uhr, Schmuck) "
            "sind kein Zimmerdefekt; im Beschwerdeformular unten «Fundsachen / verlorenes Eigentum» wählen.\n\n"
            "Für eine persönliche Betreuung wenden Sie sich bitte an die Gästebetreuung oder die Rezeption. "
            "Optional können Sie unten das Beschwerdeformular ausfüllen und die Details schriftlich mitteilen — unser Team bearbeitet Ihren Eintrag aufmerksam."
        ),
        "complaint_form_guidance": (
            "Ihre Beschwerde können Sie über das Beschwerdeformular in der Viona-App senden — die passende Kategorie hilft unserem Team, "
            "Ihr Anliegen zügig zu prüfen. Die Schaltfläche unten öffnet das Formular; alternativ erreichen Sie die Rezeption oder die "
            "Gästebetreuung."
        ),
        "request_towel": "Bitte wenden Sie sich für Ihre Handtuchanfrage an die Rezeption.",
        "request_blanket": "Bitte wenden Sie sich für Ihre Deckenanfrage an die Rezeption.",
        "request_water": "Für Wasser oder Trinkwasser aufs Zimmer wenden Sie sich bitte an die Rezeption; das Team organisiert die Zustellung.",
        "request_pillow": "Bitte wenden Sie sich für Ihre Kissenanfrage an die Rezeption.",
        "request_housekeeping": "Für Zimmerreinigung und Housekeeping-Anfragen wenden Sie sich bitte an die Rezeption; das zuständige Team wird informiert.",
        "request_reception_contact": "Für die schnellste Lösung wenden Sie sich bitte direkt an die Rezeption.",
        "request_guest_relations_contact": "Für dieses Anliegen ist die Gästebetreuung die richtige Stelle. Auf Wunsch kann die Rezeption ebenfalls verbinden.",
        "request_transfer": "Für Transferanfragen wenden Sie sich bitte an die Rezeption; die Planung wird dort koordiniert.",
        "request_lunch_box": "Für eine Lunch-Box-Anfrage informieren Sie bitte die Rezeption spätestens bis 20:00 Uhr.",
        "request_spa_booking_contact": (
            "Für Massage, Anwendungen und kostenpflichtige Rituale im La Serenite Spa sprechen Sie bitte direkt mit unserem Spa-Team — "
            "Zeiten und Wünsche werden dort persönlich abgestimmt. Die Rezeption verbindet Sie auf Wunsch diskret. "
            "Für Spa-Reservierungen und Fragen: Hotel-Innenanschluss 5025."
        ),
        "request_ala_carte_reservation": (
            "À-la-carte- und kostenpflichtige Restaurant-Tische werden von der Gästebetreuung mit besonderer Sorgfalt koordiniert. "
            "Bitte wenden Sie sich direkt dorthin; die Rezeption kann auf Wunsch eine nahtlose Vermittlung übernehmen."
        ),
        "request_premium_reservation_reception": (
            "Für Premium-Tische und exklusive Dining-Abende orchestriert die Rezeption / der Empfang die feinste Weiterleitung "
            "und führt Sie zum passenden Restaurant oder Team."
        ),
        "request_default": "Bitte teilen Sie diese Anfrage der Rezeption mit.",
        "reservation_early_checkin": "Bitte wenden Sie sich für Ihre Bitte um frühen Check-in an die Rezeption.",
        "reservation_late_checkout": "Bitte wenden Sie sich für Ihre Bitte um späten Check-out an die Rezeption.",
        "early_checkin_reception_handoff": (
            "Ein früherer Check-in hängt von Belegung und Zimmerbereitung am Anreisetag ab. "
            "Unser Rezeptionsteam informiert Sie zuverlässig und hilft bei der Organisation. "
            "Sprechen Sie uns bitte direkt an der Rezeption an oder rufen Sie uns an — wir unterstützen Sie gern."
        ),
        "late_checkout_guest_notif_redirect": (
            "Ein späterer Check-out wird an der Rezeption geklärt. "
            "Nutzen Sie das Formular für den späten Check-out unter Anfragen → Gästemeldungen. "
            "Die Schaltfläche unten öffnet dieses Formular direkt."
        ),
        "reservation_room_change": "Bitte wenden Sie sich für Ihren Zimmerwechsel an die Rezeption.",
        "reservation_default": (
            "Im Kaila Beach werden Reservierungen und Tischwünsche persönlich von unserem Front Office und den Spezialteams mit aufmerksamer, maßgeschneiderter Betreuung für Sie abgestimmt. "
            "Für Aufenthalt und allgemeine Planung: Rezeption; für À-la-carte-Tische: Gästebetreuung; für Spa und Massage: La Serenite Spa — für einen nahtlosen, stilvollen Aufenthalt an Ihrer Seite."
        ),
        "special_need_celiac": "Bitte informieren Sie die Gästebetreuung über diese Situation; geeignete Unterstützung kann mit der Küche koordiniert werden.",
        "special_need_vegan": "Bitte informieren Sie die Gästebetreuung über Ihre Ernährungspräferenz; passende Optionen können angeboten werden.",
        "special_need_allergy": "Bitte informieren Sie die Gästebetreuung über Ihre Allergie; die notwendige Unterstützung wird bereitgestellt.",
        "special_need_baby_need": "Bitte wenden Sie sich an die Gästebetreuung bezüglich Ihres Bedarfs an Babynahrung; geeignete Optionen können organisiert werden.",
        "special_need_accessibility_need": "Bitte informieren Sie die Gästebetreuung über Ihre Bedürfnisse im Bereich Barrierefreiheit; die notwendigen Vorkehrungen werden getroffen.",
        "special_need_default": "Bitte wenden Sie sich in diesem Fall an die Gästebetreuung.",
        "guest_notification_policy_hint": "Sie können eine Gästemeldung im Chat per Kategorie senden; schreiben Sie z. B. Gluten, Allergie oder Feier in Ihrer nächsten Nachricht.",
        "fixed_restaurant_info": "- Hauptrestaurant: Frühstück 07:00-10:00, Spätfrühstück 10:00-10:30, Mittagessen 12:30-14:00, Abendessen 19:00-21:00, Mini-Nachtbuffet 23:30-00:00.\n- La Terrace A La Carte: 18:30-20:30 (reservierungspflichtig, kostenpflichtig).\n- Sinton BBQ: 13:00-22:00 (montags geschlossen).\nSnack und Cafe:\n- Dolphin Snack 12:00-16:00\n- Beach Imbiss Snack 12:00-16:00\n- Beach Imbiss Getränke 10:00-17:00\n- Gusto Snack 11:00-18:00\n- Libum Cafe 11:00-18:00\n- Moss Beach Restaurant & Bar 10:00-19:00\nBars:\n- Pool Bar 10:00-00:00\n- Eis-Service 15:00-17:00\n- Lobby Bar 10:00-00:00\n- Aqua Bar 10:00-18:00 und 20:00-23:00\n- Dolphin Bar 10:00-17:00",
        "fixed_pool_beach_info": "- Privater Strand ist vorhanden.\n- Liegen, Sonnenschirme und Strandhandtücher sind kostenlos.\n- Strandnutzung: 08:30-18:30.\nPools:\n- Drei Außenbecken: Relax Pool 08:30-18:30, Aquapark 10:00-12:00 und 14:00-16:00, Dolphin Pool 08:30-18:30.\n- Hallenbad (Spa): 08:00-19:00.\n- Flache Kinderbereiche im Außen- und Aquaparkbereich.\n- Rettungsschwimmer an Pools und am Meer.\n- Handtuchservice für Pool und Strand ist kostenlos.",
        "fixed_spa_info": "- Öffnungszeiten La Serenite Spa: 09:00-19:00.\nKostenlose Bereiche:\n- Sauna\n- Türkisches Bad\n- Dampfbad\n- Hallenbad\nKostenpflichtige Leistungen:\n- Massage\n- Peeling\n- Hautpflege\n- Weitere Behandlungen\nHinweis: Grundnutzung der Nassbereiche ist kostenlos; professionelle Pflege- und Therapieleistungen sind kostenpflichtig.\n\nAktuelle Preislisten und Behandlungs-PDFs werden im Chat nicht als langer Text ausgegeben; die Premium-Inhalte finden Sie im App-Bereich «Spa & Wellness». Öffnen Sie die Seite über die Schaltfläche unten.\n\nFür Spa-Reservierungen oder Fragen: Hotel-Innenanschluss 5025.",
        "fixed_kuafor_info": (
            "Im Hotel gibt es einen Friseurservice. Für Preise, Termine und Friseurleistungen erreichen Sie Herrn Savaş unter +90 546 608 16 72."
        ),
        "wayfinding_rag_miss_guest_relations": (
            "Den genauen Ort kann ich gerade nicht aus verifizierten Unterlagen in einer kurzen Antwort bestätigen. "
            "Für eine persönliche, aktuelle Wegführung wenden Sie sich bitte an die Gästebetreuung (Guest Relations) — "
            "sie begleitet Sie aufmerksam. In der App finden Sie unter «Wo» zusätzlich die Übersichtskarte."
        ),
        "fixed_transfer_module_hint": (
            "Im Kaila Beach steht Ihnen ein Transfer-Service zur Verfügung; für Koordination und Abholung wenden Sie sich bitte an die Rezeption / den Empfang. "
            "Aktuelle Preise, Fahrzeugoptionen und Routenbeispiele werden im Chat nicht als langer Text ausgegeben; die Premium-Inhalte liegen im «Transfer»-Modul.\n\n"
            "Öffnen Sie ihn über die Schaltfläche unten."
        ),
        "fixed_spa_prices_module_hint": "Spa- und Anwendungspreise werden im Chat nicht aufgelistet. Die aktuelle Preisliste und Pakete stehen nur im Modul «Spa & Wellness» — bitte nutzen Sie die Schaltfläche unten.",
        "fixed_restaurants_bars_module_hint": "Pool-Bar-Menü, Lobby-Bar-Speisekarte, Moss-Restaurant-Speisekarte und Getränke-/Importspirituosen-Preislisten der Bars werden im Chat nicht als langer Text gezeigt; aktuelle PDFs liegen unter «Restaurants & Bars». Bitte öffnen Sie den Bereich über die Schaltfläche unten. (Allgemeine Öffnungszeiten können Sie weiterhin mit «Restaurantzeiten» erfragen oder im selben Modul einsehen.)",
        "fixed_room_service_module_hint": (
            "Speisen und Getränke per Zimmerservice sind im Kaila Beach in allen Zimmerkategorien kostenpflichtig; aktuelles Menü "
            "und Bestellweg finden Sie ausschließlich in der Viona-App unter «Zimmerservice» — keine langen Menüs oder Preislisten im Chat. "
            "Für Zeiten, Allergene oder eine persönliche Abstimmung hilft Ihnen die Rezeption aufmerksam weiter.\n\n"
            "Öffnen Sie das Modul über die Schaltfläche unten."
        ),
        "fixed_animation_info": "- Abendliche Akrobatik-Tanzshows, Themenabende, Live-Musik und DJ-Performances (dieser Teil kann je nach Tag und Saison wechseln; an manchen Tagen gibt es Zusatzshows).\n- Der Tagesablauf ist in der Regel stabil: Start um 10:00 mit Aqua Gym, Dart und Wasserball. Aktuelle Texte und Zeiten finden Sie in der App unter «Animation & Veranstaltungen».\nKinderaktivitäten:\n- Jammies Kids Club / Mini Club: 10:00-12:30 und 14:30-17:00 (4-12 Jahre)\n- Mini Disco: 20:45-21:00 (4-12 Jahre)\n- Kinderspielplatz: 07:00-21:00\nHinweis: Abendprogramm und Zusatzshows können täglich abweichen; genaue Auskunft an der Rezeption oder an der Animationstafel.",
        "fixed_outside_hotel_info": "Für Empfehlungen außerhalb des Hotels wenden Sie sich bitte an die Rezeption; dort erhalten Sie die aktuellsten und sichersten Informationen. Das Zentrum von Alanya ist etwa 3 km entfernt; Taxi- und ÖPNV-Optionen sind verfügbar.",
        "fixed_alanya_discover_intro": "Alanya ist ein lebendiges Mittelmeerziel mit Strand, Burg und historischem Flair. Beliebte Stationen:\n\n• Kleopatra-Strand — feiner Sand, klares Wasser\n• Roter Turm und Hafen — Wahrzeichen der Stadt\n• Burg von Alanya — Panoramablick; Sonnenuntergänge sind eindrucksvoll\n• Dim-Çayı und Picknickbereiche landeinwärts\n\nUnser Hotel liegt in Obagöl, etwa 3 km vom Zentrum. Taxi und ÖPNV sind praktisch. Für Öffnungszeiten, Eintritte und organisierte Ausflüge ist die Rezeption die zuverlässigste Anlaufstelle.\n\nMit der Schaltfläche unten öffnen Sie die App-Rubrik «Alanya entdecken» mit Kurztexten und Bildern.",
        "fixed_ice_cream_info": "Ja, im Hotel gibt es einen Eis-Service. Er wird kostenlos an der Pool Bar zwischen 15:00 und 17:00 Uhr angeboten. (Zeiten können je nach Saison und Betrieb variieren.)",
        "fixed_laundry_dry_cleaning_info": "Wäscherei, chemische Reinigung und Bügelservice werden im Hotel kostenpflichtig angeboten. Bitte wenden Sie sich für Annahme, Bearbeitungszeit und aktuelle Preise an die Rezeption oder das Housekeeping.",
        "hotel_info_soft_followup_towel": (
            "Die genannten Zeiten und Kartenregeln gelten für Pool-/Strandhandtücher an der Ausgabe. "
            "Das sind nicht die Badetücher auf dem Zimmer."
        ),
        "hotel_info_soft_followup_request_form_hint": (
            "Für eine Zustellung aufs Zimmer oder einen konkreten Anfrage-Eintrag schreiben Sie im Chat deutlich "
            "(z. B. «brauche», «bitte schicken», «fehlt», «möchte bestellen») oder öffnen Sie das Formular unter «Anfragen» in der App."
        ),
    },
    "pl": TRANSLATIONS_PL,
}

_CHITCHAT_SWITCH_EXTRA_NATIVE: dict[str, str] = {
    "ru": "Отныне отвечаю по-русски. Чем могу быть полезна?",
    "da": "Fremover svarer jeg på dansk. Hvordan kan jeg være til tjeneste?",
    "cs": "Odteď odpovídám česky. Jak vám mohu dnes pomoci?",
    "ro": "De acum răspund în română. Cu ce vă pot fi de folos?",
    "nl": "Ik antwoord voortaan in het Nederlands. Waarmee mag ik u van dienst zijn?",
    "sk": "Odteraz budem odpovedať po slovensky. Ako vám dnes môžem pomôcť?",
}

# Gece 00–08 (İstanbul): ek UI dilleri için doğrudan çeviri (_RU_SURFACE ile çakışmaz; ru anahtarı orada).
_AFTER_HOURS_EXTRA_NATIVE: dict[str, str] = {
    "da": (
        "Mellem kl. 00.00 og 08.00 er vores driftsteam ikke tilgængeligt; i den periode kan jeg ikke registrere "
        "serviceanmodninger, klager, fejlmeldinger eller gæstenotater via appen. Kontakt venligst receptionen direkte."
    ),
    "nl": (
        "Tussen 00:00 en 08:00 is ons operationele team niet bereikbaar; in die periode kan ik geen serviceverzoeken, "
        "klachten, storingsmeldingen of gastmeldingen via de app registreren. Neem voor directe hulp contact op met de receptie."
    ),
    "cs": (
        "Mezi 0:00 a 8:00 je provozní tým nedostupný; v tomto čase nemohu přijímat požadavky, stížnosti, hlášení závad "
        "ani hlášení hostů přes aplikaci. V naléhavých případech kontaktujte přímo recepci."
    ),
    "ro": (
        "Între 0:00 și 8:00 echipa operațională nu este disponibilă; în acest interval nu pot înregistra solicitări, "
        "reclamații, sesizări tehnice sau notificări pentru oaspeți prin aplicație. Pentru asistență rapidă, contactați recepția."
    ),
    "sk": (
        "Medzi 0:00 a 8:00 je prevádzkový tím nedostupný; v tomto čase nemôžem prijímať požiadavky, sťažnosti, hlásenia porúch "
        "ani oznámenia hostí cez aplikáciu. V naliehavých prípadoch kontaktujte priamo recepciu."
    ),
}

_COMPLAINT_FORM_GUIDANCE_EXTRA_NATIVE: dict[str, str] = {
    "da": (
        "Du kan sende din klage via klageformularen i Viona-appen — den rette kategori hjælper teamet med at behandle sagen effektivt. "
        "Knappen herunder åbner formularen; du kan også henvende dig til receptionen eller Guest Relations."
    ),
    "nl": (
        "U kunt uw klacht indienen via het klachtenformulier in de Viona-app — de juiste categorie helpt ons team uw zaak efficiënt te beoordelen. "
        "De knop hieronder opent het formulier; u kunt ook de receptie of Guest Relations raadplegen."
    ),
    "cs": (
        "Stížnost můžete podat přes formulář ve aplikaci Viona — zvolte správnou kategorii, aby náš tým věc vyřídil co nejrychleji. "
        "Tlačítko níže formulář otevře; v případě potřeby kontaktujte recepci nebo Guest Relations."
    ),
    "ro": (
        "Puteți trimite reclamația prin formularul din aplicația Viona — categoria potrivită ajută echipa să analizeze eficient solicitarea. "
        "Butonul de mai jos deschide formularul; puteți apela și la recepție sau la Guest Relations."
    ),
    "sk": (
        "Sťažnosť môžete podať cez formulár v aplikácii Viona — správna kategória pomôže tímu vec vyriešiť čo najskôr. "
        "Tlačidlo nižšie otvorí formulár; v prípade potreby kontaktujte recepciu alebo Guest Relations."
    ),
}

_EARLY_CHECKIN_RECEPTION_HANDOFF_EXTRA: dict[str, str] = {
    "da": (
        "Tidlig indtjekning afhænger af belægning og rengøring på ankomstdagen. "
        "Receptionsteamet kan bekræfte muligheder og hjælpe med detaljer. "
        "Kontakt receptionen direkte eller ring — vi hjælper gerne."
    ),
    "nl": (
        "Vroege inchecken hangt af van bezetting en housekeeping op de aankomstdag. "
        "Het receptieteam helpt u graag met mogelijkheden en details. "
        "Kom langs bij de receptie of bel ons — wij helpen u graag verder."
    ),
    "cs": (
        "Dřívější check-in závisí na obsazenosti a úklidu v den příjezdu. "
        "Tým na recepci vám rád sdělí možnosti a pomůže s detaily. "
        "Zastavte se na recepci nebo zavolejte — rádi vám pomůžeme."
    ),
    "ro": (
        "Check-inul devreme depinde de gradul de ocupare și de housekeeping în ziua sosirii. "
        "Echipa de la recepție vă poate confirma opțiunile și detaliile. "
        "Treceți pe la recepție sau sunați — suntem aici să vă ajutăm."
    ),
    "sk": (
        "Skorší check-in závisí od obsadenosti a upratovania v deň príchodu. "
        "Tím na recepcii vám rád povie možnosti a pomôže s detailmi. "
        "Zastavte sa na recepcii alebo zavolajte — radi pomôžeme."
    ),
}

_LATE_CHECKOUT_GUEST_NOTIF_REDIRECT_EXTRA: dict[str, str] = {
    "da": (
        "Sen udtjekning aftales ved receptionen. "
        "Brug formularen for sen udtjekning under Forespørgsler → Gæstenotater på startskærmen. "
        "Knappen herunder åbner formularen direkte."
    ),
    "nl": (
        "Late check-out wordt geregeld aan de receptie. "
        "Gebruik het formulier voor late check-out onder Verzoeken → Gastmeldingen op het startscherm. "
        "De knop hieronder opent dit formulier direct."
    ),
    "cs": (
        "Pozdější check-out se domlouvá na recepci. "
        "Použijte formulář pro pozdější check-out v sekci Požadavky → Oznámení hosta na hlavní obrazovce. "
        "Tlačítko níže otevře tento formulář přímo."
    ),
    "ro": (
        "Check-outul târziu se stabilește la recepție. "
        "Folosiți formularul pentru check-out târziu din Cereri → Notificare oaspete pe ecranul principal. "
        "Butonul de mai jos deschide direct acest formular."
    ),
    "sk": (
        "Neskorší check-out sa dohaduje na recepcii. "
        "Použite formulár pre neskorší check-out v sekcii Požiadavky → Oznámenie hosťa na hlavnej obrazovke. "
        "Tlačidlo nižšie otvorí tento formulár priamo."
    ),
}

_ROOM_SERVICE_MODULE_HINT_EXTRA: dict[str, str] = {
    "da": (
        "Roomservice ved Kaila Beach er betalt i alle værelsestyper; den aktuelle menu og bestilling ligger udelukkende i "
        "Viona-appen under «Roomservice» — vi deler ikke lange menuer eller prislister i chatten. "
        "Receptionen hjælper gerne med tidspunkter, allergener og særlige ønsker.\n\n"
        "Åbn modulet med knappen herunder."
    ),
    "nl": (
        "Roomservice bij Kaila Beach is in elke kamercategorie betaald; het actuele menu en de bestelstroom staan uitsluitend "
        "in de Viona-app onder «Roomservice» — we plaatsen geen lange menu’s of prijslijsten in de chat. "
        "De receptie helpt u graag met timing, allergenen en persoonlijke wensen.\n\n"
        "Open de module met de knop hieronder."
    ),
    "cs": (
        "Donáška jídel a nápojů na pokoj v Kaila Beach je ve všech kategoriích pokojů placená; aktuální menu a objednávkový postup "
        "jsou výhradně v aplikaci Viona v sekci «Room service» — dlouhá menu v chatu nesdílíme. "
        "Recepce vám ráda pomůže s časem podání nebo speciálními požadavky.\n\n"
        "Modul otevřete tlačítkem níže."
    ),
    "ro": (
        "Room service la Kaila Beach este cu plată, în toate categoriile de cameră; meniul actual și fluxul de comandă "
        "sunt exclusiv în aplicația Viona la «Room service» — nu afișăm meniuri lungi sau liste de prețuri în chat. "
        "Recepția vă poate ajuta cu ora livrării, alergenii sau aranjamente personalizate.\n\n"
        "Deschideți modulul cu butonul de mai jos."
    ),
    "sk": (
        "Donáška jedla a nápojov na izbu v Kaila Beach je vo všetkých kategóriách izieb spoplatnená; aktuálne menu a postup objednania "
        "sú výhradne v aplikácii Viona v sekcii «Room service» — dlhé menu v chate nezdieľame. "
        "Recepcia vám rada pomôže s časom podania, alergénmi alebo osobitnými požiadavkami.\n\n"
        "Modul otvoríte tlačidlom nižšie."
    ),
}

# Ek UI dilleri: tam kopya İngilizce yerine ince sözlük + `get()` zinciri (da/nl→de, cs/sk→pl, ro→en, ru→en yedeği).
# Böylece selamlama / anahtar otel cümleleri «tamamen İngilizce» kalmaz; eksik anahtar anlamlı dilde devam eder.
_RU_SURFACE: dict[str, str] = {
    "chitchat_greeting": (
        "Добрый день. Я Виона — цифровой консьерж отеля Kaila Beach. Чем могу быть полезна?"
    ),
    "chitchat_assistant_intro": (
        "Я Виона, цифровой консьерж Kaila Beach Hotel. Помогу с сервисами, информацией и практическими вопросами проживания — кратко и по делу."
    ),
    "chitchat_identity_question": (
        "Я Виона, создана для Kaila Beach Hotel. Помогу с услугами отеля, проживанием и общими вопросами."
    ),
    "chitchat_thanks": "Пожалуйста. Если появятся ещё вопросы о вашем отдыхе в Kaila Beach Hotel, я рядом.",
    "chitchat_farewell": "До встречи. Когда понадобится ненавязчивая помощь — я на связи.",
    "chitchat_apology_from_user": "Всё в порядке. Продолжу с тем же вниманием.",
    "chitchat_compliment": "Благодарю за тёплые слова. Рада была быть полезной.",
    "chitchat_how_are_you": "Спасибо, у меня всё отлично. Задавайте вопросы об отеле Kaila Beach — отвечу ясно и лаконично.",
    "current_time_template": "Сейчас {time}.",
    "session_ack_after_cancel": "Поняла. Если появится ещё что-то важное — короткой фразы достаточно.",
    "fault_redirect_message": "Пожалуйста, заполните форму заявки о неисправности.",
    "complaint_redirect_message": "Пожалуйста, заполните форму жалобы.",
    "request_redirect_message": "Запрос можно отправить через форму «Запросы» в приложении.",
    "reception_fallback_message": (
        "Сейчас не удалось полностью обработать запрос. Короткая формулировка поможет — с удовольствием продолжу."
    ),
    "after_hours_reception_redirect": (
        "С 0:00 до 8:00 оперативная команда недоступна, поэтому в это время я не могу оформлять через приложение "
        "запросы, жалобы, заявки о неисправностях и уведомления гостя. Пожалуйста, обратитесь напрямую на ресепшн — "
        "коллеги помогут с вниманием и заботой."
    ),
    "canonical_fallback_safe": (
        "Проверенных данных по этому вопросу сейчас нет. Самую точную консультацию даст ресепшн отеля."
    ),
    "canonical_fallback_unavailable": "Кратковременный сбой. Пожалуйста, повторите запрос через несколько секунд.",
    "chat_fallback_validation_error": "Пустое сообщение обработать нельзя. Напишите короткий вопрос или запрос.",
    "guest_notification_policy_hint": (
        "Уведомление гостя можно отправить в чате, выбрав категорию; в следующем сообщении достаточно ключевых слов, например «глютен», «аллергия», «праздник»."
    ),
    "fault_template_with_device": (
        "Если не работает {device}, обратитесь на ресепшн — в отеле предусмотрен технический персонал."
    ),
    "fault_template_generic": "По этой неисправности обратитесь на ресепшн — в отеле предусмотрен технический персонал.",
    "complaint_form_guidance": (
        "Жалобу можно оставить через форму в приложении Viona — правильная категория помогает команде рассмотреть обращение эффективнее. "
        "Кнопка ниже открывает форму; при желании обратитесь на ресепшн или в Guest Relations."
    ),
    "early_checkin_reception_handoff": (
        "Ранний заезд зависит от загрузки и уборки в день приезда. "
        "Коллеги на ресепшне подскажут возможные варианты и помогут с деталями. "
        "Зайдите на ресепшн или позвоните — мы с радостью поможем."
    ),
    "late_checkout_guest_notif_redirect": (
        "Поздний выезд согласуется на ресепшн. "
        "Заполните форму позднего выезда в разделе «Запросы» → «Уведомления гостя» на главном экране. "
        "Кнопка ниже открывает эту форму напрямую."
    ),
    "fixed_room_service_module_hint": (
        "Обслуживание в номере в Kaila Beach — платная услуга во всех категориях номеров; актуальное меню и оформление заказа "
        "только в приложении Viona в разделе «Обслуживание номеров» — длинные меню и прайсы в чат не выкладываем. "
        "По времени подачи, аллергенам или особым пожеланиям поможет ресепшн.\n\n"
        "Откройте модуль кнопкой ниже."
    ),
}

_I18N_LOOKUP_CHAIN: dict[str, tuple[str, ...]] = {
    "tr": ("tr", "en"),
    "en": ("en", "tr"),
    "de": ("de", "en", "tr"),
    "pl": ("pl", "en", "tr"),
    "da": ("da", "de", "en", "tr"),
    "nl": ("nl", "de", "en", "tr"),
    "cs": ("cs", "pl", "en", "tr"),
    "sk": ("sk", "pl", "cs", "en", "tr"),
    "ro": ("ro", "en", "tr"),
    "ru": ("ru", "en", "tr"),
}

for _code in EXTRA_CHATBOT_UI_LANGS:
    _extra_row: dict[str, str] = {f"chitchat_switch_{_code}": _CHITCHAT_SWITCH_EXTRA_NATIVE[_code]}
    if _code in _AFTER_HOURS_EXTRA_NATIVE:
        _extra_row["after_hours_reception_redirect"] = _AFTER_HOURS_EXTRA_NATIVE[_code]
    if _code in _COMPLAINT_FORM_GUIDANCE_EXTRA_NATIVE:
        _extra_row["complaint_form_guidance"] = _COMPLAINT_FORM_GUIDANCE_EXTRA_NATIVE[_code]
    if _code in _EARLY_CHECKIN_RECEPTION_HANDOFF_EXTRA:
        _extra_row["early_checkin_reception_handoff"] = _EARLY_CHECKIN_RECEPTION_HANDOFF_EXTRA[_code]
    if _code in _LATE_CHECKOUT_GUEST_NOTIF_REDIRECT_EXTRA:
        _extra_row["late_checkout_guest_notif_redirect"] = _LATE_CHECKOUT_GUEST_NOTIF_REDIRECT_EXTRA[_code]
    if _code in _ROOM_SERVICE_MODULE_HINT_EXTRA:
        _extra_row["fixed_room_service_module_hint"] = _ROOM_SERVICE_MODULE_HINT_EXTRA[_code]
    TRANSLATIONS[_code] = _extra_row
    if _code == "ru":
        TRANSLATIONS["ru"].update(_RU_SURFACE)

inject_chat_form_strings(TRANSLATIONS)


class LocalizationService:
    def get(self, key: str, language: str) -> str:
        lang = self.normalize_lang(language)
        chain = _I18N_LOOKUP_CHAIN.get(lang, ("tr", "en"))
        for lg in chain:
            if lg not in TRANSLATIONS:
                continue
            v = TRANSLATIONS[lg].get(key)
            if v is not None and str(v).strip() != "":
                return str(v)
        return TRANSLATIONS["tr"].get(key, key)

    @staticmethod
    def normalize_lang(language: str | None) -> str:
        code = (language or "tr").strip().lower()
        if code in CHATBOT_UI_LANG_SET:
            return code
        if code in TRANSLATIONS:
            return code
        return "tr"

    def canonical_fallback(self, language: str | None, reason: str = "safe") -> str:
        lang = self.normalize_lang(language)
        reason_to_key = {
            "safe": "canonical_fallback_safe",
            "upstream_unavailable": "canonical_fallback_unavailable",
            "validation_error": "canonical_fallback_safe",
        }
        key = reason_to_key.get(reason, "canonical_fallback_safe")
        return self.get(key, lang)

