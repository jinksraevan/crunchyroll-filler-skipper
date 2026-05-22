Add-Type -AssemblyName System.Drawing

$OutputDirectory = "C:\Projects\crunchyroll-filler-skipper\store-assets"
$PopupScreenshotPath = "C:\Users\Sloane\Downloads\screenshot.png"
$IconPath = "C:\Projects\crunchyroll-filler-skipper\icons\icon-128.png"

New-Item -ItemType Directory -Force -Path $OutputDirectory | Out-Null
Get-ChildItem -Path $OutputDirectory -Filter "*.png" | Where-Object { $_.Name -ne "test-font.png" } | Remove-Item

function NewStoreBitmap {
  param(
    [int]$Width,
    [int]$Height
  )

  $Bitmap = [System.Drawing.Bitmap]::new($Width, $Height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $Bitmap.SetResolution(96, 96)
  return $Bitmap
}

function NewStoreGraphics {
  param(
    [System.Drawing.Bitmap]$Bitmap
  )

  $Graphics = [System.Drawing.Graphics]::FromImage($Bitmap)
  $Graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $Graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $Graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $Graphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
  return $Graphics
}

function NewStoreFont {
  param(
    [string]$Name,
    [float]$Size,
    [System.Drawing.FontStyle]$Style
  )

  return [System.Drawing.Font]::new($Name, $Size, $Style, [System.Drawing.GraphicsUnit]::Pixel)
}

function DrawStoreRoundRect {
  param(
    [System.Drawing.Graphics]$Graphics,
    [System.Drawing.RectangleF]$Rectangle,
    [float]$Radius,
    [System.Drawing.Brush]$Brush,
    [System.Drawing.Pen]$Pen
  )

  $Path = [System.Drawing.Drawing2D.GraphicsPath]::new()
  $Diameter = $Radius * 2
  $Path.AddArc($Rectangle.X, $Rectangle.Y, $Diameter, $Diameter, 180, 90)
  $Path.AddArc($Rectangle.Right - $Diameter, $Rectangle.Y, $Diameter, $Diameter, 270, 90)
  $Path.AddArc($Rectangle.Right - $Diameter, $Rectangle.Bottom - $Diameter, $Diameter, $Diameter, 0, 90)
  $Path.AddArc($Rectangle.X, $Rectangle.Bottom - $Diameter, $Diameter, $Diameter, 90, 90)
  $Path.CloseFigure()

  if ($null -ne $Brush) {
    $Graphics.FillPath($Brush, $Path)
  }

  if ($null -ne $Pen) {
    $Graphics.DrawPath($Pen, $Path)
  }

  $Path.Dispose()
}

function DrawStoreText {
  param(
    [System.Drawing.Graphics]$Graphics,
    [string]$Text,
    [float]$X,
    [float]$Y,
    [float]$Width,
    [float]$Height,
    [float]$Size,
    [System.Drawing.FontStyle]$Style,
    [System.Drawing.Color]$Color
  )

  $Font = NewStoreFont -Name "Segoe UI" -Size $Size -Style $Style
  $Brush = [System.Drawing.SolidBrush]::new($Color)
  $Format = [System.Drawing.StringFormat]::new()
  $Format.Trimming = [System.Drawing.StringTrimming]::EllipsisWord
  $Format.FormatFlags = [System.Drawing.StringFormatFlags]::LineLimit
  $Rectangle = [System.Drawing.RectangleF]::new($X, $Y, $Width, $Height)
  $Graphics.DrawString($Text, $Font, $Brush, $Rectangle, $Format)
  $Format.Dispose()
  $Brush.Dispose()
  $Font.Dispose()
}

function DrawStoreCenteredText {
  param(
    [System.Drawing.Graphics]$Graphics,
    [string]$Text,
    [float]$X,
    [float]$Y,
    [float]$Width,
    [float]$Height,
    [float]$Size,
    [System.Drawing.FontStyle]$Style,
    [System.Drawing.Color]$Color
  )

  $Font = NewStoreFont -Name "Segoe UI" -Size $Size -Style $Style
  $Brush = [System.Drawing.SolidBrush]::new($Color)
  $Format = [System.Drawing.StringFormat]::new()
  $Format.Alignment = [System.Drawing.StringAlignment]::Center
  $Format.LineAlignment = [System.Drawing.StringAlignment]::Center
  $Format.Trimming = [System.Drawing.StringTrimming]::EllipsisWord
  $Rectangle = [System.Drawing.RectangleF]::new($X, $Y, $Width, $Height)
  $Graphics.DrawString($Text, $Font, $Brush, $Rectangle, $Format)
  $Format.Dispose()
  $Brush.Dispose()
  $Font.Dispose()
}

function DrawStoreBackdrop {
  param(
    [System.Drawing.Graphics]$Graphics,
    [int]$Width,
    [int]$Height
  )

  $Rectangle = [System.Drawing.Rectangle]::new(0, 0, $Width, $Height)
  $Brush = [System.Drawing.Drawing2D.LinearGradientBrush]::new(
    $Rectangle,
    [System.Drawing.Color]::FromArgb(10, 12, 24),
    [System.Drawing.Color]::FromArgb(21, 20, 45),
    35
  )
  $Graphics.FillRectangle($Brush, $Rectangle)
  $Brush.Dispose()

  $AccentBrush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(28, 255, 112, 67))
  $Graphics.FillEllipse($AccentBrush, -180, -120, 520, 520)
  $Graphics.FillEllipse($AccentBrush, $Width - 330, $Height - 250, 520, 520)
  $AccentBrush.Dispose()
}

