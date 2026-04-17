[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string[]]$SearchBase,

    [Parameter(Mandatory = $false)]
    [string]$OutputFile = ".\ad-data.json"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

if (-not (Get-Module -ListAvailable -Name ActiveDirectory)) {
    throw "Module 'ActiveDirectory' is not available. Install RSAT tools and try again."
}

Import-Module ActiveDirectory

$searchBases = $SearchBase | ForEach-Object { $_.Trim() } | Where-Object { $_ }
if ($searchBases.Count -eq 0) {
    throw "No valid SearchBase values provided."
}

$allAdObjects = New-Object System.Collections.Generic.List[object]

foreach ($base in $searchBases) {
    Write-Host "Reading child objects under: $base"
    $adObjects = Get-ADObject `
        -SearchBase $base `
        -SearchScope OneLevel `
        -Filter * `
        -Properties cn, department, lastLogon, title, whenCreated
    foreach ($obj in $adObjects) {
        $allAdObjects.Add($obj)
    }
}

$result = foreach ($obj in $allAdObjects) {
    $lastLogonValue = $null
    if ($null -ne $obj.lastLogon -and [int64]$obj.lastLogon -gt 0) {
        $lastLogonValue = [DateTime]::FromFileTimeUtc([int64]$obj.lastLogon).ToString("o")
    }

    [PSCustomObject]@{
        cn          = $obj.cn
        department  = $obj.department
        lastLogon   = $lastLogonValue
        title       = $obj.title
        active      = -not ([string]$obj.DistinguishedName -match "disabled")
        whenCreated = if ($obj.whenCreated) { ([DateTime]$obj.whenCreated).ToString("o") } else { $null }
    }
}

$result | ConvertTo-Json -Depth 3 | Out-File -FilePath $OutputFile -Encoding UTF8

Write-Host "Saved $($result.Count) object(s) to: $OutputFile"
