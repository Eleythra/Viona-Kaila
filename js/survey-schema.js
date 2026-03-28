(function () {
  "use strict";

  window.SURVEY_SCHEMA = {
    title: "Otel ve Uygulama Deneyiminizi Değerlendirin",
    description:
      "İstediğiniz başlığı açın; yalnızca o bölümdeki sorular için 1–5 puan verip gönderebilirsiniz. Diğer bölümler isteğe bağlıdır. Yorum eklemek zorunlu değildir.",
    tabs: [
      {
        id: "food",
        label: "Yemek & içecek",
        questions: [
          { id: "food_taste", label: "Ana restoran ve açık büfe lezzeti" },
          { id: "food_variety", label: "Menü çeşitliliği (içecek / yemek)" },
          { id: "food_presentation", label: "Servis hızı ve sunum" },
        ],
      },
      {
        id: "comfort",
        label: "Oda & konfor",
        questions: [
          { id: "room_comfort", label: "Oda düzeni, klima ve ekipman" },
          { id: "bed_comfort", label: "Uyku kalitesi / yatak konforu" },
          { id: "quietness", label: "Gürültü ve dinlenme ortamı" },
        ],
      },
      {
        id: "cleanliness",
        label: "Temizlik & hijyen",
        questions: [
          { id: "room_cleanliness", label: "Oda temizliği ve tedarik" },
          { id: "common_area_cleanliness", label: "Lobi, koridor ve ortak alanlar" },
        ],
      },
      {
        id: "staff",
        label: "Resepsiyon & ekip",
        questions: [
          { id: "staff_kindness", label: "Resepsiyon ilgisi ve karşılama" },
          { id: "staff_speed", label: "Talep ve şikâyet yanıt süresi" },
          { id: "staff_helpfulness", label: "Yardımseverlik (tüm ekip)" },
        ],
      },
      {
        id: "poolBeach",
        label: "Havuz & plaj",
        questions: [
          { id: "pool_beach_cleanliness", label: "Havuz ve plaj düzeni" },
          { id: "pool_beach_access", label: "Şezlong, havuz ve plaj erişimi" },
          { id: "pool_beach_satisfaction", label: "Havuz & plaj genel memnuniyeti" },
        ],
      },
      {
        id: "spaWellness",
        label: "Spa & wellness",
        questions: [
          { id: "spa_quality", label: "Randevu ve spa hizmet kalitesi" },
          { id: "spa_ambience", label: "Spa ortamı ve dinlenme" },
          { id: "spa_satisfaction", label: "Spa fiyat / değer dengesi" },
        ],
      },
      {
        id: "generalExperience",
        label: "Genel deneyim",
        questions: [
          { id: "general_satisfaction", label: "Kaila Beach genel memnuniyet" },
          { id: "return_again", label: "Tekrar konaklar mısınız?" },
          { id: "recommend", label: "Başkasına tavsiye eder misiniz?" },
        ],
      },
      {
        id: "viona",
        label: "Viona",
        isViona: true,
        questions: [
          { id: "viona_helpfulness", label: "Yanıtların işinize yararlığı" },
          { id: "viona_understanding", label: "İsteğinizi doğru anlama" },
          { id: "viona_usability", label: "Sohbet ekranı kullanım kolaylığı" },
          { id: "viona_overall", label: "Viona ile genel memnuniyet" },
        ],
      },
    ],
    hotelCommentPlaceholder:
      "Konaklamanız hakkında eklemek istediğiniz bir yorum varsa yazabilirsiniz",
    vionaCommentPlaceholder: "Viona hakkında eklemek istediğiniz not",
    submitButtonText: "Değerlendirmeyi Gönder",
    thankYouMessage: "Geri bildiriminiz için teşekkür ederiz.",
  };
})();