function DrawStoreChip {
  param(
    [System.Drawing.Graphics]$Graphics,
    [string]$Text,
    [float]$X,
    [float]$Y,
    [float]$Width,
    [System.Drawing.Color]$Fill,
    [System.Drawing.Color]$Stroke,
    [System.Drawing.Color]$TextColor
  )

  $Brush = [System.Drawing.SolidBrush]::new($Fill)
  $Pen = [System.Drawing.Pen]::new($Stroke, 2)
  DrawStoreRoundRect -Graphics $Graphics -Rectangle ([System.Drawing.RectangleF]::new($X, $Y, $Width, 58)) -Radius 12 -Brush $Brush -Pen $Pen
  DrawStoreCenteredText -Graphics $Graphics -Text $Text -X $X -Y ($Y + 2) -Width $Width -Height 52 -Size 21 -Style ([System.Drawing.FontStyle]::Bold) -Color $TextColor
  $Brush.Dispose()
  $Pen.Dispose()
}

function DrawStorePopup {
  param(
    [System.Drawing.Graphics]$Graphics,
    [float]$X,
    [float]$Y,
    [float]$Width,
    [float]$Height
  )

  $Popup = [System.Drawing.Image]::FromFile($PopupScreenshotPath)
  $Scale = [Math]::Min($Width / $Popup.Width, $Height / $Popup.Height)
  $DrawWidth = $Popup.Width * $Scale
  $DrawHeight = $Popup.Height * $Scale
  $DrawX = $X + (($Width - $DrawWidth) / 2)
  $DrawY = $Y + (($Height - $DrawHeight) / 2)
  $ShadowBrush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(90, 0, 0, 0))
  DrawStoreRoundRect -Graphics $Graphics -Rectangle ([System.Drawing.RectangleF]::new($DrawX + 18, $DrawY + 18, $DrawWidth, $DrawHeight)) -Radius 22 -Brush $ShadowBrush -Pen $null
  $ShadowBrush.Dispose()
  $Graphics.DrawImage($Popup, [System.Drawing.RectangleF]::new($DrawX, $DrawY, $DrawWidth, $DrawHeight))
  $Popup.Dispose()
}

