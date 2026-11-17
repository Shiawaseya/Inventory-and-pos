import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AlertCircle, CheckCircle } from "lucide-react"
import { useQRCodeGenerator } from "../hooks/useQRCodeGenerator"
import { useRoles } from "../queries/useRoles"
import { GeneratedQRCodeDialog } from "../view/GeneratedQRCodeDialog"

export function QRCodeGenerator() {
  const {
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
  } = useQRCodeGenerator()

  const { roles, isLoading: rolesLoading } = useRoles()

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Generate Sign-up QR Code</CardTitle>
          <CardDescription>Create a QR code for users to scan and start account creation</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="role-select">Select Role</Label>
            <Select
              value={selectedRole ?? ""}
              onValueChange={(value) => setSelectedRole(value)}
              disabled={rolesLoading}
            >
              <SelectTrigger id="role-select">
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                {roles.map((r) => (
                  <SelectItem key={r.id || r.key} value={String(r.id)}>
                    {r.displayName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {qrCodeImage && qrCode ? (
            <div className="flex gap-3">
              <Button onClick={handleGenerateQRCode} disabled={loading} className="flex-1">
                {loading ? "Generating..." : "Generate QR Code"}
              </Button>
              <Button variant="outline" className="flex-1" onClick={() => setIsQrModalOpen(true)}>
                View Latest QR Code
              </Button>
            </div>
          ) : (
            <Button onClick={handleGenerateQRCode} disabled={loading} className="w-full">
              {loading ? "Generating..." : "Generate QR Code"}
            </Button>
          )}
        </CardContent>
      </Card>

      {qrCodeImage && qrCode && (
        <GeneratedQRCodeDialog
          open={isQrModalOpen}
          onOpenChange={setIsQrModalOpen}
          qrCode={qrCode}
          qrCodeImage={qrCodeImage}
          copied={copied}
          onCopyId={() => handleCopyText(qrCode.id)}
          onCopyCode={() => handleCopyText(qrCode.code)}
          onDownload={handleDownloadQRCode}
          onGenerateNew={handleGenerateQRCode}
        />
      )}
    </div>
  )
}
