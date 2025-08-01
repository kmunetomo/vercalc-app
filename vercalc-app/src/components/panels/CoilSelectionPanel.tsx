'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus } from 'lucide-react'
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'

// コイルデータの型定義
interface CoilData {
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
  jitteredSecondaryDiameter?: number
  jitteredLength?: number
}



interface CoilSelectionPanelProps {
  onAddCoil: (coil: Omit<CoilData, 'quantity' | 'order'>) => void
  aneurysmVolume: number
}

export default function CoilSelectionPanel({ onAddCoil, aneurysmVolume }: CoilSelectionPanelProps) {
  const [manufacturers, setManufacturers] = useState<string[]>([])
  const [selectedManufacturer, setSelectedManufacturer] = useState<string>('')
  const [productSeries, setProductSeries] = useState<string[]>([])
  const [selectedSeries, setSelectedSeries] = useState<string>('')
  const [coilData, setCoilData] = useState<CoilData[]>([])
  const [filteredCoils, setFilteredCoils] = useState<CoilData[]>([])
  const [selectedCoil, setSelectedCoil] = useState<CoilData | null>(null)
  const [xAxisDomain, setXAxisDomain] = useState<[number, number]>([0, 10])
  const [yAxisDomain, setYAxisDomain] = useState<[number, number]>([0, 50])
  const [hoveredCoil, setHoveredCoil] = useState<CoilData | null>(null)

  // カスタムコイル入力用の状態
  const [customCoil, setCustomCoil] = useState({
    primaryDiameter: '', // inch
    secondaryDiameter: '', // mm
    length: '' // cm
  })



  // カスタムコイルの体積を計算する関数
  const calculateCustomCoilVolume = (primaryDiameterInch: number, lengthCm: number): number => {
    // 単位変換
    const primaryDiameterMm = primaryDiameterInch * 25.4 // inch → mm
    const lengthMm = lengthCm * 10 // cm → mm
    
    // 円柱の体積 V = π × (直径/2)² × 長さ
    const radius = primaryDiameterMm / 2
    const volume = Math.PI * Math.pow(radius, 2) * lengthMm
    
    return volume
  }

  // カスタムコイルのバリデーション
  const validateCustomCoil = () => {
    const primary = parseFloat(customCoil.primaryDiameter)
    const secondary = parseFloat(customCoil.secondaryDiameter)
    const length = parseFloat(customCoil.length)
    
    return !isNaN(primary) && !isNaN(secondary) && !isNaN(length) &&
           primary > 0 && secondary > 0 && length > 0
  }

  // カスタムコイルを追加する関数
  const addCustomCoil = () => {
    if (!validateCustomCoil()) return
    
    const primary = parseFloat(customCoil.primaryDiameter)
    const secondary = parseFloat(customCoil.secondaryDiameter)
    const length = parseFloat(customCoil.length)
    const volume = calculateCustomCoilVolume(primary, length)
    
    const customCoilData: Omit<CoilData, 'quantity' | 'order'> = {
      id: Date.now(), // 一時的なID
      manufacturer: 'カスタム',
      coil_name: `カスタム-${(primary * 1000).toFixed(0).padStart(4, '0')}`,
      primary_diameter_inch: primary,
      primary_diameter_mm: primary * 25.4, // inch → mm
      secondary_diameter_mm: secondary,
      length_cm: length,
      volume_mm3: volume,
      min_catheter_lumen_inch: primary,
      is_azur_series: false
    }
    
    onAddCoil(customCoilData)
    
    // 入力をクリア
    setCustomCoil({
      primaryDiameter: '',
      secondaryDiameter: '',
      length: ''
    })
  }

  // 重なり回避のためのジッター適用
  const addJitterToCoils = (coils: CoilData[]): CoilData[] => {
    const jitteredCoils = coils.map(coil => ({
      ...coil,
      jitteredSecondaryDiameter: coil.secondary_diameter_mm,
      jitteredLength: coil.length_cm
    }))
    
    const positionMap = new Map<string, CoilData[]>()
    
    // 同じ位置のコイルをグループ化
    coils.forEach(coil => {
      const key = `${coil.secondary_diameter_mm}-${coil.length_cm}`
      if (!positionMap.has(key)) {
        positionMap.set(key, [])
      }
      positionMap.get(key)!.push(coil)
    })
    
    // 重なりがある場合にジッターを適用
    positionMap.forEach((groupCoils) => {
      if (groupCoils.length > 1) {
        groupCoils.forEach((coil, index) => {
          const jitterAmount = 0.1 // 軸の単位での微小オフセット
          const angle = (index / groupCoils.length) * 2 * Math.PI
          const offsetX = Math.cos(angle) * jitterAmount
          const offsetY = Math.sin(angle) * jitterAmount
          
          const coilIndex = jitteredCoils.findIndex(c => c.id === coil.id)
          if (coilIndex !== -1) {
            jitteredCoils[coilIndex].jitteredSecondaryDiameter = coil.secondary_diameter_mm + offsetX
            jitteredCoils[coilIndex].jitteredLength = coil.length_cm + offsetY
          }
        })
      }
    })
    
    return jitteredCoils
  }

  // 軸の範囲をキリの良い数字で計算
  const calculateAxisDomain = (data: CoilData[]) => {
    if (data.length === 0) {
      setXAxisDomain([0, 10])
      setYAxisDomain([0, 50])
      return
    }

    // X軸（二次径）の範囲計算
    const diameters = data.map(coil => coil.secondary_diameter_mm)
    const minDiameter = Math.min(...diameters)
    const maxDiameter = Math.max(...diameters)
    
    // キリの良い範囲に調整（整数単位）
    const xMin = Math.max(0, Math.floor(minDiameter) - (minDiameter > 5 ? 1 : 0))
    const xMax = Math.ceil(maxDiameter) + (maxDiameter < 10 ? 1 : 2)
    
    // Y軸（長さ）の範囲計算
    const lengths = data.map(coil => coil.length_cm)
    const minLength = Math.min(...lengths)
    const maxLength = Math.max(...lengths)
    
    // キリの良い範囲に調整（5の倍数）
    const yMin = Math.max(0, Math.floor(minLength / 5) * 5 - (minLength > 10 ? 5 : 0))
    const yMax = Math.ceil(maxLength / 5) * 5 + (maxLength < 20 ? 5 : 10)

    setXAxisDomain([xMin, xMax])
    setYAxisDomain([yMin, yMax])
  }

  // マスターデータベースから製造業者一覧を読み込み（アルファベット順でソート）
  useEffect(() => {
    const loadManufacturers = async () => {
      try {
        const response = await fetch('/data/master_coil_database_new.json')
        const data: CoilData[] = await response.json()
        // ユニークなメーカー一覧を抽出してアルファベット順でソート
        const uniqueManufacturers = [...new Set(data.map(coil => coil.manufacturer))]
        const sortedManufacturers = uniqueManufacturers.sort((a: string, b: string) => 
          a.toLowerCase().localeCompare(b.toLowerCase())
        )
        setManufacturers(sortedManufacturers)
      } catch (error) {
        console.error('Failed to load manufacturers:', error)
      }
    }
    loadManufacturers()
  }, [])

  // 選択されたメーカーのデータを読み込み
  useEffect(() => {
    if (selectedManufacturer && selectedManufacturer !== 'カスタム') {
      const loadManufacturerData = async () => {
        try {
          // メーカー名を安全なファイル名に変換
          const filename = selectedManufacturer.toLowerCase().replace(/\s+/g, '_') + '_new'
          console.log('Loading manufacturer data:', filename)
          
          const response = await fetch(`/data/${filename}.json`)
          
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`)
          }
          
          const coils: CoilData[] = await response.json()
          
          if (!Array.isArray(coils)) {
            throw new Error('Invalid data format: expected array')
          }
          
          // CoilDataにidを追加
          const coilsWithId = coils.map((coil, index) => ({
            ...coil,
            id: index + 1
          }))
          
          // ユニークなcoil_name一覧を抽出
          const uniqueCoilNames = [...new Set(coils.map(coil => coil.coil_name))]
          
          setProductSeries(uniqueCoilNames)
          setCoilData(coilsWithId)
          setSelectedSeries('') // コイル名選択をリセット
          setSelectedCoil(null) // 選択されたコイルもリセット
          
          console.log('Successfully loaded', coils.length, 'coils for', selectedManufacturer)
        } catch (error) {
          console.error('Failed to load manufacturer data:', error, 'for manufacturer:', selectedManufacturer)
          // エラー時は状態をリセット
          setProductSeries([])
          setCoilData([])
          setSelectedSeries('')
          setSelectedCoil(null)
        }
      }
      loadManufacturerData()
    } else if (selectedManufacturer === 'カスタム') {
      // カスタムメーカーの場合はファイル読み込みなし、状態のみリセット
      setProductSeries([])
      setCoilData([])
      setSelectedSeries('')
      setSelectedCoil(null)
    } else {
      // メーカーが選択されていない場合はすべてリセット
      setProductSeries([])
      setCoilData([])
      setSelectedSeries('')
      setSelectedCoil(null)
    }
  }, [selectedManufacturer])

  // フィルタリング
  useEffect(() => {
    // コイル名が選択されていない場合は空の配列
    if (!selectedSeries) {
      setFilteredCoils([])
      calculateAxisDomain([])
      return
    }
    
    const filtered = coilData.filter(coil => coil.coil_name === selectedSeries)
    
    // 重なり回避のためのジッター適用
    const jitteredCoils = addJitterToCoils(filtered)
    
    setFilteredCoils(jitteredCoils)
    // 軸の範囲を更新（元の座標で計算）
    calculateAxisDomain(filtered)
  }, [coilData, selectedSeries])

  const handleCoilSelect = (coil: CoilData) => {
    setSelectedCoil(coil)
  }

  const handleCoilDoubleClick = (coil: CoilData) => {
    // ダブルクリック時は選択と追加を同時に実行
    setSelectedCoil(coil)
    onAddCoil({
      id: coil.id,
      manufacturer: coil.manufacturer,
      coil_name: coil.coil_name,
      primary_diameter_inch: coil.primary_diameter_inch,
      primary_diameter_mm: coil.primary_diameter_mm,
      secondary_diameter_mm: coil.secondary_diameter_mm,
      length_cm: coil.length_cm,
      volume_mm3: coil.volume_mm3,
      min_catheter_lumen_inch: coil.min_catheter_lumen_inch,
      is_azur_series: coil.is_azur_series,
      azur_primary_diameter_inch: coil.azur_primary_diameter_inch,
      azur_primary_diameter_mm: coil.azur_primary_diameter_mm,
      azur_volume_mm3: coil.azur_volume_mm3,
      swelling_ratio: coil.swelling_ratio
    })
    console.log('Double-clicked and added coil:', coil)
  }

  const handleAddCoil = () => {
    if (selectedCoil) {
      onAddCoil({
        id: selectedCoil.id,
        manufacturer: selectedCoil.manufacturer,
        coil_name: selectedCoil.coil_name,
        primary_diameter_inch: selectedCoil.primary_diameter_inch,
        primary_diameter_mm: selectedCoil.primary_diameter_mm,
        secondary_diameter_mm: selectedCoil.secondary_diameter_mm,
        length_cm: selectedCoil.length_cm,
        volume_mm3: selectedCoil.volume_mm3,
        min_catheter_lumen_inch: selectedCoil.min_catheter_lumen_inch,
        is_azur_series: selectedCoil.is_azur_series,
        azur_primary_diameter_inch: selectedCoil.azur_primary_diameter_inch,
        azur_primary_diameter_mm: selectedCoil.azur_primary_diameter_mm,
        azur_volume_mm3: selectedCoil.azur_volume_mm3,
        swelling_ratio: selectedCoil.swelling_ratio
      })
      console.log('Added coil:', selectedCoil)
    }
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>
          コイル選択
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* メーカー・製品選択・コイル詳細（3列レイアウト） */}
        <div className="grid grid-cols-3 gap-4">
          {/* メーカー選択（左側・1クリック） */}
          <div className="space-y-2">
            <label className="text-sm font-medium">メーカー</label>
            <div className="space-y-1">
              {manufacturers.map((manufacturer) => (
                <Button
                  key={manufacturer}
                  variant={selectedManufacturer === manufacturer ? "default" : "outline"}
                  size="sm"
                  className="w-full text-xs h-6 justify-start"
                  onClick={() => setSelectedManufacturer(manufacturer)}
                >
                  {manufacturer}
                </Button>
              ))}
              <div className="border-t pt-2 mt-2">
                <Button
                  variant={selectedManufacturer === 'カスタム' ? "default" : "outline"}
                  size="sm"
                  className="w-full text-xs h-6 justify-start bg-orange-50 hover:bg-orange-100 border-orange-200"
                  onClick={() => setSelectedManufacturer('カスタム')}
                >
                  📝 カスタム
                </Button>
              </div>
            </div>
          </div>

                          {/* コイル名選択（中央・1クリック・必須）またはカスタム入力 */}
          <div className="space-y-2">
            {selectedManufacturer === 'カスタム' ? (
              <>
                <label className="text-sm font-medium">
                  カスタムコイル入力 <span className="text-red-500">*</span>
                </label>
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="primaryDiameter" className="text-xs">一次径 (inch)</Label>
                    <Input
                      id="primaryDiameter"
                      type="number"
                      step="0.0001"
                      placeholder="0.0135"
                      value={customCoil.primaryDiameter}
                      onChange={(e) => setCustomCoil(prev => ({ ...prev, primaryDiameter: e.target.value }))}
                      className="h-6 text-xs"
                    />
                  </div>
                  <div>
                    <Label htmlFor="secondaryDiameter" className="text-xs">二次径 (mm)</Label>
                    <Input
                      id="secondaryDiameter"
                      type="number"
                      step="0.1"
                      placeholder="3.0"
                      value={customCoil.secondaryDiameter}
                      onChange={(e) => setCustomCoil(prev => ({ ...prev, secondaryDiameter: e.target.value }))}
                      className="h-6 text-xs"
                    />
                  </div>
                  <div>
                    <Label htmlFor="length" className="text-xs">長さ (cm)</Label>
                    <Input
                      id="length"
                      type="number"
                      step="0.1"
                      placeholder="6.0"
                      value={customCoil.length}
                      onChange={(e) => setCustomCoil(prev => ({ ...prev, length: e.target.value }))}
                      className="h-6 text-xs"
                    />
                  </div>
                </div>
              </>
            ) : (
              <>
                <label className="text-sm font-medium">
                  コイル名 <span className="text-red-500">*</span>
                </label>
                <div className="space-y-1">
                  {selectedManufacturer && productSeries.length > 0 ? (
                    productSeries.map((series) => (
                      <Button
                        key={series}
                        variant={selectedSeries === series ? "default" : "outline"}
                        size="sm"
                        className="w-full text-xs h-6 justify-start"
                        onClick={() => setSelectedSeries(series)}
                      >
                        {series}
                      </Button>
                    ))
                  ) : (
                    <div className="text-xs text-muted-foreground text-center py-2">
                      {!selectedManufacturer ? "メーカーを選択" : "読み込み中..."}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* 選択中コイル詳細（右側）またはカスタムコイル詳細 */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              {selectedManufacturer === 'カスタム' ? 'カスタムコイル詳細' : '選択中のコイル'}
            </label>
            {selectedManufacturer === 'カスタム' ? (
              <div className="bg-orange-50 p-2 rounded space-y-1">
                {validateCustomCoil() ? (
                  <>
                    <div className="text-xs font-medium">
                      カスタム-{(parseFloat(customCoil.primaryDiameter || '0') * 1000).toFixed(0).padStart(4, '0')}
                      <Badge variant="secondary" className="ml-1 text-xs">カスタム</Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-1 text-xs text-muted-foreground">
                      <div>一次径: {customCoil.primaryDiameter}&quot;</div>
                      <div>二次径: {customCoil.secondaryDiameter}mm</div>
                      <div>長さ: {customCoil.length}cm</div>
                      <div>体積: {calculateCustomCoilVolume(
                        parseFloat(customCoil.primaryDiameter),
                        parseFloat(customCoil.length)
                      ).toFixed(1)}mm³</div>
                    </div>
                    {aneurysmVolume > 0 && (
                      <div className="text-xs font-medium text-primary">
                        1本あたりVER: {(
                          (calculateCustomCoilVolume(
                            parseFloat(customCoil.primaryDiameter),
                            parseFloat(customCoil.length)
                          ) / aneurysmVolume) * 100
                        ).toFixed(2)}%
                      </div>
                    )}
                    <Button 
                      size="sm" 
                      onClick={addCustomCoil} 
                      className="w-full h-6 text-xs bg-orange-600 hover:bg-orange-700 text-white"
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      カスタム追加
                    </Button>
                  </>
                ) : (
                  <div className="text-xs text-muted-foreground text-center py-6">
                    すべての値を入力してください
                  </div>
                )}
              </div>
            ) : selectedCoil ? (
              <div className="bg-muted/50 p-2 rounded space-y-1">
                <div className="text-xs font-medium">
                  {selectedCoil.coil_name}
                  {selectedCoil.is_azur_series && (
                    <Badge variant="secondary" className="ml-1 text-xs">膨潤</Badge>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-1 text-xs text-muted-foreground">
                  <div>二次径: {selectedCoil.secondary_diameter_mm}mm</div>
                  <div>長さ: {selectedCoil.length_cm}cm</div>
                </div>
                {selectedCoil.is_azur_series && selectedCoil.azur_volume_mm3 ? (
                  <div className="text-xs space-y-0.5">
                    <div>膨潤前: {selectedCoil.volume_mm3}mm³</div>
                    <div className="font-medium text-blue-600">
                      膨潤後: {selectedCoil.azur_volume_mm3.toFixed(1)}mm³
                    </div>
                  </div>
                ) : (
                  <div className="text-xs">体積: {selectedCoil.volume_mm3}mm³</div>
                )}
                {aneurysmVolume > 0 && (
                  selectedCoil.is_azur_series && selectedCoil.azur_volume_mm3 ? (
                    <div className="text-xs space-y-0.5">
                      <div className="text-muted-foreground">
                        VER（膨潤前）: {((selectedCoil.volume_mm3 / aneurysmVolume) * 100).toFixed(2)}%
                      </div>
                      <div className="font-medium text-primary">
                        VER（膨潤後）: {((selectedCoil.azur_volume_mm3 / aneurysmVolume) * 100).toFixed(2)}%
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs font-medium text-primary">
                      1本あたりVER: {((selectedCoil.volume_mm3 / aneurysmVolume) * 100).toFixed(2)}%
                    </div>
                  )
                )}
                <Button 
                  size="sm" 
                  onClick={handleAddCoil} 
                  className="w-full h-6 text-xs bg-green-600 hover:bg-green-700 text-white"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  追加
                </Button>
              </div>
            ) : (
              <div className="text-xs text-muted-foreground text-center py-6">
                散布図からコイルを選択
              </div>
            )}
          </div>
        </div>

        {/* コイル件数表示 */}
        <div className="flex items-center justify-end">
          <Badge variant="secondary">
            {filteredCoils.length} 件
          </Badge>
        </div>

        <Separator />

        {/* 散布図表示（カスタム選択時は非表示） */}
        {selectedManufacturer !== 'カスタム' && selectedSeries && filteredCoils.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">コイル選択チャート（二次径 × 長さ）</label>
              <div className="text-xs text-muted-foreground">
                クリック: 選択 | ダブルクリック: 直接追加
              </div>
            </div>
            <div className="h-96 w-full">
               <ResponsiveContainer width="100%" height="100%">
                 <ScatterChart margin={{ top: 20, right: 40, bottom: 40, left: 40 }}>
                   <CartesianGrid strokeDasharray="3 3" />
                                     <XAxis 
                    type="number" 
                    dataKey="jitteredSecondaryDiameter" 
                    name="二次径" 
                    unit="mm"
                    domain={xAxisDomain}
                    tickCount={Math.min(xAxisDomain[1] - xAxisDomain[0] + 1, 10)}
                  />
                  <YAxis 
                    type="number" 
                    dataKey="jitteredLength" 
                    name="長さ" 
                    unit="cm"
                    domain={yAxisDomain}
                    tickCount={Math.min((yAxisDomain[1] - yAxisDomain[0]) / 5 + 1, 10)}
                  />
                   <Tooltip 
                     cursor={{ strokeDasharray: '3 3' }}
                     content={({ active, payload }) => {
                       if (active && payload && payload[0]) {
                         const data = payload[0].payload as CoilData
                         
                         return (
                           <div className="bg-background border rounded p-2 shadow-lg">
                             <p className="font-medium">{data.coil_name}</p>
                             <p className="text-sm">二次径: {data.secondary_diameter_mm}mm</p>
                             <p className="text-sm">長さ: {data.length_cm}cm</p>
                             {data.is_azur_series && data.azur_volume_mm3 ? (
                               <div className="text-sm space-y-1">
                                 <p>体積（膨潤前）: {data.volume_mm3}mm³</p>
                                 <p className="font-medium text-blue-600">体積（膨潤後）: {data.azur_volume_mm3.toFixed(1)}mm³</p>
                                 <p className="text-xs text-muted-foreground">※ ゲル膨潤コイル（{data.swelling_ratio?.toFixed(1)}倍）</p>
                               </div>
                             ) : (
                               <p className="text-sm">体積: {data.volume_mm3}mm³</p>
                             )}
                             {aneurysmVolume > 0 && (
                               data.is_azur_series && data.azur_volume_mm3 ? (
                                 <div className="text-sm space-y-1">
                                   <p className="text-muted-foreground">
                                     VER（膨潤前）: {((data.volume_mm3 / aneurysmVolume) * 100).toFixed(2)}%
                                   </p>
                                   <p className="font-medium text-primary">
                                     VER（膨潤後）: {((data.azur_volume_mm3 / aneurysmVolume) * 100).toFixed(2)}%
                                   </p>
                                 </div>
                               ) : (
                                 <p className="text-sm font-medium text-primary">
                                   1本あたりVER: {((data.volume_mm3 / aneurysmVolume) * 100).toFixed(2)}%
                                 </p>
                               )
                             )}
                             <p className="text-xs text-muted-foreground border-t pt-1 mt-1">
                               クリック: 選択 | ダブルクリック: 直接追加
                             </p>
                           </div>
                         )
                       }
                       return null
                     }}
                   />
                   <Scatter 
                     data={filteredCoils} 
                     fill="#8884d8"
                     onClick={(data) => {
                       if (data && data.payload) {
                         handleCoilSelect(data.payload as CoilData)
                       }
                     }}
                     onDoubleClick={(data) => {
                       if (data && data.payload) {
                         handleCoilDoubleClick(data.payload as CoilData)
                       }
                     }}
                     onMouseEnter={(data) => {
                       if (data && data.payload) {
                         setHoveredCoil(data.payload as CoilData)
                       }
                     }}
                     onMouseLeave={() => {
                       setHoveredCoil(null)
                     }}
                   >
                     {filteredCoils.map((coil, index) => {
                       const isSelected = selectedCoil?.id === coil.id
                       const isHovered = hoveredCoil?.id === coil.id
                       
                       // 基本サイズを大きく、状態に応じてさらに拡大
                       let radius = 6 // 基本サイズ拡大（元は4）
                       if (isSelected) radius = 10
                       else if (isHovered) radius = 8
                       
                       // 色設定（統一色）
                       let fillColor = "#8884d8" // 統一した青色
                       let strokeColor = fillColor
                       if (isSelected) {
                         fillColor = "#ff7300"
                         strokeColor = "#ff7300"
                       } else if (isHovered) {
                         fillColor = "#6366f1"
                         strokeColor = fillColor
                       }
                       
                       return (
                         <Cell 
                           key={`cell-${index}`} 
                           fill={fillColor}
                           stroke={strokeColor}
                           strokeWidth={isSelected ? 3 : isHovered ? 2 : 1}
                           r={radius}
                           style={{ 
                             cursor: 'pointer',
                             transition: 'all 0.2s ease'
                           }}
                         />
                       )
                     })}
                   </Scatter>
                 </ScatterChart>
               </ResponsiveContainer>
             </div>
          </div>
        )}

        {/* 製品選択が必要な場合のメッセージ */}
        {!selectedSeries && (
          <div className="text-center py-8 text-muted-foreground">
                            <div className="mb-2">コイル名を選択してください</div>
            <div className="text-xs">散布図でコイルを選択できます</div>
          </div>
        )}


      </CardContent>
    </Card>
  )
} 