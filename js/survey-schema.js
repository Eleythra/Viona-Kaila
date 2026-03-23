(function () {
  "use strict";

  window.SURVEY_SCHEMA = {
    title: "Otel ve Uygulama Deneyiminizi Değerlendirin",
    description:
      "Konaklamanız ve Viona asistanı hakkındaki görüşlerinizi paylaşın. Geri bildiriminiz hizmet kalitemizi geliştirmemize yardımcı olur.",
    tabs: [
      {
        id: "food",
        label: "Yemek",
        questions: [
          { id: "food_taste", label: "Lezzet" },
          { id: "food_variety", label: "Çeşitlilik" },
          { id: "food_presentation", label: "Sunum" },
        ],
      },
      {
        id: "comfort",
        label: "Konfor",
        questions: [
          { id: "room_comfort", label: "Oda konforu" },
          { id: "bed_comfort", label: "Yatak rahatlığı" },
          { id: "quietness", label: "Sessizlik" },
        ],
      },
      {
        id: "cleanliness",
        label: "Temizlik",
        questions: [
          { id: "room_cleanliness", label: "Oda temizliği" },
          { id: "common_area_cleanliness", label: "Ortak alan temizliği" },
        ],
      },
      {
        id: "staff",
        label: "Personel",
        questions: [
          { id: "staff_kindness", label: "Nezaket" },
          { id: "staff_speed", label: "Hız" },
          { id: "staff_helpfulness", label: "Yardımseverlik" },
        ],
      },
      {
        id: "poolBeach",
        label: "Havuz & Plaj",
        questions: [
          { id: "pool_beach_cleanliness", label: "Temizlik" },
          { id: "pool_beach_access", label: "Erişim" },
          { id: "pool_beach_satisfaction", label: "Genel memnuniyet" },
        ],
      },
      {
        id: "spaWellness",
        label: "Spa & Wellness",
        questions: [
          { id: "spa_quality", label: "Hizmet kalitesi" },
          { id: "spa_ambience", label: "Ortam" },
          { id: "spa_satisfaction", label: "Memnuniyet" },
        ],
      },
      {
        id: "generalExperience",
        label: "Genel Deneyim",
        questions: [
          { id: "general_satisfaction", label: "Genel memnuniyet" },
          { id: "return_again", label: "Tekrar gelir misiniz" },
          { id: "recommend", label: "Tavsiye eder misiniz" },
        ],
      },
      {
        id: "viona",
        label: "Viona Asistanı",
        isViona: true,
        questions: [
          { id: "viona_helpfulness", label: "Yanıtların faydalı olması" },
          { id: "viona_understanding", label: "Soruları anlama başarısı" },
          { id: "viona_usability", label: "Kullanım kolaylığı" },
          { id: "viona_overall", label: "Genel memnuniyet" },
        ],
      },
    ],
    hotelCommentPlaceholder:
      "Konaklamanız hakkında eklemek istediğiniz bir yorum varsa yazabilirsiniz",
    vionaCommentPlaceholder: "Viona asistanı hakkındaki görüşünüzü yazın",
    submitButtonText: "Değerlendirmeyi Gönder",
    thankYouMessage: "Geri bildiriminiz için teşekkür ederiz.",
  };
})();
