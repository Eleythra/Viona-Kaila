from assistant.core.chatbot_languages import (
    CHATBOT_UI_LANG_SET,
    normalize_chatbot_lang,
    orchestrator_branch_lang,
)
from assistant.services.localization_service import LocalizationService
from datetime import datetime
import re


DEVICE_LABELS = {
    "tr": {
        "television": "Televizyon",
        "shower": "Duş",
        "keycard": "Kart",
        "hvac": "Klima",
        "lighting": "Işık",
        "internet": "İnternet bağlantısı",
        "kettle": "Kettle",
        "minibar": "Minibar",
        "cabinet": "Dolap",
    },
    "en": {
        "television": "TV",
        "shower": "shower",
        "keycard": "key card",
        "hvac": "air conditioner",
        "lighting": "lighting",
        "internet": "internet connection",
        "kettle": "kettle",
        "minibar": "minibar",
        "cabinet": "cabinet",
    },
    "de": {
        "television": "Fernseher",
        "shower": "Dusche",
        "keycard": "Karte",
        "hvac": "Klimaanlage",
        "lighting": "Licht",
        "internet": "Internetverbindung",
        "kettle": "Wasserkocher",
        "minibar": "Minibar",
        "cabinet": "Schrank",
    },
    "pl": {
        "television": "Telewizor",
        "shower": "Prysznic",
        "keycard": "Karta",
        "hvac": "Klimatyzacja",
        "lighting": "Oświetlenie",
        "internet": "internet",
        "kettle": "Czajnik",
        "minibar": "minibar",
        "cabinet": "szafa",
    },
    "ru": {
        "television": "телевизор",
        "shower": "душ",
        "keycard": "карта-ключ",
        "hvac": "кондиционер",
        "lighting": "освещение",
        "internet": "интернет",
        "kettle": "чайник",
        "minibar": "минибар",
        "cabinet": "шкаф",
    },
    "da": {
        "television": "fjernsyn",
        "shower": "bruser",
        "keycard": "nøglekort",
        "hvac": "aircondition",
        "lighting": "belysning",
        "internet": "internetforbindelse",
        "kettle": "elkedel",
        "minibar": "minibar",
        "cabinet": "skab",
    },
    "nl": {
        "television": "televisie",
        "shower": "douche",
        "keycard": "sleutelkaart",
        "hvac": "airconditioning",
        "lighting": "verlichting",
        "internet": "internetverbinding",
        "kettle": "waterkoker",
        "minibar": "minibar",
        "cabinet": "kast",
    },
    "cs": {
        "television": "televize",
        "shower": "sprcha",
        "keycard": "karta",
        "hvac": "klimatizace",
        "lighting": "osvětlení",
        "internet": "internetové připojení",
        "kettle": "konvice",
        "minibar": "minibar",
        "cabinet": "skříň",
    },
    "ro": {
        "television": "televizor",
        "shower": "duș",
        "keycard": "card de acces",
        "hvac": "aer condiționat",
        "lighting": "iluminat",
        "internet": "conexiune internet",
        "kettle": "fierbător",
        "minibar": "minibar",
        "cabinet": "dulap",
    },
    "sk": {
        "television": "televízor",
        "shower": "sprcha",
        "keycard": "kľúčová karta",
        "hvac": "klimatizácia",
        "lighting": "osvetlenie",
        "internet": "internetové pripojenie",
        "kettle": "kanvica",
        "minibar": "minibar",
        "cabinet": "skriňa",
    },
}

