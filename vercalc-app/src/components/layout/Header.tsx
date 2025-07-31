'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Settings, Save, FolderOpen, Calculator } from 'lucide-react'

export default function Header() {
  const [caseName, setCaseName] = useState('新規症例')

  return (
    <header className="border-b bg-card text-card-foreground">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          {/* ロゴ・タイトル */}
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <Calculator className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-bold">VERcalc</h1>
            </div>
            <div className="text-sm text-muted-foreground">
              動脈瘤塞栓支援システム
            </div>
          </div>

          {/* 症例名入力 */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Label htmlFor="case-name" className="text-sm font-medium">
                症例名:
              </Label>
              <Input
                id="case-name"
                value={caseName}
                onChange={(e) => setCaseName(e.target.value)}
                className="w-40"
                placeholder="症例名を入力"
              />
            </div>

            {/* アクションボタン */}
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm">
                <FolderOpen className="h-4 w-4 mr-1" />
                読み込み
              </Button>
              <Button variant="outline" size="sm">
                <Save className="h-4 w-4 mr-1" />
                保存
              </Button>
              
              {/* 設定ダイアログ */}
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Settings className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>設定</DialogTitle>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="target-ver" className="text-right">
                        目標VER (%)
                      </Label>
                      <Input
                        id="target-ver"
                        defaultValue="20"
                        className="col-span-3"
                        type="number"
                        min="0"
                        max="100"
                      />
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
} 