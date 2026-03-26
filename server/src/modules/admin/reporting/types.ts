export type ScoreLabel = "Kritik" | "Geliştirilmeli" | "İyi" | "Çok İyi";

export interface DateRange {
  from?: string;
  to?: string;
}

export interface ScoreCard {
  key: "chatbot" | "satisfaction" | "content" | "commercial" | "overall";
  title: string;
  score: number;
  label: ScoreLabel;
}

export interface DashboardBaseReport {
  kpis: {
    totalChats: number;
    fallbackRate: number;
    overallSatisfaction: number;
    vionaSatisfaction: number;
  };
  chatbotPerformance: {
    totalChats: number;
    dailyUsage: Array<{ date: string; count: number }>;
    avgMessagesPerUser: number;
    avgConversationLength: number;
    fallbackRate: number;
    topQuestions: Array<{ key: string; count: number }>;
  };
  satisfaction: {
    overallScore: number;
    vionaScore: number;
    categories: Record<string, number>;
  };
  unansweredQuestions: {
    fallbackCount: number;
    topFallbackQuestions: Array<{ key: string; count: number }>;
    repeatedUnanswered: Array<{ key: string; count: number }>;
  };
  conversion: {
    actionClicksByType: Record<string, number>;
    actionClicks: number;
    actionConversions: number;
    actionConversionRate: number;
    chatToConversionRate: number;
  };
}

export interface VionaReportData {
  hotelName: string;
  dateRange: Required<DateRange>;
  generatedAt: string;
  summary: string[];
  scores: ScoreCard[];
  chatbotMetrics: Record<string, unknown>;
  satisfactionMetrics: Record<string, unknown>;
  unansweredMetrics: Record<string, unknown>;
  conversionMetrics: Record<string, unknown>;
  insights: Record<string, string[]>;
  actions: string[];
  methodology: string[];
  noData?: boolean;
  hotelImageUrl?: string;
  brandLogoUrl?: string;
}
