import api from './api';

export interface DeliveryItem {
  productId: string;
  quantity: number;
}

export interface DeliveryRequest {
  employeeId: string;
  items: DeliveryItem[];
}

export interface DeliverySignatureRequest {
  signatureBase64: string;
  origin: 'TABLET' | 'REMOTE_LINK';
}

export const deliveryService = {
  createDelivery: async (data: DeliveryRequest) => {
    const response = await api.post('/deliveries', data);
    return response.data;
  },

  getDeliveries: async () => {
    const response = await api.get('/deliveries');
    return response.data;
  },

  signTablet: async (deliveryId: string, data: DeliverySignatureRequest) => {
    const response = await api.post(`/deliveries/${deliveryId}/sign`, data);
    return response.data;
  },

  getDelivery: async (deliveryId: string) => {
    const response = await api.get(`/deliveries/${deliveryId}`);
    return response.data;
  },

  // Public methods for remote signature
  getPublicDelivery: async (token: string) => {
    const response = await api.get(`/public/deliveries/token/${token}`);
    return response.data;
  },

  getPublicDeliveryV2: async (token: string) => {
    // In case the token is passed as part of the URL in a different way
    const response = await api.get(`/public/deliveries/token/${token}`);
    return response.data;
  },

  signRemote: async (token: string, data: DeliverySignatureRequest) => {
    const response = await api.post(`/public/deliveries/token/${token}/sign`, data, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    return response.data;
  }
};

export default deliveryService;