function DrawStoreBrowserMock {
  param(
    [System.Drawing.Graphics]$Graphics,
    [float]$X,
    [float]$Y,
    [float]$Width,
    [float]$Height
  )

  $PanelBrush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(22, 24, 38))
  $OutlinePen = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(86, 90, 122), 2)
  DrawStoreRoundRect -Graphics $Graphics -Rectangle ([System.Drawing.RectangleF]::new($X, $Y, $Width, $Height)) -Radius 16 -Brush $PanelBrush -Pen $OutlinePen

  $BarBrush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(14, 16, 28))
  DrawStoreRoundRect -Graphics $Graphics -Rectangle ([System.Drawing.RectangleF]::new($X, $Y, $Width, 68)) -Radius 16 -Brush $BarBrush -Pen $null

  $ScreenBrush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(7, 8, 16))
  $Graphics.FillRectangle($ScreenBrush, $X + 24, $Y + 88, $Width - 48, $Height - 118)
  DrawStoreCenteredText -Graphics $Graphics -Text "Naruto Episode 7" -X ($X + 24) -Y ($Y + 180) -Width ($Width - 48) -Height 56 -Size 34 -Style ([System.Drawing.FontStyle]::Bold) -Color ([System.Drawing.Color]::White)

  $BannerBrush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(245, 255, 112, 67))
  DrawStoreRoundRect -Graphics $Graphics -Rectangle ([System.Drawing.RectangleF]::new($X + 58, $Y + $Height - 122, $Width - 116, 58)) -Radius 12 -Brush $BannerBrush -Pen $null
  DrawStoreCenteredText -Graphics $Graphics -Text "Skipping episode 7" -X ($X + 58) -Y ($Y + $Height - 118) -Width ($Width - 116) -Height 48 -Size 23 -Style ([System.Drawing.FontStyle]::Bold) -Color ([System.Drawing.Color]::White)

  DrawStoreText -Graphics $Graphics -Text "crunchyroll.com/watch/episode" -X ($X + 130) -Y ($Y + 20) -Width ($Width - 180) -Height 28 -Size 19 -Style ([System.Drawing.FontStyle]::Regular) -Color ([System.Drawing.Color]::FromArgb(169, 178, 238))

  $RedBrush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(255, 112, 67))
  $YellowBrush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(255, 194, 56))
  $GreenBrush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(59, 255, 126))
  $Graphics.FillEllipse($RedBrush, $X + 24, $Y + 23, 18, 18)
  $Graphics.FillEllipse($YellowBrush, $X + 52, $Y + 23, 18, 18)
  $Graphics.FillEllipse($GreenBrush, $X + 80, $Y + 23, 18, 18)

  $RedBrush.Dispose()
  $YellowBrush.Dispose()
  $GreenBrush.Dispose()
  $PanelBrush.Dispose()
  $OutlinePen.Dispose()
  $BarBrush.Dispose()
  $ScreenBrush.Dispose()
  $BannerBrush.Dispose()
}

function SaveStorePng {
  param(
    [System.Drawing.Bitmap]$Bitmap,
    [string]$FileName
  )

  $Bitmap.Save((Join-Path $OutputDirectory $FileName), [System.Drawing.Imaging.ImageFormat]::Png)
}

function NewStoreScreenshot {
  param(
    [string]$FileName,
    [string]$Headline,
    [string]$Subhead,
    [string[]]$Chips,
    [bool]$UseBrowserMock
  )

  $Bitmap = NewStoreBitmap -Width 1280 -Height 800
  $Graphics = NewStoreGraphics -Bitmap $Bitmap
  DrawStoreBackdrop -Graphics $Graphics -Width 1280 -Height 800

  $Icon = [System.Drawing.Image]::FromFile($IconPath)
  $Graphics.DrawImage($Icon, [System.Drawing.RectangleF]::new(88, 76, 72, 72))
  $Icon.Dispose()

  DrawStoreText -Graphics $Graphics -Text "Crunchyroll Filler Skipper" -X 178 -Y 78 -Width 520 -Height 50 -Size 34 -Style ([System.Drawing.FontStyle]::Bold) -Color ([System.Drawing.Color]::White)
  DrawStoreText -Graphics $Graphics -Text $Headline -X 86 -Y 180 -Width 590 -Height 160 -Size 56 -Style ([System.Drawing.FontStyle]::Bold) -Color ([System.Drawing.Color]::White)
  DrawStoreText -Graphics $Graphics -Text $Subhead -X 90 -Y 345 -Width 500 -Height 120 -Size 28 -Style ([System.Drawing.FontStyle]::Regular) -Color ([System.Drawing.Color]::FromArgb(199, 207, 255))

  $ChipY = 506
  foreach ($Chip in $Chips) {
    DrawStoreChip -Graphics $Graphics -Text $Chip -X 92 -Y $ChipY -Width 250 -Fill ([System.Drawing.Color]::FromArgb(18, 25, 43)) -Stroke ([System.Drawing.Color]::FromArgb(78, 255, 132)) -TextColor ([System.Drawing.Color]::FromArgb(235, 255, 241))
    $ChipY += 74
  }

  if ($UseBrowserMock) {
    DrawStoreBrowserMock -Graphics $Graphics -X 650 -Y 118 -Width 520 -Height 548
    DrawStorePopup -Graphics $Graphics -X 890 -Y 240 -Width 250 -Height 350
  } else {
    DrawStorePopup -Graphics $Graphics -X 700 -Y 70 -Width 430 -Height 650
  }

  SaveStorePng -Bitmap $Bitmap -FileName $FileName
  $Graphics.Dispose()
  $Bitmap.Dispose()
}

