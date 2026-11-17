import { create } from "zustand"
import type { QRCodeData } from "../types/qrcode"

type QRCodeState = {
  qrCode: QRCodeData | null
  qrCodeImage: string
  loading: boolean
  error: string | null
  success: string | null
  copied: boolean
  isQrModalOpen: boolean
  setQRCode: (value: QRCodeData | null) => void
  setQRCodeImage: (value: string) => void
  setLoading: (value: boolean) => void
  setError: (value: string | null) => void
  setSuccess: (value: string | null) => void
  setCopied: (value: boolean) => void
  setIsQrModalOpen: (value: boolean) => void
  resetFeedback: () => void
}

export const useQRCodeStore = create<QRCodeState>((set) => ({
  qrCode: null,
  qrCodeImage: "",
  loading: false,
  error: null,
  success: null,
  copied: false,
  isQrModalOpen: false,
  setQRCode: (value) => set({ qrCode: value }),
  setQRCodeImage: (value) => set({ qrCodeImage: value }),
  setLoading: (value) => set({ loading: value }),
  setError: (value) => set({ error: value }),
  setSuccess: (value) => set({ success: value }),
  setCopied: (value) => set({ copied: value }),
  setIsQrModalOpen: (value) => set({ isQrModalOpen: value }),
  resetFeedback: () => set({ error: null, success: null, copied: false }),
}))
