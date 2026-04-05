from typing import Dict


TRANSLATIONS: Dict[str, Dict[str, str]] = {
    "tr": {
        "chitchat_greeting": "Merhaba, ben Viona; Kaila Beach Hotel'deki dijital asistanınızım. Size nasıl yardımcı olabilirim?",
        "chitchat_assistant_intro": "Ben Viona — Kaila Beach Hotel için çalışan dijital asistanınızım. Otel hizmetleri ve sorularınızda size yardımcı olabilirim.",
        "chitchat_identity_question": "Ben Viona, Kaila Beach Hotel için tasarlanmış dijital asistanım. Otel hizmetleri, konaklama ve genel sorular konusunda yardımcı olabilirim.",
        "chitchat_thanks": "Rica ederim. Konaklamanızla ilgili başka bir konuda yardımcı olabilirim.",
        "chitchat_farewell": "Görüşmek üzere. İhtiyacınız olursa yine buradayım.",
        "chitchat_apology_from_user": "Hiç sorun değil. Size memnuniyetle yardımcı olmaya devam edebilirim.",
        "chitchat_compliment": "Nazik geri bildiriminiz için teşekkür ederim. Yardımcı olabildiysem ne mutlu bana.",
        "chitchat_how_are_you": "Teşekkür ederim, iyiyim. Kaila Beach Hotel ile ilgili sorularınızda yanınızdayım.",
        "chitchat_cancel_command_hint": (
            "«İptal» derken açık bir sohbet formu özeti, rezervasyon veya başka bir işlem mi kastediyorsunuz? "
            "Formdaysanız özet ekranında 2 = vazgeç; rezervasyon için uygulamadaki Rezervasyonlar bölümünü kullanın. "
            "Başka bir otel konusunda nasıl yardımcı olayım?"
        ),
        "chitchat_confusion_generic": "Tam olarak hangi kısmı netleştireyim? Otel bilgisi, talep, arıza veya şikayet için ne yazmanız gerektiğini söyleyebilirim.",
        "chitchat_confusion_after_form_cancel": (
            "Az önce kayıt özetini iptal etmiştiniz; bu yüzden kayıt oluşmadı. "
            "Özet ekranında 1 = onaylayıp kayıt açmak, 2 = vazgeçmek anlamına gelir. "
            "Tekrar başlamak için örneğin «priz çalışmıyor» yazabilirsiniz. "
            "Ad soyad adımında kimlikteki gibi adınızı ve soyadınızı iki kelime olarak yazmanız gerekir (ör. Ayşe Yılmaz)."
        ),
        "session_ack_after_cancel": "Anlaşıldı. Başka bir konuda yardımcı olmamı isterseniz yazabilirsiniz.",
        "session_vazgectim_after_cancel": (
            "Kayıt oluşturulmadı. İsterseniz aynı konuda yeniden sohbet formu ile ilerleyebilir veya yeni bir talep / arıza yazabilirsiniz."
        ),
        "session_reservation_followup_short": (
            "Rezervasyon iptali, değişikliği veya detayları için uygulamadaki Rezervasyonlar bölümünü kullanın. "
            "«Yarın», «iptal» gibi kısa ifadeleri burada rezervasyonunuza bağlayamıyorum; seçiminizi uygulamada netleştirmeniz gerekir."
        ),
        "session_animation_schedule_followup": (
            "Gündüz animasyon ve aktivite çizelgesi uygulamadaki «Animasyon ve etkinlikler» modülü ile otel verilerinde genelde her gün aynıdır; "
            "çoğunlukla değişen kısım akşam gösterileri ve temalı gecelerdir, bazı günler ekstra şov da olabilir. "
            "Yarın veya belirli bir akşam için net saat ve sahne bilgisini resepsiyon veya animasyon ekibinin güncel panosundan teyit etmenizi öneririm. "
            "Mini Club / Mini Disco saatleri çocuk yaş grubuna göre sınırlı olabilir."
        ),
        "chat_form_cancel_ack_fault": (
            "Tamam, bu arıza bildirimini iptal ettim. İstediğiniz zaman yeni bir arıza, talep veya misafir bildirimi oluşturabilirsiniz."
        ),
        "chat_form_cancel_ack_request": (
            "Tamam, bu talebi iptal ettim. İstediğiniz zaman yeni bir talep, arıza bildirimi veya misafir bildirimi oluşturabilirsiniz."
        ),
        "chat_form_cancel_ack_complaint": (
            "Tamam, bu şikayet kaydını iptal ettim. İstediğiniz zaman yeni bir şikayet, talep veya arıza bildirimi oluşturabilirsiniz."
        ),
        "chat_form_cancel_ack_guest_notification": (
            "Tamam, bu misafir bildirimini iptal ettim. İstediğiniz zaman yeni bir misafir bildirimi, talep veya arıza bildirimi oluşturabilirsiniz."
        ),
        "chat_form_context_retract_ack": (
            "Anladım; kayıt açmaya gerek kalmadıysa iyi oldu. Başka bir konuda — oda, yemek-içecek, aktiviteler veya resepsiyon — "
            "nasıl yardımcı olayım, kısaca yazmanız yeterli."
        ),
        "chitchat_switch_en": "I'll reply in English from now on. How can I help you?",
        "chitchat_switch_tr": "Bundan sonra Türkçe yanıtlıyorum. Size nasıl yardımcı olabilirim?",
        "chitchat_switch_de": "Ich antworte ab jetzt auf Deutsch. Wie kann ich Ihnen helfen?",
        "chitchat_switch_ru": "Далее буду отвечать по-русски. Чем могу помочь?",
        "current_time_template": "Şu an saat {time}'dir.",
        "fault_redirect_message": "Bu sorun için lütfen Arıza Talep formunu doldurunuz.",
        "complaint_redirect_message": "Bu konu için lütfen Şikayet formunu doldurunuz.",
        "request_redirect_message": "Talebinizi İstek formu üzerinden iletebilirsiniz.",
        "guest_relations_redirect_message": "Bu konu için lütfen Misafir İlişkileri departmanı ile iletişime geçiniz.",
        "reception_fallback_message": "İsteğinizi şu anda tam işleyemedim. Dilerseniz sorunuzu daha kısa şekilde tekrar yazabilirsiniz; size yardımcı olmaya devam edebilirim.",
        "canonical_fallback_safe": "Bu konuda doğrulanmış bilgiye şu anda erişemiyorum. Size en doğru destek için lütfen resepsiyon ile iletişime geçiniz.",
        "canonical_fallback_unavailable": "Şu anda asistana kısa süreli erişim sorunu yaşıyorum. Lütfen birkaç saniye sonra tekrar deneyiniz.",
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
        "request_towel": "Havlu talebinizi lütfen resepsiyon ile iletiniz.",
        "request_blanket": "Battaniye talebiniz için lütfen resepsiyon ile iletişime geçiniz.",
        "request_water": "Odaya su veya içme suyu talebiniz için lütfen resepsiyon ile iletişime geçiniz; ekip yönlendirilecektir.",
        "request_pillow": "Yastık talebiniz için lütfen resepsiyon ile iletişime geçiniz.",
        "request_housekeeping": "Oda temizliği ve housekeeping talepleriniz için resepsiyon ile iletişime geçebilirsiniz; ilgili ekip yönlendirilir.",
        "request_reception_contact": "Bu konuda en hızlı çözüm için lütfen resepsiyon ile doğrudan iletişime geçiniz.",
        "request_guest_relations_contact": "Bu konuda Misafir İlişkileri departmanı en doğru birimdir. Dilerseniz resepsiyon üzerinden de bağlantı sağlayabilirsiniz.",
        "request_transfer": "Transfer talebiniz için lütfen resepsiyon ile iletişime geçiniz; uygun planlama yapılacaktır.",
        "request_lunch_box": "Lunch Box talebi için lütfen en geç saat 20:00'ye kadar resepsiyona bilgi veriniz.",
        "request_default": "Bu talebinizi lütfen resepsiyon ile paylaşınız.",
        "reservation_early_checkin": "Erken giriş talebiniz için lütfen resepsiyon ile iletişime geçiniz.",
        "reservation_late_checkout": "Geç çıkış talebiniz için lütfen resepsiyon ile iletişime geçiniz.",
        "reservation_room_change": "Oda değişikliği talebiniz için lütfen resepsiyon ile iletişime geçiniz.",
        "reservation_default": "Rezervasyonunuzla ilgili bu durum için lütfen resepsiyon ile iletişime geçiniz.",
        "special_need_celiac": "Bu durumunuzu lütfen Misafir İlişkileri departmanına iletiniz; mutfak departmanından uygun destek sağlanabilir.",
        "special_need_vegan": "Beslenme tercihinizi lütfen Misafir İlişkileri departmanına iletiniz; uygun seçenekler konusunda yardımcı olunabilir.",
        "special_need_allergy": "Alerji bilginizi lütfen Misafir İlişkileri departmanına bildiriniz; gerekli yönlendirme sağlanacaktır.",
        "special_need_baby_need": "Bebek beslenmesi ve mama ile ilgili talebinizi lütfen Misafir İlişkileri departmanına iletiniz; uygun seçenekler konusunda yardımcı olacaklardır.",
        "special_need_accessibility_need": "Erişilebilirlik ile ilgili ihtiyacınızı lütfen Misafir İlişkileri departmanına bildiriniz; gerekli düzenlemeler sağlanacaktır.",
        "special_need_default": "Bu durum için lütfen Misafir İlişkileri departmanı ile iletişime geçiniz.",
        "guest_notification_policy_hint": "Misafir bildiriminizi sohbet üzerinden kayıt için kategori seçerek iletebilirsiniz; bir sonraki mesajınızda 'gluten', 'alerji', 'kutlama' gibi anahtar kelimeleri yazmanız da yeterlidir.",
        "fixed_restaurant_info": "- Ana Restoran: Kahvaltı 07:00-10:00, Geç kahvaltı 10:00-10:30, Öğle yemeği 12:30-14:00, Akşam yemeği 19:00-21:00, Mini gece büfesi 23:30-00:00.\n- La Terrace A La Carte: 18:30-20:30 (rezervasyonlu, ücretli).\n- Sinton BBQ: 13:00-22:00 (Pazartesi kapalı).\nSnack ve cafe:\n- Dolphin Snack 12:00-16:00\n- Beach Imbiss Snack 12:00-16:00\n- Beach Imbiss İçecek 10:00-17:00\n- Gusto Snack 11:00-18:00\n- Libum Cafe 11:00-18:00\n- Moss Beach Restaurant & Bar 10:00-19:00\nBarlar:\n- Havuz Bar 10:00-00:00\n- Dondurma Servisi 15:00-17:00\n- Lobby Bar 10:00-00:00\n- Aqua Bar 10:00-18:00 ve 20:00-23:00\n- Dolphin Bar 10:00-17:00",
        "fixed_pool_beach_info": "- Özel plaj mevcuttur.\n- Şezlong, şemsiye ve plaj havlusu ücretsizdir.\n- Plaj kullanım saatleri: 08:30-18:30.\nHavuzlar:\n- Üç açık havuz: Relax Pool 08:30-18:30, Aquapark 10:00-12:00 ve 14:00-16:00, Dolphin Pool 08:30-18:30.\n- Kapalı havuz (spa): 08:00-19:00.\n- Aquapark ve açık alanda çocuklara uygun sığ su bölgeleri bulunur.\n- Havuz ve plajda can kurtaran mevcuttur.\n- Havuz ve plaj havlusu servisi ücretsizdir.",
        "fixed_spa_info": "- La Serenite Spa kullanım saatleri: 09:00-19:00.\nÜcretsiz alanlar:\n- Sauna\n- Türk hamamı\n- Buhar odası\n- Kapalı havuz\nÜcretli hizmetler:\n- Masaj\n- Peeling\n- Cilt bakımı\n- Diğer bakım hizmetleri\nNot: Temel ıslak alan kullanımı ücretsiz, profesyonel bakım ve terapi hizmetleri ücretlidir.\n\nGüncel terapi ve bakım fiyat listesi ile paket PDF’leri sohbette uzun metin olarak verilmez; tüm premium içerik uygulamadaki «Spa & wellness» modülündedir. Modülü açmak için aşağıdaki düğmeyi kullanabilirsiniz.",
        "fixed_spa_prices_module_hint": "Spa ve profesyonel bakım fiyatları sohbette listelenmez. Güncel fiyat listesi ve paketler yalnızca uygulamadaki «Spa & wellness» modülündedir; premium içeriğe aşağıdaki düğmeyle geçebilirsiniz.",
        "fixed_restaurants_bars_module_hint": "Lobby Bar menüsü, Moss Beach Restaurant menüsü ve barlarda içecek / import içki fiyat listesi sohbette uzun metin olarak gösterilmez; güncel PDF’ler «Restaurant & barlar» modülündedir. İlgili listelere aşağıdaki düğmeyle ulaşabilirsiniz. (Genel restoran saatleri için «restoran saatleri» diye sorabilir veya aynı modüle gidebilirsiniz.)",
        "fixed_animation_info": "- Akşam akrobatik dans şovları, temalı geceler, canlı müzik, DJ performansları (bu bölüm gün ve sezona göre çeşitlenebilir; bazı günler ekstra şov eklenebilir).\n- Gündüz çizelgesi genelde sabittir; günlük program 10:00'da başlar; aqua gym, dart, su topu gibi aktiviteler içerir. Güncel metin ve saatler uygulamadaki «Animasyon ve etkinlikler» modülündedir.\nÇocuk aktiviteleri:\n- Jammies Kids Club / Mini Club: 10:00-12:30 ve 14:30-17:00 (4-12 yaş)\n- Mini Disco: 20:45-21:00 (4-12 yaş)\n- Çocuk oyun parkı: 07:00-21:00\nNot: Akşam programı ve özel gösteriler güne göre farklılık gösterebilir; kesin bilgi için resepsiyon veya animasyon panosunu kontrol ediniz.",
        "fixed_outside_hotel_info": "Otel dışı öneriler için en güncel ve güvenli bilgi resepsiyondadır. Alanya merkez yaklaşık 3 km mesafededir; taksi ve toplu taşıma seçenekleri mevcuttur.",
        "fixed_alanya_discover_intro": "Alanya, Akdeniz kıyısında denizi, kalesi ve tarihi dokusuyla öne çıkan bir tatil kentidir. Gezginler için sık sorulan başlıca duraklar:\n\n• Kleopatra Plajı — ince kum ve berrak deniz\n• Kızıl Kule ve liman — şehrin simgesi\n• Alanya Kalesi — tepeden panoramik manzara; gün batımı çok beğenilir\n• Dim Çayı ve mesire alanları (iç kesim)\n\nOtelimiz Obagöl'de; şehir merkezine yaklaşık 3 km. Ulaşım için taksi ve toplu taşıma pratik seçeneklerdir. Güncel saatler, biletli alanlar ve özel turlar için resepsiyon en güvenilir kaynaktır.\n\nAşağıdaki düğmeyle uygulamadaki «Alanya'yı keşfedin» bölümünü açarak kısa metinler ve görsellerle bu noktaları inceleyebilirsiniz.",
        "fixed_ice_cream_info": "Evet, otelde dondurma servisi vardır. Dondurma servisi Havuz Bar'da 15:00-17:00 saatleri arasında ücretsiz sunulmaktadır. (Sezon ve operasyon takvimine göre değişiklik olabilir.)",
        "fixed_laundry_dry_cleaning_info": "Çamaşırhane, kuru temizleme ve ütü hizmetleri otelde ücretli olarak sunulur. Teslim alma, süre ve güncel ücretler için lütfen resepsiyon veya housekeeping ile iletişime geçiniz; giysilerinizi ve talebinizi oradan iletebilirsiniz.",
        "hotel_info_soft_followup_towel": (
            "Yukarıdaki saat ve kart bilgisi plaj/havuz havlusuna aittir; bu havlular havuz veya plaj noktasından verilir. "
            "Oda banyo havlusu bunlardan farklıdır, birbirinin yerine geçmez."
        ),
    },
    "en": {
        "chitchat_greeting": "Hello, I'm Viona, your digital assistant at Kaila Beach Hotel. How can I help you?",
        "chitchat_assistant_intro": "I'm Viona, the digital assistant for Kaila Beach Hotel. I can help you with hotel services, information and practical questions during your stay.",
        "chitchat_identity_question": "I'm Viona, the digital assistant for Kaila Beach Hotel. I can help with hotel services, stay-related questions, and general information.",
        "chitchat_thanks": "You're very welcome. I'm here if you need any help with your stay at Kaila Beach Hotel.",
        "chitchat_farewell": "See you. I'm here whenever you need help during your stay.",
        "chitchat_apology_from_user": "No worries at all. I'm happy to keep helping you.",
        "chitchat_compliment": "Thank you for your kind words. Glad I could help.",
        "chitchat_how_are_you": "I'm doing well, thank you. I'm here to help with anything about Kaila Beach Hotel.",
        "chitchat_cancel_command_hint": (
            "When you say “cancel”, do you mean a chat form summary, a reservation, or something else? "
            "On the form summary, 2 means cancel; for bookings, use the Reservations section in the app. "
            "What else can I help you with at the hotel?"
        ),
        "chitchat_confusion_generic": "Which part should I clarify? I can explain what to type for hotel information, a request, a fault report, or a complaint.",
        "chitchat_confusion_after_form_cancel": (
            "You had just cancelled the summary screen, so no record was created. "
            "On that screen, 1 means confirm and open the record, 2 means cancel. "
            "To start again, you can type something like “socket not working”. "
            "For full name, please type your first and last name as on your ID (two words, e.g. Jane Smith)."
        ),
        "session_ack_after_cancel": "Understood. Tell me if you need help with anything else.",
        "session_vazgectim_after_cancel": (
            "No record was created. You can start the chat form again for the same topic or type a new request or fault report."
        ),
        "session_reservation_followup_short": (
            "For cancellation, changes, or reservation details, please use the Reservations section in the app. "
            "Short replies like “tomorrow” or “cancel” cannot be linked to your booking here—please complete the steps in the app."
        ),
        "session_animation_schedule_followup": (
            "The daytime animation and activity schedule in the app’s «Animation & events» section and hotel information is usually the same every day; "
            "what tends to change is the evening shows and themed nights, and some days there may be an extra performance. "
            "For exact times for tomorrow or a specific evening, please confirm on the latest board at reception or with the animation team. "
            "Mini Club / Mini Disco hours may vary by children’s age group."
        ),
        "chat_form_cancel_ack_fault": (
            "Okay, I have cancelled this fault report. You can start a new fault report, request, or guest notification anytime."
        ),
        "chat_form_cancel_ack_request": (
            "Okay, I have cancelled this request. You can start a new request, fault report, or guest notification anytime."
        ),
        "chat_form_cancel_ack_complaint": (
            "Okay, I have cancelled this complaint. You can start a new complaint, request, or fault report anytime."
        ),
        "chat_form_cancel_ack_guest_notification": (
            "Okay, I have cancelled this guest notification. You can start a new guest notification, request, or fault report anytime."
        ),
        "chat_form_context_retract_ack": (
            "Understood — if no record is needed, that’s good news. Tell me in a few words how else I can help: your room, dining, "
            "activities, or reception."
        ),
        "chitchat_switch_en": "I'll reply in English from now on. How can I help you?",
        "chitchat_switch_tr": "Bundan sonra Türkçe yanıtlıyorum. Size nasıl yardımcı olabilirim?",
        "chitchat_switch_de": "Ich antworte ab jetzt auf Deutsch. Wie kann ich Ihnen helfen?",
        "chitchat_switch_ru": "Далее буду отвечать по-русски. Чем могу помочь?",
        "current_time_template": "The current time is {time}.",
        "fault_redirect_message": "For this issue, please complete the Fault Report form.",
        "complaint_redirect_message": "For this matter, please complete the Complaint form.",
        "request_redirect_message": "You can submit your request through the Request form.",
        "guest_relations_redirect_message": "For this matter, please contact the Guest Relations department.",
        "reception_fallback_message": "I couldn't fully process that right now. You can try asking again in a shorter way, and I'll keep helping.",
        "canonical_fallback_safe": "I do not have verified information on this right now. For the most accurate assistance, please contact reception.",
        "canonical_fallback_unavailable": "I am temporarily unavailable at the moment. Please try again in a few seconds.",
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
        "request_towel": "Please contact reception for your towel request.",
        "request_blanket": "Please contact reception for your blanket request.",
        "request_water": "For water or drinking water to your room, please contact reception; the team will arrange delivery.",
        "request_pillow": "Please contact reception for your pillow request.",
        "request_housekeeping": "For room cleaning and housekeeping requests, please contact reception; the relevant team will be arranged.",
        "request_reception_contact": "For the fastest resolution, please contact reception directly.",
        "request_guest_relations_contact": "For this matter, Guest Relations is the right department. You may also connect through reception.",
        "request_transfer": "For transfer arrangements, please contact reception and the team will assist you.",
        "request_lunch_box": "For a Lunch Box request, please inform reception no later than 20:00.",
        "request_default": "Please share this request with reception.",
        "reservation_early_checkin": "Please contact reception for your early check-in request.",
        "reservation_late_checkout": "Please contact reception for your late check-out request.",
        "reservation_room_change": "Please contact reception for your room change request.",
        "reservation_default": "Please contact reception regarding your reservation request.",
        "special_need_celiac": "Please inform the Guest Relations department about this condition; suitable support can be coordinated with the kitchen.",
        "special_need_vegan": "Please inform the Guest Relations department about your dietary preference; suitable options may be arranged.",
        "special_need_allergy": "Please inform the Guest Relations department about your allergy; necessary guidance will be provided.",
        "special_need_baby_need": "Please contact the Guest Relations department about your baby food needs; they can help arrange suitable options.",
        "special_need_accessibility_need": "Please inform the Guest Relations department about your accessibility needs; the necessary arrangements will be made.",
        "special_need_default": "Please contact the Guest Relations department for this matter.",
        "guest_notification_policy_hint": "You can submit a guest notification via chat by choosing a category; you may also type keywords like gluten, allergy, or celebration in your next message.",
        "fixed_restaurant_info": "- Main Restaurant: Breakfast 07:00-10:00, Late breakfast 10:00-10:30, Lunch 12:30-14:00, Dinner 19:00-21:00, Mini night buffet 23:30-00:00.\n- La Terrace A La Carte: 18:30-20:30 (reservation required, paid).\n- Sinton BBQ: 13:00-22:00 (closed Mondays).\nSnack and cafe:\n- Dolphin Snack 12:00-16:00\n- Beach Imbiss Snack 12:00-16:00\n- Beach Imbiss Drinks 10:00-17:00\n- Gusto Snack 11:00-18:00\n- Libum Cafe 11:00-18:00\n- Moss Beach Restaurant & Bar 10:00-19:00\nBars:\n- Pool Bar 10:00-00:00\n- Ice Cream Service 15:00-17:00\n- Lobby Bar 10:00-00:00\n- Aqua Bar 10:00-18:00 and 20:00-23:00\n- Dolphin Bar 10:00-17:00",
        "fixed_pool_beach_info": "- Private beach available.\n- Sunbeds, umbrellas, and beach towels are free.\n- Beach usage hours: 08:30-18:30.\nPools:\n- Three outdoor pools: Relax Pool 08:30-18:30, Aquapark 10:00-12:00 and 14:00-16:00, Dolphin Pool 08:30-18:30.\n- Indoor pool (spa): 08:00-19:00.\n- Shallow areas for children are in the outdoor / aquapark zone.\n- Lifeguards are present at the pools and on the sea.\n- Pool and beach towel service is free.",
        "fixed_spa_info": "- La Serenite Spa hours: 09:00-19:00.\nFree areas:\n- Sauna\n- Turkish bath\n- Steam room\n- Indoor pool\nPaid services:\n- Massage\n- Peeling\n- Skin care\n- Other treatment services\nNote: Basic wet-area use is free; professional care and therapy services are paid.\n\nTreatment menus and price lists are not shared as long text in chat; the up-to-date PDFs live in the in-app «Spa & wellness» section. Use the button below to open that page.",
        "fixed_spa_prices_module_hint": "Spa treatment prices are not listed in chat. The current price list and packages are only in the «Spa & wellness» module — use the button below for the premium content.",
        "fixed_restaurants_bars_module_hint": "The Lobby Bar menu, Moss Beach Restaurant menu, and bar drink / imported spirits price lists are not shown as long text in chat; up-to-date PDFs are in «Restaurants & bars». Open that section with the button below. (For general outlet hours you can still ask for «restaurant hours» or use the same module.)",
        "fixed_animation_info": "- Evening acrobatic dance shows, themed nights, live music, and DJ performances (this part can vary by day and season; some days may include an extra show).\n- The daytime schedule is generally stable: the daily program starts at 10:00 with aqua gym, darts, and water polo. The latest wording and times are in the in-app «Animation & events» section.\nChildren’s activities:\n- Jammies Kids Club / Mini Club: 10:00-12:30 and 14:30-17:00 (ages 4-12)\n- Mini Disco: 20:45-21:00 (ages 4-12)\n- Children’s playground: 07:00-21:00\nNote: Evening line-ups and special shows may differ by day; please check reception or the animation board for the exact programme.",
        "fixed_outside_hotel_info": "For outside-hotel suggestions, reception provides the most up-to-date and safe guidance. Alanya city center is about 3 km away, and taxi/public transport options are available.",
        "fixed_alanya_discover_intro": "Alanya is a lively Mediterranean resort known for its seafront, castle and historic character. Highlights many guests enjoy:\n\n• Kleopatra Beach — fine sand and clear water\n• Red Tower and harbour — an iconic landmark\n• Alanya Castle — panoramic views from the hill; sunsets are memorable\n• Dim River picnic area inland\n\nOur hotel is in Obagöl, about 3 km from the city centre. Taxis and public transport are practical. For opening hours, ticketed sites and organised tours, reception is the safest source of up-to-date advice.\n\nUse the button below to open the in-app «Discover Alanya» section with short descriptions and images.",
        "fixed_ice_cream_info": "Yes, the hotel offers an ice cream service. It is served complimentary at the Pool Bar between 15:00 and 17:00. (Hours may vary by season and operations.)",
        "fixed_laundry_dry_cleaning_info": "Laundry, dry cleaning, and ironing are available at the hotel as paid services. Please contact reception or housekeeping for drop-off, turnaround, and current prices; they will handle your items and request.",
        "hotel_info_soft_followup_towel": (
            "The hours and card rules above refer to pool/beach towels issued at the pool/beach desk. "
            "Those are not the same as the bathroom towels in your room."
        ),
    },
    "de": {
        "chitchat_greeting": "Hallo, ich bin Viona, Ihre digitale Assistentin im Kaila Beach Hotel. Wie kann ich Ihnen helfen?",
        "chitchat_assistant_intro": "Ich bin Viona, die digitale Assistentin des Kaila Beach Hotels. Ich unterstütze Sie bei Services, Informationen und Fragen rund um Ihren Aufenthalt.",
        "chitchat_identity_question": "Ich bin Viona, die digitale Assistentin des Kaila Beach Hotel. Ich helfe Ihnen gern bei Fragen zu Hotelservices und Ihrem Aufenthalt.",
        "chitchat_thanks": "Gern geschehen. Wenn Sie noch Fragen zu Ihrem Aufenthalt haben, helfe ich Ihnen gern weiter.",
        "chitchat_farewell": "Auf Wiedersehen. Ich bin jederzeit für Sie da, wenn Sie Hilfe brauchen.",
        "chitchat_apology_from_user": "Kein Problem. Ich helfe Ihnen gern weiter.",
        "chitchat_compliment": "Vielen Dank für Ihr nettes Feedback. Es freut mich, dass ich helfen konnte.",
        "chitchat_how_are_you": "Danke, mir geht es gut. Ich unterstütze Sie gern bei Fragen rund um das Kaila Beach Hotel.",
        "chitchat_cancel_command_hint": (
            "Meinen Sie mit „Abbrechen“ eine Chat-Formularzusammenfassung, eine Reservierung oder etwas anderes? "
            "Auf der Zusammenfassung bedeutet 2 Abbrechen; für Buchungen nutzen Sie den Bereich Reservierungen in der App. "
            "Wobei darf ich sonst im Hotel helfen?"
        ),
        "chitchat_confusion_generic": "Welchen Teil soll ich erklären? Ich kann sagen, was Sie für Hotelinfos, eine Anfrage, eine Störung oder eine Beschwerde schreiben können.",
        "chitchat_confusion_after_form_cancel": (
            "Sie hatten die Zusammenfassung gerade abgebrochen; deshalb wurde kein Eintrag erstellt. "
            "Auf diesem Bildschirm bedeutet 1 Bestätigen und Eintrag anlegen, 2 Abbrechen. "
            "Um neu zu starten, können Sie z. B. „Steckdose funktioniert nicht“ schreiben. "
            "Bitte geben Sie Vor- und Nachnamen wie im Ausweis an (zwei Wörter, z. B. Anna Müller)."
        ),
        "session_ack_after_cancel": "Alles klar. Schreiben Sie gern, wenn Sie noch etwas brauchen.",
        "session_vazgectim_after_cancel": (
            "Es wurde kein Eintrag erstellt. Sie können den Chat-Flow erneut starten oder eine neue Anfrage bzw. Störungsmeldung schreiben."
        ),
        "session_reservation_followup_short": (
            "Für Stornierung, Änderungen oder Reservierungsdetails nutzen Sie bitte den Bereich Reservierungen in der App. "
            "Kurze Antworten wie „morgen“ oder „stornieren“ kann ich hier nicht Ihrer Buchung zuordnen—bitte dort auswählen."
        ),
        "session_animation_schedule_followup": (
            "Der Tagesplan für Animation und Aktivitäten in der App unter «Animation & Veranstaltungen» und in den Hotelinformationen ist in der Regel täglich gleich; "
            "häufiger ändern sich die Abendshows und Themenabende, und an manchen Tagen gibt es zusätzliche Shows. "
            "Für morgen oder einen bestimmten Abend bestätigen Sie bitte die genauen Zeiten an der aktuellen Tafel an der Rezeption oder beim Animationsteam. "
            "Mini Club / Mini Disco können je nach Altersgruppe der Kinder abweichen."
        ),
        "chat_form_cancel_ack_fault": (
            "In Ordnung, ich habe diese Störungsmeldung storniert. Sie können jederzeit eine neue Störungsmeldung, Anfrage oder Gästemeldung starten."
        ),
        "chat_form_cancel_ack_request": (
            "In Ordnung, ich habe diese Anfrage storniert. Sie können jederzeit eine neue Anfrage, Störungsmeldung oder Gästemeldung starten."
        ),
        "chat_form_cancel_ack_complaint": (
            "In Ordnung, ich habe diese Beschwerde storniert. Sie können jederzeit eine neue Beschwerde, Anfrage oder Störungsmeldung starten."
        ),
        "chat_form_cancel_ack_guest_notification": (
            "In Ordnung, ich habe diese Gästemeldung storniert. Sie können jederzeit eine neue Gästemeldung, Anfrage oder Störungsmeldung starten."
        ),
        "chat_form_context_retract_ack": (
            "Alles klar — wenn kein Eintrag nötig ist, freut mich das. Schreiben Sie kurz, womit ich sonst helfen darf: Zimmer, "
            "Essen & Trinken, Aktivitäten oder Rezeption."
        ),
        "chitchat_switch_en": "I'll reply in English from now on. How can I help you?",
        "chitchat_switch_tr": "Bundan sonra Türkçe yanıtlıyorum. Size nasıl yardımcı olabilirim?",
        "chitchat_switch_de": "Ich antworte ab jetzt auf Deutsch. Wie kann ich Ihnen helfen?",
        "chitchat_switch_ru": "Далее буду отвечать по-русски. Чем могу помочь?",
        "current_time_template": "Die aktuelle Zeit ist {time}.",
        "fault_redirect_message": "Bitte füllen Sie für dieses Problem das Störungsmeldungsformular aus.",
        "complaint_redirect_message": "Bitte füllen Sie für dieses Thema das Beschwerdeformular aus.",
        "request_redirect_message": "Sie können Ihre Anfrage über das Anfrageformular senden.",
        "guest_relations_redirect_message": "Bitte wenden Sie sich für dieses Thema an die Gästebetreuung.",
        "reception_fallback_message": "Ich konnte Ihre Anfrage gerade nicht vollständig verarbeiten. Versuchen Sie es gern noch einmal in kürzerer Form.",
        "canonical_fallback_safe": "Ich kann dazu derzeit keine verifizierten Informationen bereitstellen. Bitte wenden Sie sich für die sicherste Auskunft an die Rezeption.",
        "canonical_fallback_unavailable": "Ich bin momentan kurzzeitig nicht erreichbar. Bitte versuchen Sie es in wenigen Sekunden erneut.",
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
        "request_towel": "Bitte wenden Sie sich für Ihre Handtuchanfrage an die Rezeption.",
        "request_blanket": "Bitte wenden Sie sich für Ihre Deckenanfrage an die Rezeption.",
        "request_water": "Für Wasser oder Trinkwasser aufs Zimmer wenden Sie sich bitte an die Rezeption; das Team organisiert die Zustellung.",
        "request_pillow": "Bitte wenden Sie sich für Ihre Kissenanfrage an die Rezeption.",
        "request_housekeeping": "Für Zimmerreinigung und Housekeeping-Anfragen wenden Sie sich bitte an die Rezeption; das zuständige Team wird informiert.",
        "request_reception_contact": "Für die schnellste Lösung wenden Sie sich bitte direkt an die Rezeption.",
        "request_guest_relations_contact": "Für dieses Anliegen ist die Gästebetreuung die richtige Stelle. Auf Wunsch kann die Rezeption ebenfalls verbinden.",
        "request_transfer": "Für Transferanfragen wenden Sie sich bitte an die Rezeption; die Planung wird dort koordiniert.",
        "request_lunch_box": "Für eine Lunch-Box-Anfrage informieren Sie bitte die Rezeption spätestens bis 20:00 Uhr.",
        "request_default": "Bitte teilen Sie diese Anfrage der Rezeption mit.",
        "reservation_early_checkin": "Bitte wenden Sie sich für Ihre Bitte um frühen Check-in an die Rezeption.",
        "reservation_late_checkout": "Bitte wenden Sie sich für Ihre Bitte um späten Check-out an die Rezeption.",
        "reservation_room_change": "Bitte wenden Sie sich für Ihren Zimmerwechsel an die Rezeption.",
        "reservation_default": "Bitte wenden Sie sich bezüglich Ihrer Reservierung an die Rezeption.",
        "special_need_celiac": "Bitte informieren Sie die Gästebetreuung über diese Situation; geeignete Unterstützung kann mit der Küche koordiniert werden.",
        "special_need_vegan": "Bitte informieren Sie die Gästebetreuung über Ihre Ernährungspräferenz; passende Optionen können angeboten werden.",
        "special_need_allergy": "Bitte informieren Sie die Gästebetreuung über Ihre Allergie; die notwendige Unterstützung wird bereitgestellt.",
        "special_need_baby_need": "Bitte wenden Sie sich an die Gästebetreuung bezüglich Ihres Bedarfs an Babynahrung; geeignete Optionen können organisiert werden.",
        "special_need_accessibility_need": "Bitte informieren Sie die Gästebetreuung über Ihre Bedürfnisse im Bereich Barrierefreiheit; die notwendigen Vorkehrungen werden getroffen.",
        "special_need_default": "Bitte wenden Sie sich in diesem Fall an die Gästebetreuung.",
        "guest_notification_policy_hint": "Sie können eine Gästemeldung im Chat per Kategorie senden; schreiben Sie z. B. Gluten, Allergie oder Feier in Ihrer nächsten Nachricht.",
        "fixed_restaurant_info": "- Hauptrestaurant: Frühstück 07:00-10:00, Spätfrühstück 10:00-10:30, Mittagessen 12:30-14:00, Abendessen 19:00-21:00, Mini-Nachtbuffet 23:30-00:00.\n- La Terrace A La Carte: 18:30-20:30 (reservierungspflichtig, kostenpflichtig).\n- Sinton BBQ: 13:00-22:00 (montags geschlossen).\nSnack und Cafe:\n- Dolphin Snack 12:00-16:00\n- Beach Imbiss Snack 12:00-16:00\n- Beach Imbiss Getränke 10:00-17:00\n- Gusto Snack 11:00-18:00\n- Libum Cafe 11:00-18:00\n- Moss Beach Restaurant & Bar 10:00-19:00\nBars:\n- Pool Bar 10:00-00:00\n- Eis-Service 15:00-17:00\n- Lobby Bar 10:00-00:00\n- Aqua Bar 10:00-18:00 und 20:00-23:00\n- Dolphin Bar 10:00-17:00",
        "fixed_pool_beach_info": "- Privater Strand ist vorhanden.\n- Liegen, Sonnenschirme und Strandhandtücher sind kostenlos.\n- Strandnutzung: 08:30-18:30.\nPools:\n- Drei Außenbecken: Relax Pool 08:30-18:30, Aquapark 10:00-12:00 und 14:00-16:00, Dolphin Pool 08:30-18:30.\n- Hallenbad (Spa): 08:00-19:00.\n- Flache Kinderbereiche im Außen- und Aquaparkbereich.\n- Rettungsschwimmer an Pools und am Meer.\n- Handtuchservice für Pool und Strand ist kostenlos.",
        "fixed_spa_info": "- Öffnungszeiten La Serenite Spa: 09:00-19:00.\nKostenlose Bereiche:\n- Sauna\n- Türkisches Bad\n- Dampfbad\n- Hallenbad\nKostenpflichtige Leistungen:\n- Massage\n- Peeling\n- Hautpflege\n- Weitere Behandlungen\nHinweis: Grundnutzung der Nassbereiche ist kostenlos; professionelle Pflege- und Therapieleistungen sind kostenpflichtig.\n\nAktuelle Preislisten und Behandlungs-PDFs werden im Chat nicht als langer Text ausgegeben; die Premium-Inhalte finden Sie im App-Bereich «Spa & Wellness». Öffnen Sie die Seite über die Schaltfläche unten.",
        "fixed_spa_prices_module_hint": "Spa- und Anwendungspreise werden im Chat nicht aufgelistet. Die aktuelle Preisliste und Pakete stehen nur im Modul «Spa & Wellness» — bitte nutzen Sie die Schaltfläche unten.",
        "fixed_restaurants_bars_module_hint": "Lobby-Bar-Speisekarte, Moss-Restaurant-Speisekarte und Getränke-/Importspirituosen-Preislisten der Bars werden im Chat nicht als langer Text gezeigt; aktuelle PDFs liegen unter «Restaurants & Bars». Bitte öffnen Sie den Bereich über die Schaltfläche unten. (Allgemeine Öffnungszeiten können Sie weiterhin mit «Restaurantzeiten» erfragen oder im selben Modul einsehen.)",
        "fixed_animation_info": "- Abendliche Akrobatik-Tanzshows, Themenabende, Live-Musik und DJ-Performances (dieser Teil kann je nach Tag und Saison wechseln; an manchen Tagen gibt es Zusatzshows).\n- Der Tagesablauf ist in der Regel stabil: Start um 10:00 mit Aqua Gym, Dart und Wasserball. Aktuelle Texte und Zeiten finden Sie in der App unter «Animation & Veranstaltungen».\nKinderaktivitäten:\n- Jammies Kids Club / Mini Club: 10:00-12:30 und 14:30-17:00 (4-12 Jahre)\n- Mini Disco: 20:45-21:00 (4-12 Jahre)\n- Kinderspielplatz: 07:00-21:00\nHinweis: Abendprogramm und Zusatzshows können täglich abweichen; genaue Auskunft an der Rezeption oder an der Animationstafel.",
        "fixed_outside_hotel_info": "Für Empfehlungen außerhalb des Hotels wenden Sie sich bitte an die Rezeption; dort erhalten Sie die aktuellsten und sichersten Informationen. Das Zentrum von Alanya ist etwa 3 km entfernt; Taxi- und ÖPNV-Optionen sind verfügbar.",
        "fixed_alanya_discover_intro": "Alanya ist ein lebendiges Mittelmeerziel mit Strand, Burg und historischem Flair. Beliebte Stationen:\n\n• Kleopatra-Strand — feiner Sand, klares Wasser\n• Roter Turm und Hafen — Wahrzeichen der Stadt\n• Burg von Alanya — Panoramablick; Sonnenuntergänge sind eindrucksvoll\n• Dim-Çayı und Picknickbereiche landeinwärts\n\nUnser Hotel liegt in Obagöl, etwa 3 km vom Zentrum. Taxi und ÖPNV sind praktisch. Für Öffnungszeiten, Eintritte und organisierte Ausflüge ist die Rezeption die zuverlässigste Anlaufstelle.\n\nMit der Schaltfläche unten öffnen Sie die App-Rubrik «Alanya entdecken» mit Kurztexten und Bildern.",
        "fixed_ice_cream_info": "Ja, im Hotel gibt es einen Eis-Service. Er wird kostenlos an der Pool Bar zwischen 15:00 und 17:00 Uhr angeboten. (Zeiten können je nach Saison und Betrieb variieren.)",
        "fixed_laundry_dry_cleaning_info": "Wäscherei, chemische Reinigung und Bügelservice werden im Hotel kostenpflichtig angeboten. Bitte wenden Sie sich für Annahme, Bearbeitungszeit und aktuelle Preise an die Rezeption oder das Housekeeping.",
        "hotel_info_soft_followup_towel": (
            "Die genannten Zeiten und Kartenregeln gelten für Pool-/Strandhandtücher an der Ausgabe. "
            "Das sind nicht die Badetücher auf dem Zimmer."
        ),
    },
    "ru": {
        "chitchat_greeting": "Здравствуйте! Я Виона, ваш цифровой ассистент в отеле Kaila Beach. Чем могу помочь?",
        "chitchat_assistant_intro": "Я Виона, цифровой ассистент отеля Kaila Beach. Помогу с услугами отеля, информацией и вопросами во время вашего проживания.",
        "chitchat_identity_question": "Я Viona, цифровой помощник Kaila Beach Hotel. Я могу помочь с услугами отеля, проживанием и общими вопросами.",
        "chitchat_thanks": "Пожалуйста. Если у вас будут ещё вопросы по отелю или проживанию, я помогу.",
        "chitchat_farewell": "До встречи. Если понадобится помощь, я рядом.",
        "chitchat_apology_from_user": "Ничего страшного. Я с удовольствием продолжу помогать вам.",
        "chitchat_compliment": "Спасибо за тёплые слова. Рада, что смогла помочь.",
        "chitchat_how_are_you": "Спасибо, у меня всё хорошо. Я рядом, чтобы помочь с вопросами по Kaila Beach Hotel.",
        "chitchat_cancel_command_hint": (
            "Вы имеете в виду отмену сводки чат-формы, бронирование или что-то другое? "
            "На экране сводки 2 — отмена; для бронирований используйте раздел «Бронирования» в приложении. "
            "Чем ещё помочь по отелю?"
        ),
        "chitchat_confusion_generic": "Что именно пояснить? Могу подсказать, что написать про отель, запрос, неисправность или жалобу.",
        "chitchat_confusion_after_form_cancel": (
            "Вы только что отменили экран с итогом — запись не создана. "
            "Там 1 означает подтвердить и создать заявку, 2 — отменить. "
            "Чтобы начать снова, напишите, например: «розетка не работает». "
            "В поле имени укажите имя и фамилию как в документе (два слова, например Анна Иванова)."
        ),
        "session_ack_after_cancel": "Поняла. Если нужна ещё помощь — напишите.",
        "session_vazgectim_after_cancel": (
            "Запись не создана. Можно снова пройти форму в чате или написать новый запрос / сообщить о неисправности."
        ),
        "session_reservation_followup_short": (
            "Для отмены, изменений и деталей бронирования откройте раздел «Бронирования» в приложении. "
            "Короткие фразы вроде «завтра» или «отмена» здесь нельзя привязать к вашей брони — уточните выбор в приложении."
        ),
        "session_animation_schedule_followup": (
            "Дневное расписание анимации и активностей в приложении в разделе «Анимация и мероприятия» и в данных отеля обычно одинаковое изо дня в день; "
            "чаще меняются вечерние шоу и тематические вечера, в отдельные дни возможны дополнительные представления. "
            "Точное время на завтра или на конкретный вечер лучше уточнить на актуальном стенде у ресепшена или у команды анимации. "
            "Часы Mini Club / Mini Disco могут зависеть от возрастной группы детей."
        ),
        "chat_form_cancel_ack_fault": (
            "Хорошо, я отменила это сообщение о неисправности. Вы можете в любое время создать новое сообщение о неисправности, запрос или уведомление для отеля."
        ),
        "chat_form_cancel_ack_request": (
            "Хорошо, я отменила этот запрос. Вы можете в любое время создать новый запрос, сообщение о неисправности или уведомление для отеля."
        ),
        "chat_form_cancel_ack_complaint": (
            "Хорошо, я отменила эту жалобу. Вы можете в любое время создать новую жалобу, запрос или сообщение о неисправности."
        ),
        "chat_form_cancel_ack_guest_notification": (
            "Хорошо, я отменила это уведомление для отеля. Вы можете в любое время создать новое уведомление, запрос или сообщение о неисправности."
        ),
        "chat_form_context_retract_ack": (
            "Поняла — если запись не нужна, это хорошо. Напишите коротко, чем ещё помочь: номер, еда и напитки, мероприятия или ресепшн."
        ),
        "chitchat_switch_en": "I'll reply in English from now on. How can I help you?",
        "chitchat_switch_tr": "Bundan sonra Türkçe yanıtlıyorum. Size nasıl yardımcı olabilirim?",
        "chitchat_switch_de": "Ich antworte ab jetzt auf Deutsch. Wie kann ich Ihnen helfen?",
        "chitchat_switch_ru": "Далее буду отвечать по-русски. Чем могу помочь?",
        "current_time_template": "Текущее время: {time}.",
        "fault_redirect_message": "По этой проблеме, пожалуйста, заполните форму заявки о неисправности.",
        "complaint_redirect_message": "По этому вопросу, пожалуйста, заполните форму жалобы.",
        "request_redirect_message": "Вы можете отправить запрос через форму запроса.",
        "guest_relations_redirect_message": "По этому вопросу, пожалуйста, свяжитесь со службой по работе с гостями.",
        "reception_fallback_message": "Сейчас я не смогла полностью обработать ваш запрос. Попробуйте, пожалуйста, написать его короче, и я продолжу помогать.",
        "canonical_fallback_safe": "Сейчас у меня нет подтвержденной информации по этому вопросу. Для наиболее точной помощи, пожалуйста, обратитесь на ресепшн.",
        "canonical_fallback_unavailable": "Сейчас я временно недоступна. Пожалуйста, попробуйте снова через несколько секунд.",
        "recommendation_fish": "Рыбу и морепродукты можно заказать в Moss Beach Restaurant & Bar на пляже (платное à la carte) и в основном ресторане. Для La Terrace A La Carte нужна предварительная бронь.",
        "recommendation_meat": "Если вы предпочитаете мясо или BBQ, Sinton BBQ Restaurant отлично подойдет. Для a la carte ресторанов требуется бронирование.",
        "recommendation_pizza_snack": "Для пиццы и закусок подойдут Dolphin Snack, Gusto Snack и Beach Imbiss.",
        "recommendation_coffee_dessert": "Для кофе и десертов лучше всего подойдут Libum Cafe и Lobby Bar.",
        "recommendation_kids_activity": "Для детей основными вариантами являются Mini Club, Mini Disco и детская игровая площадка.",
        "recommendation_romantic_dinner": "Для романтического вечера подойдут La Terrace A La Carte или Moss Beach Restaurant & Bar на берегу; для à la carte рекомендуется бронь.",
        "recommendation_general_dining": "Если сложно выбрать, на ужин подойдут Sinton BBQ или основной ресторан; для быстрого перекуса — Dolphin Snack и Gusto Snack.",
        "fault_template_with_device": "В случае неисправности ({device}) пожалуйста, обратитесь на ресепшн; в отеле предоставляется техническая поддержка.",
        "fault_template_generic": "При этой неисправности, пожалуйста, обратитесь на ресепшн; в отеле предоставляется техническая поддержка.",
        "complaint_noise": "Пожалуйста, сначала сообщите об этой жалобе в службу по работе с гостями. При необходимости поможет и ресепшн.",
        "complaint_cleanliness": "Пожалуйста, сначала сообщите о проблеме с чистотой в службу по работе с гостями; ресепшн также может помочь.",
        "complaint_default": "По этой жалобе, пожалуйста, сначала обратитесь в службу по работе с гостями. Также можно передать через ресепшн.",
        "request_towel": "Пожалуйста, обратитесь на ресепшн по вопросу полотенца.",
        "request_blanket": "Пожалуйста, обратитесь на ресепшн по вопросу одеяла.",
        "request_water": "Чтобы привезли воду или питьевую воду в номер, обратитесь на ресепшн; команда организует доставку.",
        "request_pillow": "Пожалуйста, обратитесь на ресепшн по вопросу подушки.",
        "request_housekeeping": "По вопросам уборки и housekeeping, пожалуйста, обратитесь на ресепшн; нужная команда будет направлена.",
        "request_reception_contact": "Для самого быстрого решения, пожалуйста, свяжитесь с ресепшн напрямую.",
        "request_guest_relations_contact": "По этому вопросу наиболее подходящий отдел — служба по работе с гостями. Также можно обратиться через ресепшн.",
        "request_transfer": "По вопросам трансфера, пожалуйста, обратитесь на ресепшн; они помогут с организацией.",
        "request_lunch_box": "Для заказа Lunch Box, пожалуйста, сообщите на ресепшн не позднее 20:00.",
        "request_default": "Пожалуйста, передайте этот запрос на ресепшн.",
        "reservation_early_checkin": "Пожалуйста, обратитесь на ресепшн по вопросу раннего заезда.",
        "reservation_late_checkout": "Пожалуйста, обратитесь на ресепшн по вопросу позднего выезда.",
        "reservation_room_change": "Пожалуйста, обратитесь на ресепшн по вопросу смены номера.",
        "reservation_default": "Пожалуйста, обратитесь на ресепшн по вашему запросу по бронированию.",
        "special_need_celiac": "Пожалуйста, сообщите об этом в службу по работе с гостями; необходимая поддержка может быть согласована с кухней.",
        "special_need_vegan": "Пожалуйста, сообщите о ваших пищевых предпочтениях в службу по работе с гостями; подходящие варианты могут быть предложены.",
        "special_need_allergy": "Пожалуйста, сообщите об аллергии в службу по работе с гостями; необходимая поддержка будет организована.",
        "special_need_baby_need": "Пожалуйста, сообщите о потребности в детском питании в службу по работе с гостями; они помогут подобрать подходящие варианты.",
        "special_need_accessibility_need": "Пожалуйста, сообщите о ваших потребностях в доступности в службу по работе с гостями; необходимые договоренности будут организованы.",
        "special_need_default": "Пожалуйста, свяжитесь со службой по работе с гостями по этому вопросу.",
        "guest_notification_policy_hint": "Уведомление для отеля можно отправить в чате, выбрав категорию; в следующем сообщении можно написать, например, глютен, аллергия или праздник.",
        "fixed_restaurant_info": "- Основной ресторан: завтрак 07:00-10:00, поздний завтрак 10:00-10:30, обед 12:30-14:00, ужин 19:00-21:00, мини-ночной буфет 23:30-00:00.\n- La Terrace A La Carte: 18:30-20:30 (по записи, платно).\n- Sinton BBQ: 13:00-22:00 (по понедельникам закрыт).\nСнеки и кафе:\n- Dolphin Snack 12:00-16:00\n- Beach Imbiss Snack 12:00-16:00\n- Beach Imbiss напитки 10:00-17:00\n- Gusto Snack 11:00-18:00\n- Libum Cafe 11:00-18:00\n- Moss Beach Restaurant & Bar 10:00-19:00\nБары:\n- Pool Bar 10:00-00:00\n- Мороженое 15:00-17:00\n- Lobby Bar 10:00-00:00\n- Aqua Bar 10:00-18:00 и 20:00-23:00\n- Dolphin Bar 10:00-17:00",
        "fixed_pool_beach_info": "- Есть частный пляж.\n- Шезлонги, зонты и пляжные полотенца бесплатно.\n- Пляж: 08:30-18:30.\nБассейны:\n- Три открытых: Relax Pool 08:30-18:30, Aquapark 10:00-12:00 и 14:00-16:00, Dolphin Pool 08:30-18:30.\n- Крытый (спа): 08:00-19:00.\n- Мелководье для детей в зоне аквапарка / открытых бассейнов.\n- Спасатели у бассейнов и на море.\n- Полотенца для бассейна и пляжа бесплатно.",
        "fixed_spa_info": "- La Serenite Spa работает с 09:00 до 19:00.\nБесплатные зоны:\n- Сауна\n- Турецкий хаммам\n- Паровая комната\n- Крытый бассейн\nПлатные услуги:\n- Массаж\n- Пилинг\n- Уход за кожей\n- Другие процедуры\nПримечание: Базовое использование влажных зон бесплатно; профессиональные процедуры и терапия — платные.\n\nАктуальные прайсы и PDF по процедурам в чат длинным текстом не выкладываются; премиум-контент — в разделе приложения «Spa & wellness». Откройте страницу кнопкой ниже.",
        "fixed_spa_prices_module_hint": "Цены на спа и процедуры в чате не перечисляются. Актуальный прайс и пакеты только в модуле «Spa & wellness» — перейдите по кнопке ниже.",
        "fixed_restaurants_bars_module_hint": "Меню Lobby Bar, меню Moss Beach Restaurant и прайсы барных напитков / импортного алкоголя в чате длинным текстом не показываются; актуальные PDF — в модуле «Рестораны и бары». Откройте раздел кнопкой ниже. (Общие часы работы точек можно спросить как «часы ресторанов» или посмотреть в том же модуле.)",
        "fixed_animation_info": "- Вечерние акробатические шоу, тематические вечера, живая музыка и DJ (эта часть может меняться по дням и сезону; в отдельные дни возможны дополнительные шоу).\n- Дневной график в целом стабилен: старт в 10:00, aqua gym, дартс, водное поло. Актуальный текст и время — в приложении в разделе «Анимация и мероприятия».\nДетские активности:\n- Jammies Kids Club / Mini Club: 10:00-12:30 и 14:30-17:00 (4-12 лет)\n- Mini Disco: 20:45-21:00 (4-12 лет)\n- Детская площадка: 07:00-21:00\nПримечание: Вечерние программы и спецшоу могут отличаться по дням; точное расписание — у ресепшена или на стенде анимации.",
        "fixed_outside_hotel_info": "Для рекомендаций вне отеля лучше обратиться на ресепшн — там подскажут самые актуальные и безопасные варианты. Центр Аланьи находится примерно в 3 км, доступны такси и общественный транспорт.",
        "fixed_alanya_discover_intro": "Алания — популярный средиземноморский курорт с морем, крепостью и богатой историей. Часто советуют посетить:\n\n• Пляж Клеопатры — мелкий песок и прозрачная вода\n• Красная башня и гавань — символ города\n• Крепость Алании — панорама с холма; закаты впечатляют\n• Река Дим и зоны отдыха вглубь страны\n\nОтель в Обагёль, примерно 3 км до центра. Удобны такси и общественный транспорт. Актуальные часы работы, билеты и экскурсии лучше уточнять на ресепшене.\n\nКнопка ниже открывает раздел приложения «Откройте Аланью» с краткими текстами и фото.",
        "fixed_ice_cream_info": "Да, в отеле есть сервис мороженого. Он бесплатно подаётся в Pool Bar с 15:00 до 17:00. (Время может меняться в зависимости от сезона и операционного графика.)",
        "fixed_laundry_dry_cleaning_info": "Прачечная, химчистка и глажка в отеле предоставляются на платной основе. По приёму вещей, срокам и актуальным ценам обратитесь на ресепшн или в housekeeping.",
        "hotel_info_soft_followup_towel": (
            "Указанное время и правила по карте относятся к пляжным/бассейновым полотенцам у выдачи у бассейна или пляжа. "
            "Это не то же самое, что полотенца в ванной номера."
        ),
    },
}


class LocalizationService:
    def get(self, key: str, language: str) -> str:
        lang = self.normalize_lang(language)
        return TRANSLATIONS[lang].get(key, TRANSLATIONS["tr"].get(key, key))

    @staticmethod
    def normalize_lang(language: str | None) -> str:
        return language if language in TRANSLATIONS else "tr"

    def canonical_fallback(self, language: str | None, reason: str = "safe") -> str:
        lang = self.normalize_lang(language)
        reason_to_key = {
            "safe": "canonical_fallback_safe",
            "upstream_unavailable": "canonical_fallback_unavailable",
            "validation_error": "canonical_fallback_safe",
        }
        key = reason_to_key.get(reason, "canonical_fallback_safe")
        return self.get(key, lang)