NewStoreScreenshot -FileName "screenshot-01-overview-1280x800.png" -Headline "Skip filler automatically" -Subhead "Detects the current show, loads episode data, and applies your selected watch mode on Crunchyroll." -Chips @("Auto-detect shows", "AnimeFillerList data", "Local settings") -UseBrowserMock $false
NewStoreScreenshot -FileName "screenshot-02-watch-modes-1280x800.png" -Headline "Choose your watch path" -Subhead "Pick Canon Only, Canon + Mixed, or Filler Only and let the extension handle the rest." -Chips @("Canon Only", "Canon + Mixed", "Filler Only") -UseBrowserMock $false
NewStoreScreenshot -FileName "screenshot-03-skip-banner-1280x800.png" -Headline "Stay in the episode flow" -Subhead "When an episode should be skipped, the extension advances and shows a simple status banner." -Chips @("Skip chains", "In-page banner", "No dashboard") -UseBrowserMock $true
NewStoreScreenshot -FileName "screenshot-04-source-status-1280x800.png" -Headline "Transparent episode data" -Subhead "The popup shows the resolved source, episode counts, classification, and current skip decision." -Chips @("Source link", "Episode counts", "Debug status") -UseBrowserMock $false

$SmallBitmap = NewStoreBitmap -Width 440 -Height 280
$SmallGraphics = NewStoreGraphics -Bitmap $SmallBitmap
DrawStoreBackdrop -Graphics $SmallGraphics -Width 440 -Height 280
$Icon = [System.Drawing.Image]::FromFile($IconPath)
$SmallGraphics.DrawImage($Icon, [System.Drawing.RectangleF]::new(30, 32, 58, 58))
$Icon.Dispose()
DrawStoreText -Graphics $SmallGraphics -Text "Filler Skipper" -X 102 -Y 32 -Width 300 -Height 46 -Size 33 -Style ([System.Drawing.FontStyle]::Bold) -Color ([System.Drawing.Color]::White)
DrawStoreText -Graphics $SmallGraphics -Text "Watch the episodes you want." -X 104 -Y 80 -Width 285 -Height 32 -Size 19 -Style ([System.Drawing.FontStyle]::Regular) -Color ([System.Drawing.Color]::FromArgb(206, 214, 255))
DrawStorePopup -Graphics $SmallGraphics -X 242 -Y 102 -Width 160 -Height 150
DrawStoreChip -Graphics $SmallGraphics -Text "Auto skip filler" -X 30 -Y 156 -Width 178 -Fill ([System.Drawing.Color]::FromArgb(24, 32, 52)) -Stroke ([System.Drawing.Color]::FromArgb(78, 255, 132)) -TextColor ([System.Drawing.Color]::White)
SaveStorePng -Bitmap $SmallBitmap -FileName "small-promo-tile-440x280.png"
$SmallGraphics.Dispose()
$SmallBitmap.Dispose()

