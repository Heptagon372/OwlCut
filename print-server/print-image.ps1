# OwlCut print helper for Windows (Windows PowerShell 5.1, no extra install).
# Prints one image scaled to fit the page, without any print dialog.
# NOTE: keep this file ASCII-only (PowerShell 5.1 reads BOM-less files as ANSI).
param(
  [Parameter(Mandatory = $true)][string]$Path,
  [string]$Printer = "",
  [int]$Copies = 1,
  [int]$WidthMm = 0,
  [int]$HeightMm = 0
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

  # Paper size requested by the booth (mm -> hundredths of an inch).
  # Prefer a paper the printer already has (photo printers expose 4x6 etc.); fall back to a custom size.
  if ($WidthMm -gt 0 -and $HeightMm -gt 0) {
    $wantW = [int][Math]::Round($WidthMm / 25.4 * 100)
    $wantH = [int][Math]::Round($HeightMm / 25.4 * 100)
    $match = $null
    foreach ($p in $doc.PrinterSettings.PaperSizes) {
      $fits = ([Math]::Abs($p.Width - $wantW) -le 8 -and [Math]::Abs($p.Height - $wantH) -le 8) -or
              ([Math]::Abs($p.Width - $wantH) -le 8 -and [Math]::Abs($p.Height - $wantW) -le 8)
      if ($fits) { $match = $p; break }
    }
    if ($match) {
      $doc.DefaultPageSettings.PaperSize = $match
    }
    else {
      $custom = New-Object System.Drawing.Printing.PaperSize("OwlCut", $wantW, $wantH)
      $custom.RawKind = 0
      $doc.DefaultPageSettings.PaperSize = $custom
    }
  }
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
