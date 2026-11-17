import { useState } from "react"
import QRCode from "qrcode"
import { qrcodeApi } from "../api/qrcodeApi"
import { useQRCodeStore } from "../store/qrCodeStore"
export function useQRCodeGenerator() {
  const [selectedRole, setSelectedRole] = useState<string | undefined>(undefined)
  
  const {
    qrCode,
    qrCodeImage,
    loading,
    error,
    success,
    copied,
    isQrModalOpen,
    setQRCode,
    setQRCodeImage,
    setLoading,
    setError,
    setSuccess,
    setCopied,
    setIsQrModalOpen,
    resetFeedback,
  } = useQRCodeStore()

  const handleGenerateQRCode = async () => {
    setLoading(true)
    resetFeedback()

    try {
      if (!selectedRole) {
        setError("Please select a role before generating a QR code")
        setLoading(false)
        return
      }

      const payload: any = {
        // send role_id as required by backend
        role_id: Number(selectedRole),
      }

      const response = await qrcodeApi.generateQRCode(payload)

      if (!response.success || !response.data) {
        setError(response.message || "Failed to generate QR code")
        return
      }

      setQRCode(response.data)

      const qrImage = await QRCode.toDataURL(response.data.code, {
        errorCorrectionLevel: "H",
        margin: 1,
        width: 300,
        color: {
          dark: "#000000",
          light: "#FFFFFF",
        },
      })

      setQRCodeImage(qrImage)
      setSuccess("QR code generated successfully!")
      setIsQrModalOpen(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setLoading(false)
    }
  }

  const handleCopyText = (value: string) => {
    navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDownloadQRCode = () => {
    if (!qrCodeImage) return

    const link = document.createElement("a")
    link.href = qrCodeImage
    link.download = `qrcode-${qrCode?.id || "signup"}.png`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return {
    qrCode,
    qrCodeImage,
    loading,
    error,
    success,
    copied,
    isQrModalOpen,
    selectedRole,
    setSelectedRole,
    setIsQrModalOpen,
    handleGenerateQRCode,
    handleCopyText,
    handleDownloadQRCode,
  }
}
