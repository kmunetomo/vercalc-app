'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Trash2, Download, Plus, Minus } from 'lucide-react'

// 使用コイルの型定義
interface SelectedCoil {
  id: number
  manufacturer: string
  coil_name: string
  primary_diameter_inch: number
  primary_diameter_mm: number
  secondary_diameter_mm: number
  length_cm: number
  volume_mm3: number
  min_catheter_lumen_inch: number
  is_azur_series: boolean
  azur_primary_diameter_inch?: number
  azur_primary_diameter_mm?: number
  azur_volume_mm3?: number
  swelling_ratio?: number
  quantity: number
  order: number
}

interface SelectedCoilsPanelProps {
  selectedCoils: SelectedCoil[]
  setSelectedCoils: (coils: SelectedCoil[]) => void
  aneurysmVolume: number
}

export default function SelectedCoilsPanel({ selectedCoils, setSelectedCoils, aneurysmVolume }: SelectedCoilsPanelProps) {
  const [currentVER, setCurrentVER] = useState<number>(0)
  const [totalCoilVolume, setTotalCoilVolume] = useState<number>(0)
  const [preSwellingVER, setPreSwellingVER] = useState<number>(0)
  const [totalPreSwellingVolume, setTotalPreSwellingVolume] = useState<number>(0)
  const [hasAzurSeries, setHasAzurSeries] = useState<boolean>(false)

  // 膨潤後体積を取得する関数（新しい構造では直接データに含まれている）
  const getEffectiveVolume = useCallback((coil: SelectedCoil): number => {
    return coil.is_azur_series && coil.azur_volume_mm3 ? coil.azur_volume_mm3 : coil.volume_mm3
  }, [])

  // 表示用のコイルリストを計算（使用順にソート）
  const displayCoils = useCallback(() => {
    return [...selectedCoils].sort((a, b) => a.order - b.order)
  }, [selectedCoils])

  // VER計算（膨潤前後両方を計算）
  useEffect(() => {
    // 膨潤後体積とVER（実際の塞栓効果）
    const totalSwelledVolume = selectedCoils.reduce((sum, coil) => {
      const effectiveVolume = getEffectiveVolume(coil)
      return sum + (effectiveVolume * coil.quantity)
    }, 0)
    
    // 膨潤前体積とVER（挿入時の体積）
    const totalPreSwellingVolume = selectedCoils.reduce((sum, coil) => {
      return sum + (coil.volume_mm3 * coil.quantity)
    }, 0)
    
    // AZURシリーズが含まれているかチェック
    const containsAzur = selectedCoils.some(coil => coil.is_azur_series)
    
    setTotalCoilVolume(totalSwelledVolume)
    setTotalPreSwellingVolume(totalPreSwellingVolume)
    setHasAzurSeries(containsAzur)
    
    if (aneurysmVolume > 0) {
      const swelledVER = (totalSwelledVolume / aneurysmVolume) * 100
      const preSwellingVER = (totalPreSwellingVolume / aneurysmVolume) * 100
      setCurrentVER(swelledVER)
      setPreSwellingVER(preSwellingVER)
    }
  }, [selectedCoils, aneurysmVolume, getEffectiveVolume])

  const updateQuantity = (displayIndex: number, change: number) => {
    const coilsToDisplay = displayCoils()
    const targetCoil = coilsToDisplay[displayIndex]
    
    // 該当するエントリの数量を変更
    const actualIndex = selectedCoils.findIndex(
      c => c.id === targetCoil.id && c.order === targetCoil.order
    )
    
    if (actualIndex >= 0) {
      const updatedCoils = [...selectedCoils]
      const newQuantity = updatedCoils[actualIndex].quantity + change
      
      if (newQuantity <= 0) {
        updatedCoils.splice(actualIndex, 1)
      } else {
        updatedCoils[actualIndex].quantity = newQuantity
      }
      setSelectedCoils(updatedCoils)
    }
  }

  const removeCoil = (displayIndex: number) => {
    const coilsToDisplay = displayCoils()
    const targetCoil = coilsToDisplay[displayIndex]
    
    // 該当するエントリのみ削除
    const actualIndex = selectedCoils.findIndex(
      c => c.id === targetCoil.id && c.order === targetCoil.order
    )
    
    if (actualIndex >= 0) {
      const updatedCoils = selectedCoils.filter((_, i) => i !== actualIndex)
      setSelectedCoils(updatedCoils)
    }
  }

  const clearAll = () => {
    setSelectedCoils([])
  }

  const exportData = () => {
    // CSVヘッダー
    const headers = [
      '使用順',
      'メーカー',
      'コイル名',
      '一次径(mm)',
      '二次径(mm)',
      '長さ(cm)',
      '体積(mm³)',
      'AZUR膨潤後体積(mm³)',
      '備考'
    ]
    
    // CSVデータ行（使用順にソート）
    const csvRows = displayCoils().map(coil => [
      coil.order.toString(),
      coil.manufacturer,
      coil.coil_name,
      coil.primary_diameter_mm.toFixed(3),
      coil.secondary_diameter_mm.toFixed(1),
      coil.length_cm.toFixed(1),
      coil.volume_mm3.toFixed(1),
      coil.is_azur_series && coil.azur_volume_mm3 ? coil.azur_volume_mm3.toFixed(1) : '',
      coil.is_azur_series ? 'AZUR膨潤コイル' : ''
    ])
    
    // サマリー行を追加
    if (selectedCoils.length > 0) {
      csvRows.push(['', '', '', '', '', '', '', '', '']) // 空行
      csvRows.push([
        '',
        '合計',
        `${selectedCoils.length}本`,
        '',
        '',
        '',
        totalPreSwellingVolume.toFixed(1),
        totalCoilVolume.toFixed(1),
        hasAzurSeries ? 'AZUR膨潤コイル含む' : ''
      ])
      
      if (aneurysmVolume > 0) {
        csvRows.push(['', '', '', '', '', '', '', '', '']) // 空行
        csvRows.push([
          '',
          '動脈瘤体積',
          `${aneurysmVolume.toFixed(1)} mm³`,
          '',
          '',
          '',
          '',
          '',
          ''
        ])
        csvRows.push([
          '',
          'VER',
          `${currentVER.toFixed(1)}%`,
          '',
          '',
          '',
          '',
          hasAzurSeries ? `膨潤前: ${preSwellingVER.toFixed(1)}%` : '',
          ''
        ])
      }
    }
    
    // CSV文字列を作成
    const csvContent = [
      headers.join(','),
      ...csvRows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')
    
    // ファイル名に日時を追加
    const now = new Date()
    const timestamp = now.getFullYear().toString() + 
                     (now.getMonth() + 1).toString().padStart(2, '0') + 
                     now.getDate().toString().padStart(2, '0') + '_' +
                     now.getHours().toString().padStart(2, '0') + 
                     now.getMinutes().toString().padStart(2, '0')
    
    // BOM（Byte Order Mark）を追加してUTF-8を明示
    const BOM = '\uFEFF'
    const csvWithBOM = BOM + csvContent
    
    const blob = new Blob([csvWithBOM], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `vercalc_export_${timestamp}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }



  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex-shrink-0">
        <CardTitle className="flex items-center justify-between">
          <span>使用コイル一覧</span>
          <div className="flex space-x-2">
            <Button variant="outline" size="sm" onClick={exportData} disabled={selectedCoils.length === 0}>
              <Download className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={clearAll} disabled={selectedCoils.length === 0}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col space-y-4 min-h-0">
        {/* VER表示またはコイル体積表示 */}
        {aneurysmVolume > 0 ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">現在のVER</span>
              <div className="text-right">
                <div className="text-2xl font-bold">{currentVER.toFixed(1)}%</div>
                {hasAzurSeries && (
                  <div className="text-xs text-muted-foreground">
                    膨潤前: {preSwellingVER.toFixed(1)}%
                  </div>
                )}
              </div>
            </div>
            
            <div className="space-y-2">
              <Progress 
                value={Math.min(currentVER, 50) * 2} 
                className="h-3"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>0%</span>
                <span>25%</span>
                <span>50%</span>
              </div>
            </div>
            
            {hasAzurSeries && (
              <div className="bg-blue-50 p-2 rounded text-xs">
                <div className="font-medium text-blue-700 mb-1">AZUR膨潤コイル使用中</div>
                <div className="text-blue-600">
                  実際の塞栓効果: {currentVER.toFixed(1)}% (膨潤後)
                </div>
                <div className="text-blue-600">
                  挿入時の体積: {preSwellingVER.toFixed(1)}% (膨潤前)
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">総コイル体積</span>
              <div className="text-right">
                <div className="text-2xl font-bold">{totalCoilVolume.toFixed(1)} mm³</div>
                {hasAzurSeries && (
                  <div className="text-xs text-muted-foreground">
                    膨潤前: {totalPreSwellingVolume.toFixed(1)} mm³
                  </div>
                )}
              </div>
            </div>
            
            {hasAzurSeries && (
              <div className="bg-blue-50 p-2 rounded text-xs">
                <div className="font-medium text-blue-700 mb-1">AZUR膨潤コイル使用中</div>
                <div className="text-blue-600">
                  膨潤後体積: {totalCoilVolume.toFixed(1)} mm³
                </div>
                <div className="text-blue-600">
                  膨潤前体積: {totalPreSwellingVolume.toFixed(1)} mm³
                </div>
              </div>
            )}
            
            <div className="bg-amber-50 p-2 rounded text-xs text-amber-700">
              💡 動脈瘤体積を入力するとVER計算が表示されます
            </div>
          </div>
        )}

        <Separator />

        {/* サマリー */}
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <span className="text-muted-foreground">動脈瘤体積:</span>
            <div className="font-medium">
              {aneurysmVolume > 0 ? `${aneurysmVolume.toFixed(1)} mm³` : '未入力'}
            </div>
          </div>
          <div>
            <span className="text-muted-foreground">コイル体積:</span>
            {hasAzurSeries ? (
              <div>
                <div className="font-medium text-blue-600">{totalCoilVolume.toFixed(1)} mm³</div>
                <div className="text-xs text-muted-foreground">膨潤前: {totalPreSwellingVolume.toFixed(1)} mm³</div>
              </div>
            ) : (
              <div className="font-medium">{totalCoilVolume.toFixed(1)} mm³</div>
            )}
          </div>
          <div>
            <span className="text-muted-foreground">使用コイル数:</span>
            <div className="font-medium">{selectedCoils.length} 種類</div>
          </div>
          <div>
            <span className="text-muted-foreground">総本数:</span>
            <div className="font-medium">
              {selectedCoils.reduce((sum, coil) => sum + coil.quantity, 0)} 本
            </div>
          </div>
        </div>

        <Separator />

        {/* コイル一覧 */}
        <div className="flex-1 flex flex-col space-y-2 min-h-0">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">選択済みコイル（使用順）</span>
            {selectedCoils.length > 0 && (
              <Badge variant="secondary">{selectedCoils.length}</Badge>
            )}
          </div>
          
          {selectedCoils.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <div className="mb-2">選択されたコイルはありません</div>
              <div className="text-xs">左のパネルからコイルを選択してください</div>
            </div>
          ) : (
            <div className="flex-1 min-h-0 overflow-y-auto space-y-1">
              {displayCoils().map((coil, index) => (
                <div key={`${coil.id}-${coil.order}-${index}`} className="border rounded p-1.5">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1 flex-1 min-w-0">
                      <Badge variant="outline" className="text-xs shrink-0">
                        #{coil.order}
                      </Badge>
                      <div className="text-xs font-medium truncate">
                        {coil.coil_name}
                        {coil.is_azur_series && (
                          <Badge variant="secondary" className="ml-1 text-xs">膨潤</Badge>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeCoil(index)}
                      className="h-5 w-5 p-0 text-red-500 hover:text-red-700 shrink-0"
                    >
                      <Trash2 className="h-2.5 w-2.5" />
                    </Button>
                  </div>
                  
                  <div className="text-xs font-medium mb-1">
                    {coil.secondary_diameter_mm}mm × {coil.length_cm}cm
                  </div>
                  
                  <div className="text-xs text-muted-foreground">
                    {coil.is_azur_series && coil.azur_volume_mm3 ? (
                      <div>
                        <div>膨潤前: {coil.volume_mm3.toFixed(1)}mm³</div>
                        <div className="text-blue-600">
                          膨潤後: {coil.azur_volume_mm3.toFixed(1)}mm³
                        </div>
                      </div>
                    ) : (
                      <div>
                        {coil.volume_mm3.toFixed(1)}mm³
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
} 