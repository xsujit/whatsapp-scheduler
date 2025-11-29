# tree-md.ps1 — Generate pretty tree output identical to "tree /F"
# Usage: .\tree-md.ps1 > structure.md

param(
    [string]$Path = ".",
    [string[]]$Exclude = @("node_modules", "baileys_session", ".git", ".next"),
    [string]$Prefix = ""
)

function Show-Tree {
    param(
        [string]$Path,
        [string[]]$Exclude,
        [string]$Prefix
    )

    $items = Get-ChildItem -LiteralPath $Path -Force | Sort-Object PSIsContainer, Name
    $count = $items.Count

    for ($i = 0; $i -lt $count; $i++) {
        $item = $items[$i]
        $isLast = ($i -eq $count - 1)

        # Unicode branch characters (render correctly on all systems)
        $tee  = [string]([char]0x251C) + [string]([char]0x2500) + [string]([char]0x2500) + " "   # ├──
        $elbow = [string]([char]0x2514) + [string]([char]0x2500) + [string]([char]0x2500) + " "  # └──
        $pipe = [string]([char]0x2502)                                                            # │

        $branch = if ($isLast) { $elbow } else { $tee }
        $newPrefix = if ($isLast) { "$Prefix    " } else { "$Prefix$pipe   " }

        if ($item.PSIsContainer -and ($Exclude -notcontains $item.Name)) {
            Write-Output ("$Prefix$branch$item/")
            Show-Tree -Path $item.FullName -Exclude $Exclude -Prefix $newPrefix
        } elseif (-not $item.PSIsContainer) {
            Write-Output ("$Prefix$branch$item")
        }
    }
}

Write-Output "Project Structure"
Show-Tree -Path $Path -Exclude $Exclude -Prefix ""