SOCIAL_VARIANTS = {
    "tr": {
        "greeting": [
            "Merhaba; ben Viona, Kaila Beach Hotel'in dijital asistanınızım. Konaklamanızda size nasıl eşlik edebilirim?",
            "Merhaba. Kaila Beach'te konaklamanız ve otel deneyiminizle ilgili sorularınızda yanınızdayım.",
            "Hoş geldiniz. Otel hizmetleri ve pratik taleplerinizde kısa ve net biçimde yardımcı olurum.",
        ],
        "thanks": [
            "Rica ederim. Konaklamanızla ilgili başka bir konuda yardımcı olabilirim.",
            "Ne demek, memnuniyetle. Kaila Beach Hotel ile ilgili başka bir sorunuz varsa buradayım.",
            "Ben teşekkür ederim. İsterseniz başka bir konuda da yardımcı olabilirim.",
        ],
        "farewell": [
            "Görüşmek üzere. İhtiyacınız olursa yine buradayım.",
            "Hoşça kalın. Dilediğiniz zaman yazabilirsiniz.",
        ],
        "apology_from_user": [
            "Hiç sorun değil. Size memnuniyetle yardımcı olmaya devam edebilirim.",
            "Sorun değil, anlayışla karşılıyorum. Devam edebiliriz.",
        ],
        "compliment": [
            "Nazik geri bildiriminiz için teşekkür ederim. Yardımcı olabildiysem ne mutlu bana.",
            "Güzel sözleriniz için teşekkür ederim. Her zaman yardımcı olmaya hazırım.",
        ],
        "how_are_you": [
            "Teşekkür ederim, iyiyim. Kaila Beach Hotel ile ilgili sorularınızda yanınızdayım.",
            "Gayet iyiyim, teşekkürler. Konaklamanızla ilgili nasıl yardımcı olabilirim?",
        ],
    },
    "en": {
        "greeting": [
            "Good day — I'm Viona, your digital host at Kaila Beach Hotel. How may I assist you today?",
            "Hello. I'm here for your stay, services, and practical questions at Kaila Beach — with clarity and care.",
            "Welcome. Ask about the hotel or your stay; I'll keep answers concise and useful.",
        ],
        "thanks": [
            "You're very welcome. I'm here if you need any help with your stay at Kaila Beach Hotel.",
            "Glad to help. Let me know if you need anything else about the hotel or your stay.",
            "My pleasure. I can also help with other questions about your stay.",
        ],
        "farewell": [
            "See you. I'm here whenever you need help during your stay.",
            "Goodbye for now. Feel free to message me anytime.",
        ],
        "apology_from_user": [
            "No worries at all. I'm happy to keep helping you.",
            "That's absolutely okay. We can continue anytime.",
        ],
        "compliment": [
            "Thank you for your kind words. Glad I could help.",
            "I appreciate it. I'm always here to support your stay.",
        ],
        "how_are_you": [
            "I'm doing well, thank you. I'm here to help with anything about Kaila Beach Hotel.",
            "Doing great, thank you. How can I assist you with your stay?",
        ],
    },
    "de": {
        "greeting": [
            "Guten Tag — ich bin Viona, Ihre digitale Gastgeberin im Kaila Beach Hotel. Wobei darf ich Ihnen heute behilflich sein?",
            "Hallo. Ich begleite Sie gern bei Aufenthalt und Hotelservices im Kaila Beach — klar und aufmerksam.",
            "Willkommen. Fragen Sie zu Hotel und Aufenthalt; ich antworte prägnant.",
        ],
        "thanks": [
            "Gern geschehen. Wenn Sie noch Fragen zu Ihrem Aufenthalt haben, helfe ich Ihnen gern weiter.",
            "Sehr gern. Ich bin hier, wenn Sie weitere Hilfe rund um das Hotel benötigen.",
            "Keine Ursache. Bei weiteren Fragen unterstütze ich Sie gern.",
        ],
        "farewell": [
            "Auf Wiedersehen. Ich bin jederzeit für Sie da, wenn Sie Hilfe brauchen.",
            "Bis bald. Schreiben Sie mir gern wieder.",
        ],
        "apology_from_user": [
            "Kein Problem. Ich helfe Ihnen gern weiter.",
            "Alles gut. Wir können direkt weitermachen.",
        ],
        "compliment": [
            "Vielen Dank für Ihr nettes Feedback. Es freut mich, dass ich helfen konnte.",
            "Danke für die freundlichen Worte. Ich unterstütze Sie jederzeit gern.",
        ],
        "how_are_you": [
            "Danke, mir geht es gut. Ich unterstütze Sie gern bei Fragen rund um das Kaila Beach Hotel.",
            "Mir geht es gut, danke. Wie kann ich Ihnen bei Ihrem Aufenthalt helfen?",
        ],
    },
    "pl": {
        "greeting": [
            "Dzień dobry — jestem Viona, cyfrowa gospodyni hotelu Kaila Beach. W czym mogę dziś pomóc?",
            "Dzień dobry. Pomogę w pobycie i usługach Kaila Beach Hotel — zwięźle i z troską.",
            "Witamy. Pytaj o hotel i pobyt; odpowiem jasno i na temat.",
        ],
        "thanks": [
            "Proszę bardzo. Jeśli pojawią się kolejne pytania o hotel lub pobyt, chętnie pomogę.",
            "Cała przyjemność. Jestem dostępna, gdy potrzebujesz wsparcia w sprawach hotelu.",
            "Cieszę się, że mogłam pomóc. W razie potrzeby odpowiem też na inne pytania.",
        ],
        "farewell": [
            "Do zobaczenia. Gdy będziesz potrzebować pomocy, jestem tutaj.",
            "Do widzenia. Pisz w dowolnym momencie.",
        ],
        "apology_from_user": [
            "Nic się nie stało. Chętnie dalej pomogę.",
            "Wszystko w porządku. Możemy kontynuować.",
        ],
        "compliment": [
            "Dziękuję za miłe słowa. Cieszę się, że mogłam pomóc.",
            "Dziękuję za feedback. Zawsze chętnie pomogę.",
        ],
        "how_are_you": [
            "Dziękuję, u mnie wszystko w porządku. Jestem tutaj, by pomóc w sprawach Kaila Beach Hotel.",
            "U mnie dobrze, dziękuję. W czym mogę pomóc w sprawie pobytu?",
        ],
    },
    "ru": {
        "greeting": [
            "Здравствуйте, я Виона — цифровой ассистент отеля Kaila Beach. Чем могу помочь?",
            "Добрый день. Помогу с вопросами о проживании и сервисах Kaila Beach Hotel.",
            "Здравствуйте. Задайте вопрос об отеле или отдыхе — отвечу кратко и по делу.",
        ],
        "thanks": [
            "Пожалуйста. Если появятся ещё вопросы о проживании, я на связи.",
            "Рада помочь. Напишите, если нужно что-то ещё по отелю.",
            "Не за что. Могу помочь и с другими вопросами о вашем отдыхе.",
        ],
        "farewell": [
            "До встречи. Напишите, если понадобится помощь.",
            "Всего доброго. Я на связи в любое время.",
        ],
        "apology_from_user": [
            "Ничего страшного. С удовольствием продолжу помогать.",
            "Всё в порядке, продолжим.",
        ],
        "compliment": [
            "Спасибо за тёплые слова. Рада была помочь.",
            "Благодарю за отзыв. Всегда готова поддержать ваш отдых.",
        ],
        "how_are_you": [
            "Спасибо, у меня всё хорошо. Помогу с вопросами об отеле Kaila Beach.",
            "У меня всё отлично. Чем помочь с проживанием?",
        ],
    },
    "da": {
        "greeting": [
            "Hej, jeg er Viona, din digitale assistent på Kaila Beach Hotel. Hvordan kan jeg hjælpe?",
            "Hej. Jeg kan hjælpe med dit ophold og hotellets tjenester på Kaila Beach Hotel.",
            "Velkommen. Spørg gerne om hotellet eller dit ophold.",
        ],
        "thanks": [
            "Selv tak. Skriv endelig, hvis du har flere spørgsmål om dit ophold.",
            "Det var en fornøjelse. Jeg er her, hvis du har brug for mere hjælp.",
            "Gerne. Jeg hjælper også gerne med andre spørgsmål om hotellet.",
        ],
        "farewell": [
            "Vi ses. Skriv, hvis du har brug for hjælp under opholdet.",
            "Farvel for nu. Du er velkommen til at skrive når som helst.",
        ],
        "apology_from_user": [
            "Det er helt i orden. Jeg hjælper gerne videre.",
            "Ingen problemer. Vi kan fortsætte når som helst.",
        ],
        "compliment": [
            "Tak for de pæne ord. Glad for at kunne hjælpe.",
            "Tak. Jeg er her for at støtte dit ophold.",
        ],
        "how_are_you": [
            "Tak, jeg har det godt. Jeg hjælper gerne med alt om Kaila Beach Hotel.",
            "Det går fint, tak. Hvad kan jeg hjælpe med til dit ophold?",
        ],
    },
    "nl": {
        "greeting": [
            "Hallo, ik ben Viona, uw digitale assistent in Kaila Beach Hotel. Waarmee kan ik helpen?",
            "Hallo. Ik help u graag met uw verblijf en de services van Kaila Beach Hotel.",
            "Welkom. Stel gerust vragen over het hotel of uw verblijf.",
        ],
        "thanks": [
            "Graag gedaan. Laat het weten als u nog iets nodig heeft over uw verblijf.",
            "Met genoegen. Ik ben er als u meer hulp wilt over het hotel.",
            "Geen dank. Ik help ook graag bij andere vragen over uw verblijf.",
        ],
        "farewell": [
            "Tot ziens. Ik ben er als u hulp nodig heeft tijdens uw verblijf.",
            "Dag voor nu. U kunt me altijd een bericht sturen.",
        ],
        "apology_from_user": [
            "Geen zorgen. Ik help u graag verder.",
            "Helemaal goed. We kunnen zo verder.",
        ],
        "compliment": [
            "Dank u voor de vriendelijke woorden. Blij dat ik kon helpen.",
            "Dank u. Ik ben er om uw verblijf te ondersteunen.",
        ],
        "how_are_you": [
            "Dank u, het gaat goed met mij. Ik help u graag met alles over Kaila Beach Hotel.",
            "Het gaat prima, dank u. Waarmee kan ik helpen voor uw verblijf?",
        ],
    },
    "cs": {
        "greeting": [
            "Dobrý den, jsem Viona, digitální asistentka hotelu Kaila Beach. Jak vám mohu pomoci?",
            "Dobrý den. Ráda pomohu s pobytem a službami hotelu Kaila Beach.",
            "Vítejte. Zeptejte se na hotel nebo pobyt — odpovím stručně a jasně.",
        ],
        "thanks": [
            "Není zač. Napište, pokud budete mít další dotazy k pobytu.",
            "Ráda jsem pomohla. Jsem k dispozici i pro další otázky o hotelu.",
            "Prosím. Pomohu i s dalšími požadavky týkajícími se pobytu.",
        ],
        "farewell": [
            "Těším se na shledanou. Napište, pokud budete potřebovat pomoc.",
            "Na shledanou. Kdykoli můžete napsat.",
        ],
        "apology_from_user": [
            "Vůbec nevadí. Ráda pomohu dál.",
            "V pořádku, můžeme pokračovat.",
        ],
        "compliment": [
            "Děkuji za milá slova. Těší mě, že jsem mohla pomoci.",
            "Děkuji. Jsem tu, abych podpořila váš pobyt.",
        ],
        "how_are_you": [
            "Děkuji, mám se dobře. Pomohu s čímkoli ohledně hotelu Kaila Beach.",
            "Mám se skvěle, díky. S čím pomohu ohledně pobytu?",
        ],
    },
    "ro": {
        "greeting": [
            "Bună ziua, sunt Viona, asistenta digitală de la Kaila Beach Hotel. Cu ce vă pot ajuta?",
            "Bună ziua. Vă pot ajuta cu sejurul și serviciile hotelului Kaila Beach.",
            "Bun venit. Întrebați despre hotel sau sejur — răspund pe scurt.",
        ],
        "thanks": [
            "Cu plăcere. Scrieți dacă mai aveți întrebări despre sejur.",
            "Mă bucur să ajut. Sunt aici pentru alte întrebări despre hotel.",
            "Nicio problemă. Pot ajuta și cu alte solicitări legate de sejur.",
        ],
        "farewell": [
            "La revedere. Scrieți dacă aveți nevoie de ajutor în timpul sejurului.",
            "Pe curând. Puteți mă contacta oricând.",
        ],
        "apology_from_user": [
            "Nu face nimic. Continui cu plăcere să ajut.",
            "Totul e în regulă. Putem continua.",
        ],
        "compliment": [
            "Mulțumesc pentru cuvintele frumoase. Mă bucur că am putut ajuta.",
            "Apreciez. Sunt aici să vă sprijin sejurul.",
        ],
        "how_are_you": [
            "Mulțumesc, sunt bine. Vă ajut cu orice despre Kaila Beach Hotel.",
            "Foarte bine, mulțumesc. Cu ce vă ajut pentru sejur?",
        ],
    },
    "sk": {
        "greeting": [
            "Dobrý deň, som Viona, digitálna asistentka hotela Kaila Beach. Ako vám môžem pomôcť?",
            "Dobrý deň. Rada pomôžem s pobytom a službami hotela Kaila Beach.",
            "Vitajte. Opýtajte sa na hotel alebo pobyt — odpoviem stručne.",
        ],
        "thanks": [
            "Nie je zač. Napíšte, ak budete mať ďalšie otázky k pobytu.",
            "Rada som pomohla. Som k dispozícii aj pre ďalšie otázky o hoteli.",
            "Prosím. Pomôžem aj s ďalšími požiadavkami týkajúcimi sa pobytu.",
        ],
        "farewell": [
            "Dovidenia. Napíšte, ak budete potrebovať pomoc.",
            "Zbohom. Kedykoľvek môžete napísať.",
        ],
        "apology_from_user": [
            "Vôbec to nevadí. Rada pomôžem ďalej.",
            "V poriadku, môžeme pokračovať.",
        ],
        "compliment": [
            "Ďakujem za milé slová. Teší ma, že som mohla pomôcť.",
            "Ďakujem. Som tu, aby som podporila váš pobyt.",
        ],
        "how_are_you": [
            "Ďakujem, mám sa dobre. Pomôžem s čímkoľvek ohľadom hotela Kaila Beach.",
            "Mám sa skvele, ďakujem. S čím pomôžem ohľadom pobytu?",
        ],
    },
}


