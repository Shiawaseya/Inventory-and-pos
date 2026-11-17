import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { QRCodeData } from "../types/qrcode"
import { Copy, Download } from "lucide-react"

type GeneratedQRCodeDialogProps = {
  open: boolean
  onOpenChange: (value: boolean) => void
  qrCode: QRCodeData
  qrCodeImage: string
  copied: boolean
  onCopyId: () => void
  onCopyCode: () => void
  onDownload: () => void
  onGenerateNew: () => void
}

export function GeneratedQRCodeDialog({
  open,
  onOpenChange,
  qrCode,
  qrCodeImage,
  copied,
  onCopyId,
  onCopyCode,
  onDownload,
  onGenerateNew,
}: GeneratedQRCodeDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Generated QR Code</DialogTitle>
          <DialogDescription>Share this QR code with your team</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="flex justify-center bg-muted p-6 rounded-lg">
            <img src={qrCodeImage} alt="Sign-up QR Code" className="w-80 h-80" />
          </div>

          <div className="space-y-3 p-4 bg-muted rounded-lg">
            <div>
              <label className="text-sm font-medium text-muted-foreground">QR Code ID</label>
              <div className="flex items-center gap-2 mt-1">
                <code className="flex-1 bg-background p-2 rounded border text-sm break-all">{qrCode.id}</code>
                <Button size="sm" variant="outline" onClick={onCopyId}>
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground">Code (for testing)</label>
              <div className="flex items-center gap-2 mt-1">
                <code className="flex-1 bg-background p-2 rounded border text-sm break-all">{qrCode.code}</code>
                <Button size="sm" variant="outline" onClick={onCopyCode}>
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
              {copied && <p className="text-xs text-green-600 mt-1">Copied!</p>}
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Role</p>
                <p className="font-medium capitalize">{qrCode.role.replace('_', ' ')}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Status</p>
                <p className="font-medium capitalize">{qrCode.status}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Branch ID</p>
                <p className="font-medium">{qrCode.branch_id}</p>
              </div>
              {qrCode.referred_by && (
                <div>
                  <p className="text-muted-foreground">Referred By</p>
                  <p className="font-medium">{qrCode.referred_by}</p>
                </div>
              )}
              <div>
                <p className="text-muted-foreground">Created</p>
                <p className="font-medium text-xs">{new Date(qrCode.created_at).toLocaleString()}</p>
              </div>
              {qrCode.expires_at && (
                <div>
                  <p className="text-muted-foreground">Expires</p>
                  <p className="font-medium text-xs">{new Date(qrCode.expires_at).toLocaleString()}</p>
                </div>
              )}
              {qrCode.used_at && (
                <div>
                  <p className="text-muted-foreground">Used At</p>
                  <p className="font-medium text-xs">{new Date(qrCode.used_at).toLocaleString()}</p>
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="sm:justify-between">
            <Button variant="outline" onClick={onDownload} className="flex-1 gap-2">
              <Download className="w-4 h-4" />
              Download QR Code
            </Button>
            <Button variant="outline" onClick={onGenerateNew} className="flex-1">
              Generate New
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}
