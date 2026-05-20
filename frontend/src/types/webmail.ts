export interface EmailAccount {
  id: string;
  email: string;
  imapHost: string;
  imapPort: number;
  smtpHost: string;
  smtpPort: number;
  status: string;
  lastSyncDate: string;
  lastSyncError: string | null;
  signature?: string;
}

export interface EmailCache {
  id: string;
  providerUid: number;
  folder: string;
  sender: string;
  subject: string;
  receivedDate: string;
  isRead: boolean;
  hasAttachment: boolean;
  isSpam: boolean;
}

export interface EmailContent {
  subject: string;
  htmlBody: string;
  attachments: {
    filename: string;
    contentType: string;
  }[];
}
