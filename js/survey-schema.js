(function () {
  "use strict";

  window.SURVEY_SCHEMA = {
    title: "Deneyiminizi Değerlendirin",
    description:
      "Konaklamanızın farklı alanlarını 1–5 ile puanlayın. Her bölüm kendi içinde gönderilir; doldurmadığınız başlıklar zorunlu değildir. Kısa notlar isteğe bağlıdır.",
    tabs: [
      {
        id: "generalEval",
        label: "Genel değerlendirme",
        questions: [
          { id: "gen_stay_experience", label: "Genel konaklama deneyiminizi nasıl değerlendirirsiniz?" },
          { id: "gen_service_quality", label: "Otel hizmetlerinin genel kalitesini nasıl değerlendirirsiniz?" },
          { id: "gen_return_intent", label: "Otelimizi tekrar tercih etme isteğinizi nasıl değerlendirirsiniz?" },
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
      {
        id: "food",
        label: "Yemek & içecek",
        subTabs: [
          {
            id: "food_main_restaurant",
            label: "Ana restoran (açık büfe)",
            questions: [
              { id: "food_buffet_quality", label: "Yemek kalitesini nasıl değerlendirirsiniz?" },
              { id: "food_buffet_variety", label: "Menü çeşitliliğini nasıl değerlendirirsiniz?" },
              { id: "food_buffet_service", label: "Servis ve personel ilgisini nasıl değerlendirirsiniz?" },
            ],
          },
          {
            id: "food_la_terracca",
            label: "A La Carte – La Terraca",
            questions: [
              { id: "food_terrace_quality", label: "Sunulan yemeklerin kalitesini nasıl değerlendirirsiniz?" },
              { id: "food_terrace_speed", label: "Servis hızını nasıl değerlendirirsiniz?" },
              { id: "food_terrace_overall", label: "Genel deneyiminizi nasıl değerlendirirsiniz?" },
            ],
          },
          {
            id: "food_snack_dolphin_gusto",
            label: "Snack restoranlar – Dolphin & Gusto",
            questions: [
              { id: "food_snack_quality", label: "Sunulan ürünlerin kalitesini nasıl değerlendirirsiniz?" },
              { id: "food_snack_speed", label: "Servis hızını nasıl değerlendirirsiniz?" },
              { id: "food_snack_area", label: "Alan konforunu ve düzenini nasıl değerlendirirsiniz?" },
            ],
          },
          {
            id: "food_bars",
            label: "Barlar",
            questions: [
              { id: "food_bar_quality", label: "İçecek kalitesini nasıl değerlendirirsiniz?" },
              { id: "food_bar_speed", label: "Servis hızını nasıl değerlendirirsiniz?" },
              { id: "food_bar_staff", label: "Personel ilgisini nasıl değerlendirirsiniz?" },
            ],
          },
        ],
      },
      {
        id: "comfort",
        label: "Oda & konfor",
        questions: [
          { id: "room_comfort_overall", label: "Odanızın genel konforunu nasıl değerlendirirsiniz?" },
          { id: "room_cleanliness", label: "Odanızın temizliğini nasıl değerlendirirsiniz?" },
          { id: "bed_sleep_quality", label: "Yatak kalitesini ve uyku konforunu nasıl değerlendirirsiniz?" },
          { id: "noise_insulation", label: "Gürültü seviyesini ve izolasyonu nasıl değerlendirirsiniz?" },
        ],
      },
      {
        id: "staff",
        label: "Resepsiyon & ekip",
        questions: [
          { id: "reception_check_in_out", label: "Check-in ve check-out sürecini nasıl değerlendirirsiniz?" },
          { id: "staff_interest_approach", label: "Personelin ilgisini ve yaklaşımını nasıl değerlendirirsiniz?" },
          { id: "request_resolution_speed", label: "Taleplerinize çözüm hızını nasıl değerlendirirsiniz?" },
        ],
      },
      {
        id: "poolBeach",
        label: "Havuz & plaj",
        subTabs: [
          {
            id: "pool_area",
            label: "Havuz",
            questions: [
              { id: "pool_cleanliness", label: "Havuz alanının temizliğini nasıl değerlendirirsiniz?" },
              { id: "pool_lounger_space", label: "Şezlong ve dinlenme alanı yeterliliğini nasıl değerlendirirsiniz?" },
              { id: "pool_overall", label: "Genel havuz deneyimini nasıl değerlendirirsiniz?" },
            ],
          },
          {
            id: "beach_area",
            label: "Plaj",
            questions: [
              { id: "beach_cleanliness", label: "Plaj alanının temizliğini nasıl değerlendirirsiniz?" },
              { id: "beach_lounger_space", label: "Şezlong ve dinlenme alanı yeterliliğini nasıl değerlendirirsiniz?" },
              { id: "beach_overall", label: "Genel plaj deneyimini nasıl değerlendirirsiniz?" },
            ],
          },
        ],
      },
      {
        id: "spaWellness",
        label: "Spa & wellness",
        questions: [
          { id: "spa_service_quality", label: "Hizmet kalitesini nasıl değerlendirirsiniz?" },
          { id: "spa_staff_interest", label: "Personel ilgisini nasıl değerlendirirsiniz?" },
          { id: "spa_overall_experience", label: "Genel spa deneyiminizi nasıl değerlendirirsiniz?" },
        ],
      },
      {
        id: "guestExperience",
        label: "Misafir deneyimi & hizmet",
        questions: [
          { id: "guest_response_speed", label: "Taleplerinize verilen yanıt hızını nasıl değerlendirirsiniz?" },
          { id: "guest_issue_resolution", label: "Yaşadığınız bir sorun olduysa çözüm sürecini nasıl değerlendirirsiniz?" },
          { id: "guest_solution_focus", label: "Personelin çözüm odaklı yaklaşımını nasıl değerlendirirsiniz?" },
          { id: "guest_hotel_care", label: "Genel olarak otelin ilgisini ve takibini nasıl değerlendirirsiniz?" },
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
