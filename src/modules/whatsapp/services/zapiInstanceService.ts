import { supabase } from "@/integrations/supabase/client";

async function call(action: string, payload?: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke("zapi-instance", {
    body: { action, payload },
  });
  if (error) throw new Error(error.message);
  if (data && (data as any).error) throw new Error((data as any).error);
  return (data as any)?.data;
}

export const zapiInstanceService = {
  // Perfil
  getProfile: () => call("get-profile"),
  updateProfileName: (value: string) => call("update-profile-name", { value }),
  updateProfileDescription: (value: string) => call("update-profile-description", { value }),
  updateProfilePicture: (value: string) => call("update-profile-picture", { value }),

  // Leitura automática
  setAutoReadMessage: (value: boolean) => call("update-auto-read-message", { value }),
  setAutoReadStatus: (value: boolean) => call("update-auto-read-status", { value }),

  // Chamadas
  setCallRejectAuto: (value: boolean) => call("update-call-reject-auto", { value }),
  setCallRejectMessage: (value: string) => call("update-call-reject-message", { value }),

  // Validação de números
  phoneExists: (phone: string) => call("phone-exists", { phone }),
  phoneExistsBatch: (phones: string[]) =>
    call("phone-exists-batch", { phones }) as Promise<Array<{ phone: string; exists: boolean }>>,

  // Mensagens avançadas
  reactMessage: (phone: string, messageId: string, reaction: string) =>
    call("react-message", { phone, messageId, reaction }),
  editMessage: (phone: string, messageId: string, text: string) =>
    call("edit-message", { phone, messageId, text }),
  deleteMessage: (phone: string, messageId: string, owner = "true") =>
    call("delete-message", { phone, messageId, owner }),

  sendPoll: (phone: string, message: string, options: string[], maxOptions = options.length) =>
    call("send-poll", { phone, message, poll: options, maxOptions }),

  // Contatos
  blockContact: (phone: string) => call("block-contact", { phone }),
  unblockContact: (phone: string) => call("unblock-contact", { phone }),

  // ========= MENSAGENS / MÍDIA =========
  sendText: (phone: string, message: string, opts: Record<string, unknown> = {}) =>
    call("send-text", { phone, message, ...opts }),
  replyMessage: (phone: string, message: string, messageId: string) =>
    call("reply-message", { phone, message, messageId }),
  forwardMessage: (phone: string, messageId: string, messagePhone: string) =>
    call("forward-message", { phone, messageId, messagePhone }),
  removeReaction: (phone: string, messageId: string) =>
    call("remove-reaction", { phone, messageId }),
  readMessage: (phone: string, messageId: string) =>
    call("read-message", { phone, messageId }),
  pinMessage: (phone: string, messageId: string, pinMessageDuration: "24_HOURS" | "7_DAYS" | "30_DAYS" = "24_HOURS") =>
    call("pin-message", { phone, messageId, pinMessageDuration }),

  sendImage: (phone: string, image: string, caption?: string) =>
    call("send-image", { phone, image, caption }),
  sendSticker: (phone: string, sticker: string) => call("send-sticker", { phone, sticker }),
  sendGif: (phone: string, gif: string, caption?: string) => call("send-gif", { phone, gif, caption }),
  sendAudio: (phone: string, audio: string, opts: Record<string, unknown> = {}) =>
    call("send-audio", { phone, audio, ...opts }),
  sendVideo: (phone: string, video: string, caption?: string) =>
    call("send-video", { phone, video, caption }),
  sendPtv: (phone: string, ptv: string) => call("send-ptv", { phone, ptv }),
  sendDocument: (phone: string, document: string, fileName: string, extension: string, caption?: string) =>
    call("send-document", { phone, document, fileName, extension, caption }),
  sendLink: (
    phone: string,
    payload: { message: string; image: string; linkUrl: string; title: string; linkDescription: string },
  ) => call("send-link", { phone, ...payload }),
  sendLocation: (
    phone: string,
    payload: { title: string; address: string; latitude: number; longitude: number },
  ) => call("send-location", { phone, ...payload }),
  sendContact: (
    phone: string,
    contactName: string,
    contactPhone: string,
    contactBusinessDescription?: string,
  ) => call("send-contact", { phone, contactName, contactPhone, contactBusinessDescription }),
  sendMultipleContacts: (phone: string, contacts: Array<{ name: string; phone: string }>) =>
    call("send-multiple-contacts", { phone, contacts }),

  // ========= INTERATIVOS =========
  sendButtonActions: (payload: Record<string, unknown>) => call("send-button-actions", payload),
  sendButtonListImage: (payload: Record<string, unknown>) => call("send-button-list-image", payload),
  sendButtonListVideo: (payload: Record<string, unknown>) => call("send-button-list-video", payload),
  sendOptionList: (payload: Record<string, unknown>) => call("send-option-list", payload),
  sendButtonOtp: (phone: string, code: string, message: string) =>
    call("send-button-otp", { phone, code, message }),
  sendButtonPix: (payload: { phone: string; pixKey: string; type: string; merchantName: string }) =>
    call("send-button-pix", payload),
  sendCarousel: (payload: Record<string, unknown>) => call("send-carousel", payload),
  replyButton: (payload: Record<string, unknown>) => call("reply-button", payload),
  replyTemplateButton: (payload: Record<string, unknown>) => call("reply-template-button", payload),

  // ========= ENQUETES / EVENTOS =========
  sendPollVote: (phone: string, messageId: string, optionsName: string[]) =>
    call("send-poll-vote", { phone, messageId, optionsName }),
  sendEvent: (payload: Record<string, unknown>) => call("send-event", payload),
  sendEditEvent: (payload: Record<string, unknown>) => call("send-edit-event", payload),
  sendEventResponse: (payload: { phone: string; messageId: string; response: "accept" | "decline" | "tentative" }) =>
    call("send-event-response", payload),

  // ========= COMÉRCIO =========
  sendProduct: (payload: Record<string, unknown>) => call("send-message-product", payload),
  sendCatalog: (payload: Record<string, unknown>) => call("send-message-catalog", payload),
  sendOrder: (payload: Record<string, unknown>) => call("send-message-order", payload),
  sendOrderStatusUpdate: (payload: Record<string, unknown>) => call("send-order-status-update", payload),
  sendOrderPaymentUpdate: (payload: Record<string, unknown>) => call("send-order-payment-update", payload),

  // ========= NEWSLETTER =========
  sendNewsletterAdminInvite: (payload: Record<string, unknown>) =>
    call("send-newsletter-admin-invite", payload),

  // ========= WEBHOOK =========
  /** "Ao receber" — mensagens recebidas */
  updateWebhookReceived: (url: string) => call("update-webhook", { value: url }),
  /** "Ao enviar" — URL para mensagens enviadas pelo dispositivo */
  updateWebhookSendUrl: (url: string) => call("update-webhook-send-url", { value: url }),
  /** Toggle "Notificar as enviadas por mim também" */
  updateNotifySentByMe: (active: boolean) => call("update-notify-sent-by-me", { value: active }),
  /** "Receber status da mensagem" */
  updateWebhookStatus: (url: string) => call("update-webhook-status", { value: url }),
  /** "Ao desconectar" */
  updateWebhookDisconnected: (url: string) => call("update-webhook-disconnected", { value: url }),
  /** "Ao conectar" */
  updateWebhookConnected: (url: string) => call("update-webhook-connected", { value: url }),
  /** "Presença do chat" */
  updateWebhookPresence: (url: string) => call("update-webhook-presence", { value: url }),
  /** Configura TODOS os webhooks de uma vez */
  async configurarTodosWebhooks(receptivoUrl: string, statusUrl: string) {
    const calls = [
      call("update-webhook", { value: receptivoUrl }),
      call("update-webhook-send-url", { value: receptivoUrl }),
      call("update-webhook-status", { value: statusUrl }),
      call("update-webhook-disconnected", { value: receptivoUrl }),
      call("update-webhook-connected", { value: receptivoUrl }),
      call("update-notify-sent-by-me", { value: true }),
    ];
    const results = await Promise.allSettled(calls);
    const erros = results.filter((r) => r.status === "rejected").length;
    return { total: calls.length, erros };
  },
  /** Método legado mantido para compatibilidade */
  updateWebhookSend: (active: boolean) => call("update-notify-sent-by-me", { value: active }),

  // ========= PRIVACIDADE =========
  getDisallowedContacts: () => call("get-disallowed-contacts"),
  setLastSeen: (value: "all" | "contacts" | "contacts_except" | "none") => call("set-last-seen", { value }),
  setPhotoVisualization: (value: "all" | "contacts" | "contacts_except" | "none") => call("set-photo-visualization", { value }),
  setPrivacyDescription: (value: "all" | "contacts" | "contacts_except" | "none") => call("set-privacy-description", { value }),
  setGroupAddPermission: (value: "all" | "contacts" | "contacts_except" | "none") => call("set-group-add-permission", { value }),
  setPrivacyOnline: (value: "all" | "match_last_seen") => call("set-privacy-online", { value }),
  setReadReceipts: (value: "all" | "none") => call("set-read-receipts", { value }),
  setMessagesDuration: (value: "24_HOURS" | "7_DAYS" | "90_DAYS" | "OFF") => call("set-messages-duration", { value }),

  // ========= CONTATOS =========
  getContacts: (page = 1, pageSize = 20) => call("get-contacts", { page, pageSize }),
  addContact: (phone: string, firstName: string, lastName?: string) => call("add-contact", { phone, firstName, lastName }),
  removeContact: (phone: string) => call("remove-contact", { phone }),
  getContactMetadata: (phone: string) => call("get-metadata-contact", { phone }),
  getContactProfilePicture: (phone: string) => call("get-profile-picture-contact", { phone }),
  reportContact: (phone: string) => call("report-contact", { phone }),
};