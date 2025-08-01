'use client'

import { useState } from 'react'
import AneurysmPanel from '@/components/panels/AneurysmPanel'
import CoilSelectionPanel from '@/components/panels/CoilSelectionPanel'
import SelectedCoilsPanel from '@/components/panels/SelectedCoilsPanel'

// 選択されたコイルの型定義
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

export default function Home() {
  const [selectedCoils, setSelectedCoils] = useState<SelectedCoil[]>([])
  const [aneurysmVolume, setAneurysmVolume] = useState<number>(0)

  // コイルを追加する関数
  const addCoil = (coil: Omit<SelectedCoil, 'quantity' | 'order'>) => {
    const existingCoilIndex = selectedCoils.findIndex(
      (c) => c.id === coil.id && 
              c.coil_name === coil.coil_name
    )

    if (existingCoilIndex >= 0) {
      // 既存のコイルの数量を増やす
      const updatedCoils = [...selectedCoils]
      updatedCoils[existingCoilIndex].quantity += 1
      setSelectedCoils(updatedCoils)
    } else {
      // 新しいコイルを追加
      const newCoil: SelectedCoil = {
        ...coil,
        quantity: 1,
        order: selectedCoils.length + 1
      }
      setSelectedCoils([...selectedCoils, newCoil])
    }
  }
  return (
    <div className="min-h-screen bg-background">
      {/* メインコンテンツ - 3分割レイアウト (2:6:2) */}
      <main className="container mx-auto p-4 h-screen">
                  <div className="grid grid-cols-1 lg:grid-cols-10 gap-4 h-full">
            {/* 左パネル: 動脈瘤情報 (2/10) */}
            <div className="lg:col-span-2">
              <AneurysmPanel 
                onVolumeChange={setAneurysmVolume}
              />
            </div>

            {/* 中央パネル: コイル選択 (6/10) */}
            <div className="lg:col-span-6">
              <CoilSelectionPanel 
                onAddCoil={addCoil}
                aneurysmVolume={aneurysmVolume}
              />
            </div>
            
            {/* 右パネル: 使用コイル一覧 (2/10) */}
            <div className="lg:col-span-2">
              <SelectedCoilsPanel 
                selectedCoils={selectedCoils}
                setSelectedCoils={setSelectedCoils}
                aneurysmVolume={aneurysmVolume}
              />
            </div>
        </div>
      </main>
      
      {/* 免責事項 */}
      <footer className="bg-gray-50 border-t mt-8 py-4 px-6">
        <div className="max-w-7xl mx-auto text-xs text-gray-600">
          <p className="text-center">
            <strong>免責事項:</strong> このアプリケーションは医療機器選択の参考資料として提供されています。
            実際の医療機器の選択・使用については、必ず医師の判断に従ってください。
            計算結果の正確性については保証いたしません。
          </p>
        </div>
      </footer>
    </div>
  )
}
