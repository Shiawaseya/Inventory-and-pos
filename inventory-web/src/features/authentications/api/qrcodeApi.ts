import type { QRCodeGenerateRequest, QRCodeGenerateResponse, QRCodeVerifyRequest, QRCodeVerifyResponse, QRCodeData } from "../types/qrcode";
import { loginApi } from "./loginApi";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost/inventory_management_api";

/**
 * QR Code API Service
 * Handles QR code generation, storage, and verification
 */
export const qrcodeApi = {
  /**
   * Generate and store a QR code
   * @param request - QR code generation request
   * @returns Promise with QR code response
   */
  generateQRCode: async (request: QRCodeGenerateRequest): Promise<QRCodeGenerateResponse> => {
    try {
      const token = loginApi.getToken();
      
      const response = await fetch(`${API_BASE_URL}/qrcode/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token && { "Authorization": `Bearer ${token}` }),
        },
        body: JSON.stringify(request),
      });

      const data: QRCodeGenerateResponse = await response.json();

      if (!response.ok) {
        return {
          success: false,
          message: data.message || "Failed to generate QR code",
          error: data.error,
        };
      }

      return data;
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : "Network error occurred",
        error: "NETWORK_ERROR",
      };
    }
  },

  /**
   * Verify a QR code by its code
   * @param request - QR code verification request
   * @returns Promise with QR code data if valid
   */
  verifyQRCode: async (request: QRCodeVerifyRequest): Promise<QRCodeVerifyResponse> => {
    try {
      const response = await fetch(`${API_BASE_URL}/qrcode/verify`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(request),
      });

      const data: QRCodeVerifyResponse = await response.json();

      if (!response.ok) {
        return {
          success: false,
          message: data.message || "QR code verification failed",
        };
      }

      return data;
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : "Network error occurred",
      };
    }
  },

  /**
   * Get a QR code by its ID
   * @param qrcodeId - QR code ID
   * @returns Promise with QR code data
   */
  getQRCode: async (qrcodeId: string): Promise<QRCodeData | null> => {
    try {
      const token = loginApi.getToken();
      
      const response = await fetch(`${API_BASE_URL}/qrcode/${qrcodeId}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          ...(token && { "Authorization": `Bearer ${token}` }),
        },
      });

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      return data.data || data;
    } catch (error) {
      console.error("Error fetching QR code:", error);
      return null;
    }
  },

  /**
   * Get all QR codes (admin/staff)
   * @returns Promise with list of QR codes
   */
  getAllQRCodes: async (): Promise<QRCodeData[]> => {
    try {
      const token = loginApi.getToken();
      
      const response = await fetch(`${API_BASE_URL}/qrcode`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          ...(token && { "Authorization": `Bearer ${token}` }),
        },
      });

      if (!response.ok) {
        return [];
      }

      const data = await response.json();
      return data.data || [];
    } catch (error) {
      console.error("Error fetching QR codes:", error);
      return [];
    }
  },

  /**
   * Delete a QR code
   * @param qrcodeId - QR code ID
   * @returns Promise with success status
   */
  deleteQRCode: async (qrcodeId: string): Promise<boolean> => {
    try {
      const token = loginApi.getToken();
      
      const response = await fetch(`${API_BASE_URL}/qrcode/${qrcodeId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          ...(token && { "Authorization": `Bearer ${token}` }),
        },
      });

      return response.ok;
    } catch (error) {
      console.error("Error deleting QR code:", error);
      return false;
    }
  },
};
