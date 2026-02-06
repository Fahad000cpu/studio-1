export type SendFcmNotificationInput = {
  tokens: string[];
  title: string;
  body: string;
  icon?: string;
  image?: string;
};

export type SendFcmNotificationOutput = {
  successCount: number;
  failureCount: number;
};