class ResponseComposer:
    def __init__(self, localization_service: LocalizationService):
        self.i18n = localization_service

    def compose(
        self,
        intent: str,
        sub_intent: str | None,
        entity: str | None,
        language: str,
        seed_text: str | None = None,
    ) -> str:
        if intent == "fault_report":
            return self._fault(sub_intent, entity, language)
        if intent == "recommendation":
            return self._recommendation(sub_intent, entity, language)
        if intent == "complaint":
            return self._complaint(sub_intent, language)
        if intent == "request":
            return self._request(entity, language)
        if intent == "reservation":
            return self._reservation(sub_intent, entity, language)
        if intent == "special_need":
            return self._special_need(sub_intent, entity, language)
        if intent == "chitchat":
            return self._chitchat(sub_intent, entity, language, seed_text)
        if intent == "current_time":
            return self._current_time(language)
        return self.i18n.get("reception_fallback_message", language)

    def _fault(self, sub_intent: str | None, entity: str | None, language: str) -> str:
        # Prefer explicit entity mapping when available.
        _dl = normalize_chatbot_lang(language)
        if _dl not in DEVICE_LABELS:
            _dl = orchestrator_branch_lang(language)
        if _dl not in DEVICE_LABELS:
            _dl = "en"
        device = (DEVICE_LABELS.get(_dl, DEVICE_LABELS["en"]).get(entity or "", None))
        if device:
            return self.i18n.get("fault_template_with_device", language).format(device=device)

        # If entity is missing/ambiguous, derive device from deterministic sub-intent.
        sub_to_device_entity = {
            "bathroom_fault": "shower",
            "keycard_fault": "keycard",
            "hvac_fault": "hvac",
            "lighting_fault": "lighting",
            # room_equipment_fault: keep generic unless entity is present.
        }
        device_entity = sub_to_device_entity.get(sub_intent or "")
        if device_entity:
            device = (DEVICE_LABELS.get(_dl, DEVICE_LABELS["en"]).get(device_entity, None))
            if device:
                return self.i18n.get("fault_template_with_device", language).format(device=device)

        return self.i18n.get("fault_template_generic", language)

    def _recommendation(self, sub_intent: str | None, entity: str | None, language: str) -> str:
        key_by_entity = {
            "fish_pref": "recommendation_fish",
            "meat_bbq_pref": "recommendation_meat",
            "pizza_snack_pref": "recommendation_pizza_snack",
            "coffee_dessert_pref": "recommendation_coffee_dessert",
            "kids_activity_pref": "recommendation_kids_activity",
            "romantic_dinner_pref": "recommendation_romantic_dinner",
            "general_dining_pref": "recommendation_general_dining",
        }
        key = key_by_entity.get(entity or "")
        if not key:
            key = "recommendation_kids_activity" if sub_intent == "activity_recommendation" else "recommendation_pizza_snack"
        return self.i18n.get(key, language)

    def _complaint(self, sub_intent: str | None, language: str) -> str:
        if sub_intent == "noise_complaint":
            return self.i18n.get("complaint_noise", language)
        if sub_intent == "cleanliness_complaint":
            return self.i18n.get("complaint_cleanliness", language)
        if sub_intent == "lost_property_complaint":
            return self.i18n.get("complaint_lost_property", language)
        return self.i18n.get("complaint_default", language)

    def _request(self, entity: str | None, language: str) -> str:
        if entity == "towel":
            return self.i18n.get("request_towel", language)
        if entity == "blanket":
            return self.i18n.get("request_blanket", language)
        if entity == "water":
            return self.i18n.get("request_water", language)
        if entity == "pillow":
            return self.i18n.get("request_pillow", language)
        if entity == "housekeeping_service":
            return self.i18n.get("request_housekeeping", language)
        if entity == "reception_contact":
            return self.i18n.get("request_reception_contact", language)
        if entity == "premium_table_reservation":
            return self.i18n.get("request_premium_reservation_reception", language)
        if entity == "spa_contact":
            return self.i18n.get("request_spa_booking_contact", language)
        if entity == "ala_carte_reservation":
            return self.i18n.get("request_ala_carte_reservation", language)
        if entity == "guest_relations_contact":
            return self.i18n.get("request_guest_relations_contact", language)
        if entity == "transfer_request":
            return self.i18n.get("request_transfer", language)
        if entity == "lunch_box_request":
            return self.i18n.get("request_lunch_box", language)
        return self.i18n.get("request_default", language)

    def _reservation(self, sub_intent: str | None, entity: str | None, language: str) -> str:
        s = sub_intent or ""
        if s == "early_checkin_request" or entity == "early_checkin":
            return self.i18n.get("reservation_early_checkin", language)
        if s == "late_checkout_request" or entity == "late_checkout":
            return self.i18n.get("reservation_late_checkout", language)
        if s == "room_change_request" or entity == "room_change":
            return self.i18n.get("reservation_room_change", language)
        return self.i18n.get("reservation_default", language)

    def _special_need(self, sub_intent: str | None, entity: str | None, language: str) -> str:
        if (
            sub_intent == "dietary_medical_restriction"
            or entity in ("celiac", "gluten_related_restriction", "lactose_related_restriction")
        ):
            return self.i18n.get("special_need_celiac", language)
        if sub_intent == "dietary_preference" or entity in ("vegan", "vegetarian"):
            return self.i18n.get("special_need_vegan", language)
        if sub_intent == "allergy" or entity == "allergy":
            return self.i18n.get("special_need_allergy", language)
        if sub_intent == "baby_need" or entity == "baby_need":
            return self.i18n.get("special_need_baby_need", language)
        if sub_intent == "accessibility_need" or entity == "accessibility_need":
            return self.i18n.get("special_need_accessibility_need", language)
        return self.i18n.get("special_need_default", language)

    def _pick_social_variant(self, language: str, intent_key: str, seed_text: str | None) -> str | None:
        n = normalize_chatbot_lang(language)
        choices: list[str] = []
        for cand in (n, orchestrator_branch_lang(language), "en", "tr", "de", "pl"):
            if cand not in SOCIAL_VARIANTS:
                continue
            choices = SOCIAL_VARIANTS[cand].get(intent_key, [])
            if choices:
                break
        if not choices:
            return None
        seed = (seed_text or "").lower().strip()
        seed = re.sub(r"\s+", " ", seed)
        sig = f"{n}|{intent_key}|{seed}"
        idx = sum(ord(ch) for ch in sig) % len(choices)
        return choices[idx]

    def _chitchat(self, sub_intent: str | None, entity: str | None, language: str, seed_text: str | None = None) -> str:
        if sub_intent == "language_switch" and entity in CHATBOT_UI_LANG_SET:
            return self.i18n.get(f"chitchat_switch_{entity}", language)
        if sub_intent in ("assistant_intro", "identity_question"):
            return self.i18n.get("chitchat_identity_question", language)
        if sub_intent == "thanks":
            return self._pick_social_variant(language, "thanks", seed_text) or self.i18n.get("chitchat_thanks", language)
        if sub_intent == "farewell":
            return self._pick_social_variant(language, "farewell", seed_text) or self.i18n.get("chitchat_farewell", language)
        if sub_intent == "apology_from_user":
            return self._pick_social_variant(language, "apology_from_user", seed_text) or self.i18n.get(
                "chitchat_apology_from_user", language
            )
        if sub_intent == "compliment":
            return self._pick_social_variant(language, "compliment", seed_text) or self.i18n.get("chitchat_compliment", language)
        if sub_intent == "how_are_you":
            return self._pick_social_variant(language, "how_are_you", seed_text) or self.i18n.get("chitchat_how_are_you", language)
        if sub_intent == "confusion":
            return self.i18n.get("chitchat_confusion_generic", language)
        if sub_intent == "cancel_command_hint":
            return self.i18n.get("chitchat_cancel_command_hint", language)
        return self._pick_social_variant(language, "greeting", seed_text) or self.i18n.get("chitchat_greeting", language)

    def _current_time(self, language: str) -> str:
        now = datetime.now()
        hhmm = now.strftime("%H:%M")
        return self.i18n.get("current_time_template", language).format(time=hhmm)

