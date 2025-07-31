#!/usr/bin/env python3
"""
新しいCoil list_app_20250731.csvを処理してJSONデータを生成するスクリプト
Coil_Nameで分類し、AZUR系の膨潤データも含めて処理する
"""

import csv
import json
import os
from collections import defaultdict

def process_new_coil_data():
    """新しいCSVファイルを処理してJSONファイルを生成"""
    
    input_file = 'Coil list_app_20250731.csv'
    output_dir = 'coils'
    
    # 出力ディレクトリを作成
    os.makedirs(output_dir, exist_ok=True)
    
    # データを格納する辞書
    master_data = []
    manufacturer_data = defaultdict(list)
    
    print(f"Processing {input_file}...")
    
    # CSVファイルのヘッダーを正しく読み込む
    with open(input_file, 'r', encoding='utf-8') as file:
        lines = file.readlines()
    
    # ヘッダー行を統合（1行目と2行目を結合）
    header1 = lines[0].strip().split(',')
    header2 = lines[1].strip().split(',')
    
    # 正しいヘッダーを作成
    headers = []
    for i, h1 in enumerate(header1):
        if h1.strip():  # 最初の行にヘッダーがある場合
            # BOM文字を除去
            clean_header = h1.strip().replace('\ufeff', '')
            headers.append(clean_header)
        elif i < len(header2) and header2[i].strip():  # 2行目にヘッダーがある場合
            clean_header = header2[i].strip().replace('\ufeff', '')
            headers.append(clean_header)
        else:
            headers.append(f"col_{i}")  # デフォルト名
    
    print(f"Headers found: {headers}")
    
    # データ行を読み込み（3行目から）
    data_lines = lines[2:]
    
    # 手動でDictReaderのような処理を実行
    for line_num, line in enumerate(data_lines, start=3):
        if not line.strip():
            continue
            
        values = line.strip().split(',')
        
        # 値が不足している場合は空文字で埋める
        while len(values) < len(headers):
            values.append('')
        
        # 辞書を作成
        row = dict(zip(headers, values))
        
        # 数値データを処理（空の場合はNoneまたはデフォルト値）
        def safe_float(value, default=None):
            try:
                return float(value) if value.strip() else default
            except (ValueError, AttributeError):
                return default
        
        def safe_int(value, default=None):
            try:
                return int(float(value)) if value.strip() else default
            except (ValueError, AttributeError):
                return default
        
        # 基本情報を抽出
        manufacturer = row['Manufacturer_Name'].strip()
        coil_name = row['Coil_Name'].strip()
        
        # 基本データ
        primary_diameter_inch = safe_float(row['Primary_Diameter_inch'])
        primary_diameter_mm = safe_float(row['Primary_Diameter_mm'])
        secondary_diameter_mm = safe_float(row['Secondary_Diameter_mm'])
        length_cm = safe_float(row['Length_cm'])
        volume_mm3 = safe_float(row['Volume_mm^3'])
        min_catheter_lumen_inch = safe_float(row['Min_Compatible_Catheter_Lumen_inch'])
        
        # AZUR系膨潤データ
        azur_primary_diameter_inch = safe_float(row['(azur)Primary_Diameter_inch'])
        azur_primary_diameter_mm = safe_float(row['(azur)Primary_Diameter_mm'])
        azur_volume_mm3 = safe_float(row['(azur)Volume_mm^3'])
        
        # AZUR系かどうかを判定
        is_azur_series = 'AZUR' in coil_name.upper()
        
        # コイルデータオブジェクトを作成
        coil_data = {
            'manufacturer': manufacturer,
            'coil_name': coil_name,
            'primary_diameter_inch': primary_diameter_inch,
            'primary_diameter_mm': primary_diameter_mm,
            'secondary_diameter_mm': secondary_diameter_mm,
            'length_cm': length_cm,
            'volume_mm3': volume_mm3,
            'min_catheter_lumen_inch': min_catheter_lumen_inch,
            'is_azur_series': is_azur_series
        }
        
        # AZUR系の場合は膨潤データも追加
        if is_azur_series and azur_volume_mm3 is not None:
            coil_data.update({
                'azur_primary_diameter_inch': azur_primary_diameter_inch,
                'azur_primary_diameter_mm': azur_primary_diameter_mm,
                'azur_volume_mm3': azur_volume_mm3,
                'swelling_ratio': azur_volume_mm3 / volume_mm3 if volume_mm3 and volume_mm3 > 0 else None
            })
        
        # データを追加
        master_data.append(coil_data)
        manufacturer_data[manufacturer].append(coil_data)
    
    # マスターJSONファイルを作成
    master_file = os.path.join(output_dir, 'master_coil_database_new.json')
    with open(master_file, 'w', encoding='utf-8') as file:
        json.dump(master_data, file, ensure_ascii=False, indent=2)
    print(f"Created master file: {master_file} ({len(master_data)} coils)")
    
    # メーカー別JSONファイルを作成
    for manufacturer, coils in manufacturer_data.items():
        # ファイル名を安全にする
        safe_manufacturer_name = manufacturer.replace(' ', '_').replace('/', '_').lower()
        manufacturer_file = os.path.join(output_dir, f'{safe_manufacturer_name}_new.json')
        
        with open(manufacturer_file, 'w', encoding='utf-8') as file:
            json.dump(coils, file, ensure_ascii=False, indent=2)
        print(f"Created {manufacturer} file: {manufacturer_file} ({len(coils)} coils)")
    
    # Coil_Name別の集計を作成
    coil_name_data = defaultdict(list)
    for coil in master_data:
        coil_name_data[coil['coil_name']].append(coil)
    
    coil_names_file = os.path.join(output_dir, 'coil_names_summary_new.json')
    coil_names_summary = {}
    for coil_name, coils in coil_name_data.items():
        manufacturers = list(set(coil['manufacturer'] for coil in coils))
        coil_names_summary[coil_name] = {
            'manufacturers': manufacturers,
            'count': len(coils),
            'is_azur_series': coils[0]['is_azur_series'],
            'sample_coil': coils[0]  # 代表例
        }
    
    with open(coil_names_file, 'w', encoding='utf-8') as file:
        json.dump(coil_names_summary, file, ensure_ascii=False, indent=2)
    print(f"Created coil names summary: {coil_names_file} ({len(coil_names_summary)} unique coil names)")
    
    # 統計情報を表示
    print("\n=== 統計情報 ===")
    print(f"総コイル数: {len(master_data)}")
    print(f"メーカー数: {len(manufacturer_data)}")
    print(f"ユニークなCoil_Name数: {len(coil_names_summary)}")
    
    azur_count = sum(1 for coil in master_data if coil['is_azur_series'])
    print(f"AZUR系コイル数: {azur_count}")
    
    print("\n=== メーカー別コイル数 ===")
    for manufacturer, coils in sorted(manufacturer_data.items()):
        print(f"{manufacturer}: {len(coils)} coils")
    
    print("\n=== Coil_Name別（上位10件） ===")
    sorted_coil_names = sorted(coil_names_summary.items(), key=lambda x: x[1]['count'], reverse=True)
    for coil_name, info in sorted_coil_names[:10]:
        print(f"{coil_name}: {info['count']} variants, Manufacturers: {', '.join(info['manufacturers'])}")

if __name__ == "__main__":
    process_new_coil_data()