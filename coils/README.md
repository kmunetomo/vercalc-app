# VERcalc コイルデータベース

元の `Coil list.csv` を VERcalc アプリケーションで使いやすい形に整理したデータファイル群です。

## 📁 ファイル構成

### メーカー別ファイル
- `wallaby_medical.json` - Wallaby Medical (175 coils)
- `boston_scientific.json` - Boston Scientific (86 coils)
- `stryker.json` - Stryker (121 coils)
- `terumo.json` - TERUMO (73 coils)
- `cerenovus.json` - CERENOVUS (90 coils)
- `kaneka.json` - KANEKA (31 coils)
- `penumbra.json` - Penumbra (26 coils)
- `cook.json` - Cook (29 coils)
- `piolax.json` - Piolax (10 coils)

### 統合ファイル
- `master_coil_database.json` - 全メーカーの統合データベース (641 coils)

## 📊 データ構造

### 個別メーカーファイル
```json
{
  "manufacturer": "メーカー名",
  "total_coils": 製品数,
  "product_series": ["製品シリーズ配列"],
  "coils": [
    {
      "id": 1,
      "manufacturer": "メーカー名",
      "product_series": "製品シリーズ",
      "product_type": "製品タイプ",
      "primary_diameter": 一次径(mm),
      "secondary_diameter": 二次径(mm),
      "length": 長さ(cm),
      "volume": 体積(mm³),
      "min_catheter_size": 最小カテーテル内径(inch)
    }
  ]
}
```

### マスターデータベース
```json
{
  "metadata": {
    "total_coils": 総コイル数,
    "manufacturers": メーカー数,
    "product_series": 製品シリーズ数,
    "last_updated": "更新日"
  },
  "manufacturers": ["メーカー配列"],
  "product_series": ["製品シリーズ配列"],
  "coils": [全コイルデータ配列]
}
```

## 🔄 元データからの変更点

### ✅ 改善された点
1. **不要フィールドの削除**: `Input_Name1`, `Input_Name2`, `Input_Name3` を削除
2. **フィールド名の改善**: より直感的で短い名前に変更
3. **製品情報の分離**: `Coil_Name` から `product_series` と `product_type` を分離
4. **データ型の最適化**: 数値フィールドを適切な型に変換
5. **メーカー別分離**: 管理とロードの効率化
6. **JSON形式**: アプリケーションでの読み込みが容易

### 📋 フィールド対応表
| 元フィールド | 新フィールド | 説明 |
|-------------|-------------|------|
| `Manufacturer_Name` | `manufacturer` | メーカー名 |
| `Coil_Name` | `product_series` + `product_type` | 製品名を分離 |
| `Primary_Diameter_mm` | `primary_diameter` | 一次径(mm) |
| `Secondary_Diameter_mm` | `secondary_diameter` | 二次径(mm) |
| `Length_cm` | `length` | 長さ(cm) |
| `Volume_mm^3` | `volume` | 体積(mm³) |
| `Min_Compatible_Catheter_Lumen_inch` | `min_catheter_size` | 最小カテーテル内径(inch) |

## 🎯 VERcalcアプリケーションでの使用

### データローディング
```javascript
// 特定メーカーのみロード
const wallaby = await fetch('./coils/wallaby_medical.json').then(r => r.json());

// 全データロード
const allCoils = await fetch('./coils/master_coil_database.json').then(r => r.json());
```

### フィルタリング例
```javascript
// 二次径でフィルタ
const coils2mm = wallaby.coils.filter(coil => coil.secondary_diameter === 2.0);

// 製品シリーズでフィルタ
const avenirCoils = wallaby.coils.filter(coil => coil.product_series === 'Avenir');

// 体積範囲でフィルタ
const smallCoils = wallaby.coils.filter(coil => coil.volume <= 5.0);
```

### チャート表示用データ変換
```javascript
// 二次径 × 長さ のチャートデータ
const chartData = wallaby.coils.map(coil => ({
  x: coil.secondary_diameter,
  y: coil.length,
  volume: coil.volume,
  id: coil.id,
  label: `${coil.product_series} ${coil.product_type}`
}));
```

## 🏷️ 製品シリーズ一覧

**計29シリーズ:**
AZUR, AZUR18, AZUR35, Avenir, Avenir18, C-stopper, DELTA, DELTAFILL, Embold, GALAXY G3, Hilal, IDC18, Interlock-18, Interlock-35, MICRUSFRAME C, MICRUSFRAME S, Nester18, Nester35, POD, PODPACKING, Ruby, Target, TargetXL, TargetXXL, Tornado18, Tornado18r, Tornado35, iED, iED14

## 📈 統計情報

- **総コイル数**: 641
- **メーカー数**: 9
- **製品シリーズ数**: 29
- **ファイルサイズ**: 約270KB (全ファイル合計)

## 🛠️ データ再生成

元の `Coil list.csv` が更新された場合：

```bash
python3 process_coils.py
```

このスクリプトで新しいJSONファイルを再生成できます。 