$LargeBitmap = NewStoreBitmap -Width 920 -Height 680
$LargeGraphics = NewStoreGraphics -Bitmap $LargeBitmap
DrawStoreBackdrop -Graphics $LargeGraphics -Width 920 -Height 680
$Icon = [System.Drawing.Image]::FromFile($IconPath)
$LargeGraphics.DrawImage($Icon, [System.Drawing.RectangleF]::new(70, 74, 86, 86))
$Icon.Dispose()
DrawStoreText -Graphics $LargeGraphics -Text "Crunchyroll Filler Skipper" -X 180 -Y 76 -Width 560 -Height 56 -Size 42 -Style ([System.Drawing.FontStyle]::Bold) -Color ([System.Drawing.Color]::White)
DrawStoreText -Graphics $LargeGraphics -Text "Skip filler automatically" -X 68 -Y 218 -Width 420 -Height 150 -Size 60 -Style ([System.Drawing.FontStyle]::Bold) -Color ([System.Drawing.Color]::White)
DrawStoreText -Graphics $LargeGraphics -Text "Choose Canon Only, Canon + Mixed, or Filler Only." -X 72 -Y 385 -Width 390 -Height 84 -Size 25 -Style ([System.Drawing.FontStyle]::Regular) -Color ([System.Drawing.Color]::FromArgb(202, 210, 255))
DrawStorePopup -Graphics $LargeGraphics -X 560 -Y 80 -Width 275 -Height 500
DrawStoreChip -Graphics $LargeGraphics -Text "AnimeFillerList data" -X 72 -Y 510 -Width 290 -Fill ([System.Drawing.Color]::FromArgb(24, 32, 52)) -Stroke ([System.Drawing.Color]::FromArgb(255, 112, 67)) -TextColor ([System.Drawing.Color]::White)
SaveStorePng -Bitmap $LargeBitmap -FileName "large-promo-tile-920x680.png"
$LargeGraphics.Dispose()
$LargeBitmap.Dispose()

$MarqueeBitmap = NewStoreBitmap -Width 1400 -Height 560
$MarqueeGraphics = NewStoreGraphics -Bitmap $MarqueeBitmap
DrawStoreBackdrop -Graphics $MarqueeGraphics -Width 1400 -Height 560
$Icon = [System.Drawing.Image]::FromFile($IconPath)
$MarqueeGraphics.DrawImage($Icon, [System.Drawing.RectangleF]::new(92, 86, 86, 86))
$Icon.Dispose()
DrawStoreText -Graphics $MarqueeGraphics -Text "Crunchyroll Filler Skipper" -X 205 -Y 90 -Width 620 -Height 56 -Size 42 -Style ([System.Drawing.FontStyle]::Bold) -Color ([System.Drawing.Color]::White)
DrawStoreText -Graphics $MarqueeGraphics -Text "Skip filler. Keep watching." -X 92 -Y 212 -Width 830 -Height 96 -Size 64 -Style ([System.Drawing.FontStyle]::Bold) -Color ([System.Drawing.Color]::White)
DrawStoreText -Graphics $MarqueeGraphics -Text "Automatic episode decisions powered by AnimeFillerList classifications." -X 98 -Y 325 -Width 680 -Height 78 -Size 27 -Style ([System.Drawing.FontStyle]::Regular) -Color ([System.Drawing.Color]::FromArgb(204, 212, 255))
DrawStoreChip -Graphics $MarqueeGraphics -Text "Canon Only" -X 100 -Y 438 -Width 180 -Fill ([System.Drawing.Color]::FromArgb(19, 32, 49)) -Stroke ([System.Drawing.Color]::FromArgb(78, 255, 132)) -TextColor ([System.Drawing.Color]::White)
DrawStoreChip -Graphics $MarqueeGraphics -Text "Canon + Mixed" -X 304 -Y 438 -Width 210 -Fill ([System.Drawing.Color]::FromArgb(19, 32, 49)) -Stroke ([System.Drawing.Color]::FromArgb(82, 132, 255)) -TextColor ([System.Drawing.Color]::White)
DrawStoreChip -Graphics $MarqueeGraphics -Text "Filler Only" -X 538 -Y 438 -Width 180 -Fill ([System.Drawing.Color]::FromArgb(19, 32, 49)) -Stroke ([System.Drawing.Color]::FromArgb(255, 93, 138)) -TextColor ([System.Drawing.Color]::White)
DrawStorePopup -Graphics $MarqueeGraphics -X 980 -Y 40 -Width 300 -Height 490
SaveStorePng -Bitmap $MarqueeBitmap -FileName "marquee-promo-tile-1400x560.png"
$MarqueeGraphics.Dispose()
$MarqueeBitmap.Dispose()

Get-ChildItem -Path $OutputDirectory -Filter "*.png" | Sort-Object Name | ForEach-Object {
  $Image = [System.Drawing.Image]::FromFile($_.FullName)
  [PSCustomObject]@{
    File = $_.Name
    Width = $Image.Width
    Height = $Image.Height
    Bytes = $_.Length
  }
  $Image.Dispose()
}
