# OwlCut print helper for Windows (Windows PowerShell 5.1, no extra install).
# Prints one image scaled to fit the page, without any print dialog.
# NOTE: keep this file ASCII-only (PowerShell 5.1 reads BOM-less files as ANSI).
param(
  [Parameter(Mandatory = $true)][string]$Path,
  [string]$Printer = "",
  [int]$Copies = 1
)

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Drawing

$img = [System.Drawing.Image]::FromFile($Path)
try {
  $doc = New-Object System.Drawing.Printing.PrintDocument
  if ($Printer) { $doc.PrinterSettings.PrinterName = $Printer }
  if (-not $doc.PrinterSettings.IsValid) {
    throw "Printer not found: $($doc.PrinterSettings.PrinterName)"
  }
  $doc.DocumentName = "OwlCut"
  $doc.PrinterSettings.Copies = [int16]$Copies
  # Hide the "Printing..." progress dialog
  $doc.PrintController = New-Object System.Drawing.Printing.StandardPrintController
  $doc.DefaultPageSettings.Margins = New-Object System.Drawing.Printing.Margins(0, 0, 0, 0)
  # Wide image -> landscape, tall strip -> portrait
  $doc.DefaultPageSettings.Landscape = ($img.Width -gt $img.Height)

  $doc.add_PrintPage({
      param($sender, $e)
      $area = $e.MarginBounds
      $scale = [Math]::Min($area.Width / $img.Width, $area.Height / $img.Height)
      $w = $img.Width * $scale
      $h = $img.Height * $scale
      $x = $area.X + ($area.Width - $w) / 2
      $y = $area.Y + ($area.Height - $h) / 2
      $e.Graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
      $e.Graphics.DrawImage($img, [float]$x, [float]$y, [float]$w, [float]$h)
      $e.HasMorePages = $false
    })

  $doc.Print()
}
finally {
  $img.Dispose()
}
