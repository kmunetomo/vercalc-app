'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Calculator, Info } from 'lucide-react'

interface AneurysmPanelProps {
  onVolumeChange: (volume: number) => void
}

export default function AneurysmPanel({ onVolumeChange }: AneurysmPanelProps) {
  const [xDiameter, setXDiameter] = useState<string>('')
  const [yDiameter, setYDiameter] = useState<string>('')
  const [zDiameter, setZDiameter] = useState<string>('')
  const [volume, setVolume] = useState<string>('')
  const [calculatedVolume, setCalculatedVolume] = useState<number>(0)
  const [isManualVolume, setIsManualVolume] = useState<boolean>(false)

  // 長楕球での体積計算 V = (4/3)π * a * b * c (a=X/2, b=Y/2, c=Z/2)
  const calculateEllipsoidVolume = (x: number, y: number, z: number): number => {
    const a = x / 2  // 半径 X軸
    const b = y / 2  // 半径 Y軸
    const c = z / 2  // 半径 Z軸
    return (4 / 3) * Math.PI * a * b * c
  }

  // 軸径から体積を自動計算
  useEffect(() => {
    if (xDiameter && yDiameter && zDiameter && !isManualVolume) {
      const xNum = parseFloat(xDiameter)
      const yNum = parseFloat(yDiameter)
      const zNum = parseFloat(zDiameter)
      
      if (!isNaN(xNum) && !isNaN(yNum) && !isNaN(zNum) && 
          xNum > 0 && yNum > 0 && zNum > 0) {
        const calcVol = calculateEllipsoidVolume(xNum, yNum, zNum)
        setCalculatedVolume(calcVol)
        setVolume(calcVol.toFixed(2))
        onVolumeChange(calcVol)
      }
    }
  }, [xDiameter, yDiameter, zDiameter, isManualVolume, onVolumeChange])

  // 手動体積入力時
  const handleVolumeChange = (value: string) => {
    setVolume(value)
    setIsManualVolume(true)
    const volumeNum = parseFloat(value)
    if (!isNaN(volumeNum) && volumeNum > 0) {
      setCalculatedVolume(volumeNum)
      onVolumeChange(volumeNum)
    }
  }

  // 軸径変更時（手動体積入力モードをリセット）
  const handleDiameterChange = (axis: 'x' | 'y' | 'z', value: string) => {
    switch (axis) {
      case 'x':
        setXDiameter(value)
        break
      case 'y':
        setYDiameter(value)
        break
      case 'z':
        setZDiameter(value)
        break
    }
    setIsManualVolume(false)
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Calculator className="h-5 w-5" />
          <span>動脈瘤情報</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 軸径入力 */}
        <div className="space-y-4">
          <Label className="text-sm font-medium">動脈瘤軸径 (mm)</Label>
          
          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1">
              <Label htmlFor="x-diameter" className="text-xs text-muted-foreground">X軸径</Label>
              <Input
                id="x-diameter"
                type="number"
                value={xDiameter}
                onChange={(e) => handleDiameterChange('x', e.target.value)}
                placeholder="X"
                min="0"
                step="0.1"
              />
            </div>
            
            <div className="space-y-1">
              <Label htmlFor="y-diameter" className="text-xs text-muted-foreground">Y軸径</Label>
              <Input
                id="y-diameter"
                type="number"
                value={yDiameter}
                onChange={(e) => handleDiameterChange('y', e.target.value)}
                placeholder="Y"
                min="0"
                step="0.1"
              />
            </div>
            
            <div className="space-y-1">
              <Label htmlFor="z-diameter" className="text-xs text-muted-foreground">Z軸径</Label>
              <Input
                id="z-diameter"
                type="number"
                value={zDiameter}
                onChange={(e) => handleDiameterChange('z', e.target.value)}
                placeholder="Z"
                min="0"
                step="0.1"
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* 体積入力/表示 */}
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <Label htmlFor="volume">体積 (mm³)</Label>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="h-4 w-4 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>瘤径から自動計算または直接入力</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <Input
            id="volume"
            type="number"
            value={volume}
            onChange={(e) => handleVolumeChange(e.target.value)}
            placeholder="体積を直接入力"
            min="0"
            step="0.1"
          />
          {isManualVolume && (
            <Badge variant="outline" className="text-xs">
              手動入力
            </Badge>
          )}
        </div>

        {/* 計算式表示 */}
        {xDiameter && yDiameter && zDiameter && !isManualVolume && (
          <div className="space-y-2">
            <Separator />
            <div className="text-sm text-muted-foreground">
              <div className="font-medium mb-1">計算式（楕円体）:</div>
              <div className="font-mono bg-muted p-2 rounded text-xs">
                V = (4/3)π × a × b × c<br />
                V = (4/3)π × {(parseFloat(xDiameter)/2).toFixed(1)} × {(parseFloat(yDiameter)/2).toFixed(1)} × {(parseFloat(zDiameter)/2).toFixed(1)}<br />
                V = {calculatedVolume.toFixed(2)} mm³
              </div>
            </div>
          </div>
        )}

        {/* サマリー */}
        {calculatedVolume > 0 && (
          <div className="space-y-2">
            <Separator />
            <div className="bg-primary/5 p-3 rounded-lg">
              <div className="text-sm font-medium text-primary mb-2">
                動脈瘤サマリー
              </div>
              <div className="space-y-1 text-sm">
                <div>
                  <span className="text-muted-foreground">軸径:</span> 
                  <span className="font-medium ml-1">{xDiameter || '-'} × {yDiameter || '-'} × {zDiameter || '-'} mm</span>
                </div>
                <div>
                  <span className="text-muted-foreground">体積:</span> 
                  <span className="font-medium ml-1">{calculatedVolume.toFixed(2)} mm³</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
} 