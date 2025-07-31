#!/usr/bin/env python3
"""
コイル製品を一次径（カテーテルサイズ）別に整理し直すスクリプト

問題：
- 同じ製品シリーズ名でも異なる一次径（適合カテーテルサイズ）の製品が混在
- 医療現場では異なるカテーテルサイズは別製品として扱うべき

解決策：
- 製品シリーズ名に一次径情報を追加
- 例：AZUR → AZUR-013, AZUR-015, AZUR-029
"""

import json
import os
from collections import defaultdict

def mm_to_catheter_code(mm):
    """一次径(mm)からカテーテルコードに変換"""
    # インチ×10000の整数値で表現（より精密な識別のため）
    inch = mm / 25.4
    code = int(round(inch * 10000))
    return f"{code:04d}"

def reorganize_coils_by_catheter_size():
    """一次径別にコイル製品を整理"""
    
    # 元データを読み込み
    input_file = 'public/data/master_coil_database.json'
    with open(input_file, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    print("🔍 一次径別製品シリーズ整理を開始...")
    
    # 複数一次径を持つ製品シリーズを特定
    series_primaries = defaultdict(set)
    for coil in data['coils']:
        series = coil['product_series']
        primary = coil['primary_diameter']
        series_primaries[series].add(primary)
    
    multi_primary_series = {
        series: primaries 
        for series, primaries in series_primaries.items() 
        if len(primaries) > 1
    }
    
    print(f"📊 複数一次径を持つ製品シリーズ: {len(multi_primary_series)}個")
    
    # コイルデータを更新
    updated_coils = []
    series_name_mapping = {}
    
    for coil in data['coils']:
        updated_coil = coil.copy()
        series = coil['product_series']
        primary = coil['primary_diameter']
        
        # 複数一次径を持つ製品シリーズの場合、名前を変更
        if series in multi_primary_series:
            catheter_code = mm_to_catheter_code(primary)
            new_series_name = f"{series}-{catheter_code}"
            updated_coil['product_series'] = new_series_name
            
            # マッピングを記録
            old_key = f"{series}_{primary}"
            series_name_mapping[old_key] = new_series_name
        
        updated_coils.append(updated_coil)
    
    # 新しいproduct_series一覧を作成
    new_product_series = sorted(list(set(coil['product_series'] for coil in updated_coils)))
    
    # メタデータを更新
    updated_data = {
        "metadata": {
            "total_coils": len(updated_coils),
            "manufacturers": data['metadata']['manufacturers'],
            "product_series": len(new_product_series),
            "reorganization_info": {
                "reorganized_series": len(multi_primary_series),
                "catheter_size_based_naming": True,
                "naming_convention": "SeriesName-XXX (XXX = catheter size in thou)"
            },
            "last_updated": "2024-01-01"
        },
        "manufacturers": data['manufacturers'],
        "product_series": new_product_series,
        "coils": updated_coils
    }
    
    # 整理結果を保存
    output_file = 'public/data/master_coil_database_reorganized.json'
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(updated_data, f, ensure_ascii=False, indent=2)
    
    # 整理サマリーを表示
    print("\n✅ 整理完了！")
    print(f"📁 出力ファイル: {output_file}")
    print(f"📈 総製品シリーズ数: {data['metadata']['product_series']} → {len(new_product_series)}")
    
    print("\n🔄 変更された製品シリーズ:")
    for series, primaries in multi_primary_series.items():
        print(f"\n📍 {series}:")
        for primary in sorted(primaries):
            catheter_code = mm_to_catheter_code(primary)
            new_name = f"{series}-{catheter_code}"
            inch_size = primary / 25.4
            print(f"  {primary}mm ({inch_size:.4f}\") → {new_name}")
    
    # 詳細レポートを生成
    create_reorganization_report(multi_primary_series, series_name_mapping)
    
    # メーカー別ファイルも作成
    create_manufacturer_files(updated_coils, new_product_series)
    
    return output_file

def create_manufacturer_files(coils, all_product_series):
    """メーカー別ファイルを作成"""
    
    print("\n🏭 メーカー別ファイルを作成中...")
    
    # メーカー別にコイルを分類
    manufacturers_data = defaultdict(list)
    for coil in coils:
        manufacturers_data[coil['manufacturer']].append(coil)
    
    # 各メーカーのファイルを作成
    for manufacturer, manufacturer_coils in manufacturers_data.items():
        # ファイル名を生成（小文字、スペースをアンダースコアに）
        filename = manufacturer.lower().replace(' ', '_') + '.json'
        filepath = f'public/data/{filename}'
        
        # そのメーカーの製品シリーズを抽出
        manufacturer_series = sorted(list(set(coil['product_series'] for coil in manufacturer_coils)))
        
        manufacturer_data = {
            "manufacturer": manufacturer,
            "product_series": manufacturer_series,
            "total_coils": len(manufacturer_coils),
            "coils": sorted(manufacturer_coils, key=lambda x: (x['product_series'], x['secondary_diameter'], x['length']))
        }
        
        # ファイルに保存
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(manufacturer_data, f, ensure_ascii=False, indent=2)
        
        print(f"  ✅ {filename} ({len(manufacturer_coils)}製品, {len(manufacturer_series)}シリーズ)")
    
    print(f"\n📁 メーカー別ファイル: {len(manufacturers_data)}個作成完了")

def create_reorganization_report(multi_primary_series, series_name_mapping):
    """整理の詳細レポートを作成"""
    
    report = []
    report.append("# コイル製品一次径別整理レポート\n")
    report.append("## 📋 整理概要\n")
    report.append("同一製品シリーズ名で異なる一次径（適合カテーテルサイズ）を持つ製品を分離しました。\n")
    report.append("### 🎯 目的\n")
    report.append("- 医療現場での正確な製品選択支援\n")
    report.append("- カテーテルサイズ別の明確な製品分類\n")
    report.append("- アプリケーションでの使いやすさ向上\n")
    
    report.append("\n### 📊 整理結果\n")
    report.append("| 元製品シリーズ | カテーテルサイズ | 新製品シリーズ名 |\n")
    report.append("|---------------|-----------------|------------------|\n")
    
    for series, primaries in multi_primary_series.items():
        for primary in sorted(primaries):
            catheter_code = mm_to_catheter_code(primary)
            new_name = f"{series}-{catheter_code}"
            inch_size = primary / 25.4
            report.append(f"| {series} | {primary}mm ({inch_size:.4f}\") | {new_name} |\n")
    
    report.append("\n### 🏥 医療現場での効果\n")
    report.append("- ✅ **明確な識別**: カテーテルサイズが製品名から即座に判別可能\n")
    report.append("- ✅ **誤選択防止**: 適合しないカテーテルサイズでの製品選択を回避\n")
    report.append("- ✅ **効率向上**: 手技中の製品選択時間短縮\n")
    report.append("- ✅ **安全性向上**: 適切なカテーテル-コイル組み合わせの確保\n")
    
    report.append("\n### 📝 命名規則\n")
    report.append("- **形式**: `元シリーズ名-XXX`\n")
    report.append("- **XXX**: カテーテルサイズ（インチ×1000の3桁整数）\n")
    report.append("- **例**: AZUR-013 = 0.013インチカテーテル対応\n")
    
    # レポートをファイルに保存
    with open('coil_reorganization_report.md', 'w', encoding='utf-8') as f:
        f.write(''.join(report))
    
    print(f"\n📄 詳細レポート: coil_reorganization_report.md")

if __name__ == "__main__":
    reorganize_coils_by_catheter_size() 