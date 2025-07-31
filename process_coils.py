#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Coil Data Processor for VERcalc Application
Processes the original coil list CSV and creates organized manufacturer-specific files
"""

import csv
import os
import json
from collections import defaultdict

def read_coil_data(filename):
    """Read coil data from CSV file"""
    coils = []
    with open(filename, 'r', encoding='utf-8') as f:
        # Skip BOM if present
        content = f.read()
        if content.startswith('\ufeff'):
            content = content[1:]
        
        lines = content.strip().split('\n')
        headers = lines[0].split(',')
        
        # Print headers for debugging
        print("Headers found:")
        for i, header in enumerate(headers):
            print(f"  {i}: '{header}'")
        
        for line_num, line in enumerate(lines[1:], 2):
            try:
                values = line.split(',')
                if len(values) == len(headers):
                    row_dict = dict(zip(headers, values))
                    coils.append(row_dict)
                else:
                    print(f"Warning: Line {line_num} has {len(values)} values but expected {len(headers)}")
            except Exception as e:
                print(f"Error processing line {line_num}: {e}")
                
    return coils

def clean_coil_data(coils):
    """Clean and restructure coil data"""
    cleaned_coils = []
    
    for i, coil in enumerate(coils):
        # Extract manufacturer name (first field)
        manufacturer = list(coil.values())[0] if coil else ""
        coil_name = list(coil.values())[1] if len(coil.values()) > 1 else ""
        
        # Skip empty rows
        if not manufacturer or not coil_name:
            continue
            
        # Extract product series and type from coil name
        name_parts = coil_name.split('_')
        product_series = name_parts[0] if name_parts else coil_name
        product_type = '_'.join(name_parts[1:]) if len(name_parts) > 1 else 'standard'
        
        # Get other values with safe access
        values = list(coil.values())
        
        try:
            cleaned_coil = {
                'id': i + 1,
                'manufacturer': manufacturer.strip(),
                'product_series': product_series.strip(),
                'product_type': product_type.strip(),
                'primary_diameter': float(values[5]) if len(values) > 5 and values[5] else 0.0,
                'secondary_diameter': float(values[6]) if len(values) > 6 and values[6] else 0.0,
                'length': float(values[7]) if len(values) > 7 and values[7] else 0.0,
                'volume': float(values[8]) if len(values) > 8 and values[8] else 0.0,
                'min_catheter_size': float(values[9]) if len(values) > 9 and values[9] else 0.0
            }
            cleaned_coils.append(cleaned_coil)
        except (ValueError, IndexError) as e:
            print(f"Error processing coil {i+1}: {e}")
            continue
    
    return cleaned_coils

def create_manufacturer_files(coils):
    """Create separate files for each manufacturer"""
    
    # Group by manufacturer
    by_manufacturer = defaultdict(list)
    for coil in coils:
        by_manufacturer[coil['manufacturer']].append(coil)
    
    # Create coils directory if it doesn't exist
    os.makedirs('coils', exist_ok=True)
    
    # Create manufacturer-specific files
    for manufacturer, manufacturer_coils in by_manufacturer.items():
        # Clean filename
        safe_filename = manufacturer.replace(' ', '_').replace('/', '_')
        filename = f"coils/{safe_filename.lower()}.json"
        
        # Sort by product series and secondary diameter
        manufacturer_coils.sort(key=lambda x: (x['product_series'], x['secondary_diameter']))
        
        # Create manufacturer info
        manufacturer_data = {
            'manufacturer': manufacturer,
            'total_coils': len(manufacturer_coils),
            'product_series': list(set([coil['product_series'] for coil in manufacturer_coils])),
            'coils': manufacturer_coils
        }
        
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(manufacturer_data, f, ensure_ascii=False, indent=2)
        
        print(f"Created {filename} with {len(manufacturer_coils)} coils")

def create_master_file(coils):
    """Create master coil database file"""
    
    # Create summary statistics
    manufacturers = list(set([coil['manufacturer'] for coil in coils]))
    product_series = list(set([coil['product_series'] for coil in coils]))
    
    master_data = {
        'metadata': {
            'total_coils': len(coils),
            'manufacturers': len(manufacturers),
            'product_series': len(product_series),
            'last_updated': '2024-01-01'  # You can update this
        },
        'manufacturers': manufacturers,
        'product_series': sorted(product_series),
        'coils': coils
    }
    
    with open('coils/master_coil_database.json', 'w', encoding='utf-8') as f:
        json.dump(master_data, f, ensure_ascii=False, indent=2)
    
    print(f"Created master database with {len(coils)} coils")

def main():
    """Main processing function"""
    print("Processing coil data...")
    
    # Read original data
    coils = read_coil_data('Coil list.csv')
    print(f"Read {len(coils)} coil entries")
    
    # Clean and restructure data
    cleaned_coils = clean_coil_data(coils)
    print(f"Cleaned {len(cleaned_coils)} coil entries")
    
    if not cleaned_coils:
        print("No valid coil data found. Exiting.")
        return
    
    # Show manufacturer summary
    manufacturers = defaultdict(int)
    for coil in cleaned_coils:
        manufacturers[coil['manufacturer']] += 1
    
    print("\nManufacturer Summary:")
    for i, (mfg, count) in enumerate(manufacturers.items(), 1):
        print(f"  {i}. {mfg}: {count} coils")
    
    # Create files
    create_manufacturer_files(cleaned_coils)
    create_master_file(cleaned_coils)
    
    print("\nProcessing complete!")
    print("Files created in 'coils/' directory:")
    print("- Individual manufacturer JSON files")
    print("- master_coil_database.json (complete database)")

if __name__ == "__main__":
    main() 